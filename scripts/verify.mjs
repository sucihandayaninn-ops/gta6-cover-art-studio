// Browser-level checks for local uploads, independent crops, grades and real PNGs.
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,readdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const assert=(ok,message)=>{if(!ok)throw new Error(message);console.log(`PASS ${message}`);};
mkdirSync('.qa/downloads',{recursive:true});
let server;
try{await fetch('http://localhost:8080/');}catch{server=spawn('node',['serve.ts'],{stdio:'ignore'});await pause(300);}
const child=spawn('/root/.hermes/tools/chromium-1208/chrome-linux64/chrome',['--headless=new','--no-sandbox','--hide-scrollbars','--enable-unsafe-swiftshader','--use-angle=swiftshader','--remote-debugging-port=9444',`--user-data-dir=${resolve('.qa/verify-profile')}`,'about:blank'],{stdio:'ignore'});
let ws;
try{
  let tab;
  for(let i=0;i<100;i++){try{tab=(await(await fetch('http://localhost:9444/json')).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(50);}
  if(!tab)throw new Error('Browser failed to start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
  let seq=0;const pending=new Map(),requests=[],errors=[];
  ws.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
  });
  const call=(method,params={})=>new Promise((r,reject)=>{
    const id=++seq,t=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${method}`));},30000);
    pending.set(id,m=>{clearTimeout(t);m.error?reject(new Error(JSON.stringify(m.error))):r(m.result);});ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>{
    const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result?.value;
  };
  const nav=async query=>{
    await evaluate('window.__shotReady=false');
    await call('Page.navigate',{url:`http://localhost:8080/${query}`});await pause(100);
    for(let i=0;i<150;i++){try{if(await evaluate('window.__shotReady===true'))return;}catch{}await pause(100);}
    throw new Error('App never became ready: '+await evaluate('document.body.innerText')+' '+JSON.stringify(errors));
  };
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const thumbs=()=>evaluate('[...document.querySelectorAll(".panel-button canvas")].map(c=>c.toDataURL())');
  const data=()=>evaluate('document.querySelector("#cover").toDataURL()');
  await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await call('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:resolve('.qa/downloads')});
  await nav('?shot=editor&photo=boulevard&caption=Sunset%20Syndicate');
  assert(await evaluate('document.body.scrollHeight<=720'),'1280 × 720 editor fits without vertical overflow');
  assert(await evaluate('document.querySelectorAll(".panel-button").length===7'),'seven independently editable panels');
  const initial=await data();
  await nav('?shot=editor&photo=boulevard&caption=Sunset%20Syndicate');
  const repeated=await data();writeFileSync('.qa/determinism-a.png',Buffer.from(initial.split(',')[1],'base64'));writeFileSync('.qa/determinism-b.png',Buffer.from(repeated.split(',')[1],'base64'));
  const delta=spawnSync('python3',['-c',"from PIL import Image,ImageChops; d=ImageChops.difference(Image.open('.qa/determinism-a.png').convert('RGB'),Image.open('.qa/determinism-b.png').convert('RGB')); print(max(v[1] for v in d.getextrema()))"],{encoding:'utf8'});
  assert(delta.status===0&&Number(delta.stdout)<=1,'query rendering repeats within one antialiasing level');
  await evaluate('document.querySelector("#caption").value="Neon Test";document.querySelector("#caption").dispatchEvent(new Event("input"))');await pause(100);
  assert(initial!==await data(),'caption updates the painted cover live');
  const before=await thumbs();await click('.panel-button:nth-child(1)');await click('[data-asset="pier"]');await pause(100);const after=await thumbs();
  assert(after[0]!==before[0]&&after.slice(1).every((v,i)=>v===before[i+1]),'photo assignment changes only the selected panel');
  await evaluate('document.querySelector("#zoom").value="2";document.querySelector("#zoom").dispatchEvent(new Event("input"))');await pause(100);const zoomed=await data();
  const rect=await evaluate('document.querySelector("#cover").getBoundingClientRect().toJSON()');
  const x=rect.x+rect.width*.15,y=rect.y+rect.height*.16;
  await call('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+40,y:y+30,button:'left',buttons:1});
  await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+40,y:y+30,button:'left',clickCount:1});await pause(100);
  assert(zoomed!==await data(),'dragging repositions the selected crop');
  await click('#fill-all');await pause(100);const filled=await thumbs();assert(filled.every(v=>v===filled[0]),'one local photo can fill every panel');
  await click('.grade-button[data-grade="night"]');await pause(100);assert(await evaluate('document.querySelector("[data-grade=night]").getAttribute("aria-pressed")==="true"'),'color preset selection is active');
  const root=await call('DOM.getDocument'),input=await call('DOM.querySelector',{nodeId:root.root.nodeId,selector:'#photo'});
  await call('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[resolve('app/samples/boulevard.jpg')]});
  for(let i=0;i<80;i++){if(await evaluate('document.querySelectorAll("#photo-library .asset").length===3'))break;await pause(100);}
  assert(await evaluate('document.querySelectorAll("#photo-library .asset").length===3'),'file input reads and inks a local image');
  await evaluate('document.querySelector("#caption").value="Neon Test";document.querySelector("#caption").dispatchEvent(new Event("input"))');
  for(const [format,w,h] of [['square',1080,1080],['portrait',1080,1350],['wide',1920,1080]]){
    await click(`[data-format="${format}"]`);await pause(100);
    assert(await evaluate(`document.querySelector('#cover').width===${w}&&document.querySelector('#cover').height===${h}`),`${format} preview uses correct dimensions`);
    await click(`[data-export="${format}"]`);const path=resolve('.qa/downloads',`neon-test-${w}x${h}.png`);
    for(let i=0;i<100;i++){if(existsSync(path))break;await pause(100);}
    assert(existsSync(path),`${format} export downloads in one click`);
    const bytes=readFileSync(path);assert(bytes.subarray(1,4).toString()==='PNG'&&bytes.readUInt32BE(16)===w&&bytes.readUInt32BE(20)===h,`${format} download is an actual ${w} × ${h} PNG`);
  }
  await nav('?shot=cover&photo=boulevard&caption=Midnight%20Run&grade=night&format=wide');
  await call('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});await pause(100);
  const wide=await call('Page.captureScreenshot',{format:'png'});writeFileSync('.qa/wide-preview.png',Buffer.from(wide.data,'base64'));
  assert(await evaluate('document.body.classList.contains("shot-cover")&&getComputedStyle(document.querySelector(".topbar")).display==="none"'),'full-bleed cover mode hides editor chrome');
  assert(errors.length===0,`no browser JavaScript errors (${errors.length})`);
  assert(requests.every(url=>url.startsWith('http://localhost:8080/')||url.startsWith('data:')||url.startsWith('blob:')),'app makes no external network requests');
  console.log('All browser checks passed.');
}finally{ws?.close();child.kill();server?.kill();}
