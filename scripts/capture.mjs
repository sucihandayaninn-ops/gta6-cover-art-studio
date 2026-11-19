// Actual headless Chrome page captures, with exact viewport metrics. The supplied
// Chrome 145 command-line screenshot handler reserves toolbar space and can pause
// its compositor after the virtual-time budget; CDP avoids those host bugs.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const chrome='/root/.hermes/tools/chromium-1208/chrome-linux64/chrome';
const shots=JSON.parse(readFileSync('shots.json','utf8'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
mkdirSync('.qa',{recursive:true});mkdirSync('screenshots',{recursive:true});
let server,ws;
try{await fetch('http://localhost:8080/');}catch{server=spawn('node',['serve.ts'],{stdio:'ignore'});await pause(300);}
const child=spawn(chrome,['--headless=new','--no-sandbox','--hide-scrollbars','--enable-unsafe-swiftshader','--use-angle=swiftshader','--window-size=1280,720','--remote-debugging-port=9337',`--user-data-dir=${resolve('.qa/final-profile')}`,'about:blank'],{stdio:'ignore'});
try{
  let tab;
  for(let i=0;i<150;i++){
    try{tab=(await(await fetch('http://localhost:9337/json')).json()).find(t=>t.type==='page');if(tab)break;}catch{}await pause(40);
  }
  if(!tab)throw new Error('Cannot connect to screenshot Chrome');
  ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));
  let seq=0;const pending=new Map();
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}});
  const call=(method,params={})=>new Promise((r,reject)=>{
    const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);
    pending.set(id,m=>{clearTimeout(timer);m.error?reject(new Error(JSON.stringify(m.error))):r(m.result);});ws.send(JSON.stringify({id,method,params}));
  });
  const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true})).result?.value;
  await call('Page.bringToFront');
  for(const shot of shots){
    await evaluate('window.__shotReady=false');
    await call('Emulation.setDeviceMetricsOverride',{width:shot.w,height:shot.h,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:`http://localhost:8080/${shot.query}`});await pause(100);
    let ready=false;
    for(let i=0;i<100;i++){try{ready=await evaluate('window.__shotReady===true');if(ready)break;}catch{}await pause(80);}
    if(!ready)throw new Error(`The cover did not paint: ${shot.name}`);
    await pause(100);
    const png=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    const file=resolve('.qa',shot.name.replace(/\.jpg$/,'.png'));writeFileSync(file,Buffer.from(png.data,'base64'));console.log(`Captured ${shot.name}: ${shot.w} × ${shot.h}`);
  }
}finally{ws?.close();child.kill();server?.kill();}
const encoder=spawn('python3',['-c',`from PIL import Image
from pathlib import Path
for source in sorted(Path('.qa').glob('[1-4]-*.png')):
    im=Image.open(source).convert('RGB')
    target=Path('screenshots')/(source.stem+'.jpg')
    for quality in [93,90,87,84,80,76,72]:
        im.save(target,quality=quality,optimize=True,subsampling=0)
        if target.stat().st_size < 262144: break
    assert target.stat().st_size < 262144, target
    print(f'{target}: {im.width}x{im.height}, {target.stat().st_size:,} bytes, quality {quality}')
`],{stdio:'inherit'});
if(await new Promise(r=>encoder.on('exit',r)))throw new Error('Screenshot encoding failed');
