import { drawCover,FORMATS,GRADES,PANEL_NAMES,coverPanels,newComposition,cropGeometry,drawPhotoCrop } from './cover.js';
import { createSceneLibrary } from './scenes.js';
import { makePhoto } from './photo.js';
import { runShot } from './shots.js';

const $=selector=>document.querySelector(selector);
const canvas=$('#cover'),caption=$('#caption'),status=$('#status');
const assets=new Map();
const state={caption:'Sunset Syndicate',grade:'vice',format:'square',panels:newComposition(),selected:2};
let selectedAsset='boulevard',basePhoto='boulevard',queued=false,drag=null,highlight=false;
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));

function announce(message){status.textContent=message;}
function paint(){drawCover(canvas,state,assets,{highlight:highlight?state.selected:null});}
function redraw(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint();});}
function updateInspector(){
  const panel=state.panels[state.selected];
  $('#active-panel-name').textContent=`${String(state.selected+1).padStart(2,'0')} · ${PANEL_NAMES[state.selected].toUpperCase()}`;
  $('#zoom').value=panel.zoom;$('#zoom-value').value=`${Math.round(panel.zoom*100)}%`;
  document.querySelectorAll('.panel-button').forEach((button,i)=>button.setAttribute('aria-pressed',i===state.selected));
  document.querySelectorAll('.asset').forEach(button=>button.classList.toggle('selected',button.dataset.asset===selectedAsset));
  $('#caption-count').textContent=`${caption.value.length} / 48`;
}
function selectPanel(index){
  state.selected=index;selectedAsset=state.panels[index].asset;updateInspector();
}
function updatePanelThumbnails(indices=null){
  document.querySelectorAll('.panel-button').forEach((button,i)=>{
    if(indices&&!indices.includes(i))return;
    const thumb=button.querySelector('canvas'),c=thumb.getContext('2d'),p=state.panels[i],asset=assets.get(p.asset);
    c.clearRect(0,0,thumb.width,thumb.height);
    if(asset)drawPhotoCrop(c,asset.art,p,{x:0,y:0,w:thumb.width,h:thumb.height});
  });
}
function assignPhoto(id){
  selectedAsset=id;state.panels[state.selected]={asset:id,x:.5,y:.5,zoom:1};
  updateInspector();updatePanelThumbnails([state.selected]);redraw();
  announce(`${assets.get(id).name} → frame ${state.selected+1}. Drag the photo to frame it.`);
}
function makeAssetButton(asset){
  const button=document.createElement('button');button.type='button';button.className='asset';button.dataset.asset=asset.id;button.title=`Assign ${asset.name} to the selected panel`;button.setAttribute('aria-label',`Use ${asset.name} in the selected panel`);
  const thumb=document.createElement('canvas');thumb.width=240;thumb.height=asset.scene?130:180;
  drawPhotoCrop(thumb.getContext('2d'),asset.art,{x:.5,y:asset.scene?.5:.2,zoom:1},{x:0,y:0,w:thumb.width,h:thumb.height});
  const name=document.createElement('span');name.className='asset-name';name.textContent=asset.name;button.append(thumb,name);button.addEventListener('click',()=>assignPhoto(asset.id));
  $(asset.scene?'#scene-library':'#photo-library').append(button);
}
function buildControls(){
  for(const asset of assets.values())makeAssetButton(asset);
  PANEL_NAMES.forEach((name,i)=>{
    const button=document.createElement('button');button.type='button';button.className='panel-button';button.title=`${i+1} · ${name}`;button.setAttribute('aria-label',`Select frame ${i+1}: ${name}`);
    const thumb=document.createElement('canvas');thumb.width=100;thumb.height=100;
    const number=document.createElement('span');number.textContent=String(i+1).padStart(2,'0');button.append(thumb,number);button.addEventListener('click',()=>selectPanel(i));$('#panel-strip').append(button);
  });
  for(const [id,grade] of Object.entries(GRADES)){
    const button=document.createElement('button');button.type='button';button.className='grade-button';button.dataset.grade=id;button.setAttribute('aria-label',grade.label);button.setAttribute('aria-pressed',state.grade===id);button.style.setProperty('--gradient',grade.css);
    const swatch=document.createElement('span');swatch.className='grade-swatch';button.append(swatch,document.createTextNode(grade.name));
    button.addEventListener('click',()=>{state.grade=id;document.querySelectorAll('.grade-button').forEach(b=>b.setAttribute('aria-pressed',b===button));redraw();announce(`${grade.label} color story applied.`);});$('#grade-presets').append(button);
  }
  updatePanelThumbnails();updateInspector();
}
function setFormat(format){
  if(!FORMATS[format])format='square';state.format=format;
  [canvas.width,canvas.height]=FORMATS[format];
  $('#preview-size').textContent=FORMATS[format].join(' × ');
  document.querySelectorAll('[data-format]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.format===format));paint();
}
function resetComposition(){
  state.panels=newComposition(basePhoto);state.selected=2;selectedAsset=basePhoto;state.grade='vice';state.caption=caption.value;
  document.querySelectorAll('.grade-button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.grade==='vice'));
  updateInspector();updatePanelThumbnails();redraw();announce('Fresh cut. Your original composition is back.');
}
async function addPhotos(files){
  const list=Array.from(files).filter(file=>file.type.startsWith('image/'));
  if(!list.length){announce('Choose an image file — JPEG, PNG, WebP or another browser-supported format.');return;}
  announce('Mixing your photo into the story…');
  let count=0;
  for(const file of list.slice(0,20)){
    const url=URL.createObjectURL(file);
    try{
      // Yield once so the loading state is visible before local image processing.
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const id=`local-${Date.now()}-${count}`,asset=await makePhoto(id,file.name.replace(/\.[^.]+$/,''),url);
      assets.set(id,asset);makeAssetButton(asset);if(count===0)assignPhoto(id);count++;
    }catch(error){announce(error.message);}finally{URL.revokeObjectURL(url);}
  }
  if(count)announce(`${count} photo${count===1?'':'s'} added. Pick any frame, then a photo to cast it.`);
  $('#photo').value='';
}
/** Single-click PNG export; the native export canvas never contains editor guides. */
async function exportCover(format){
  const [w,h]=FORMATS[format],output=document.createElement('canvas');output.width=w;output.height=h;
  announce(`Rendering your ${w} × ${h} cover…`);
  try{
    await document.fonts.ready;drawCover(output,state,assets);
    const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('PNG could not be created. Please try again.');
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${state.caption.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'viceframe'}-${w}x${h}.png`;
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
    announce(`Saved ${w} × ${h} PNG. Your story is ready for the streets.`);
  }catch(error){announce(error.message);}
}
function pointerLocation(event){const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)/r.width*1080,y:(event.clientY-r.top)/r.height*(canvas.height/canvas.width*1080)};}
function zoomActive(value){state.panels[state.selected].zoom=clamp(Number(value),1,3.2);updateInspector();updatePanelThumbnails([state.selected]);redraw();}
function wireEditor(){
  caption.addEventListener('input',()=>{state.caption=caption.value;updateInspector();redraw();});
  $('#photo').addEventListener('change',e=>addPhotos(e.target.files));
  $('#dropzone').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#photo').click();}});
  for(const target of [$('#dropzone'),$('#canvas-stage')]){
    target.addEventListener('dragover',e=>{e.preventDefault();$('#dropzone').classList.add('dragging');});
    target.addEventListener('dragleave',()=>$('#dropzone').classList.remove('dragging'));
    target.addEventListener('drop',e=>{e.preventDefault();$('#dropzone').classList.remove('dragging');addPhotos(e.dataTransfer.files);});
  }
  $('#fill-all').addEventListener('click',()=>{
    state.panels=state.panels.map(()=>({asset:selectedAsset,x:.5,y:.5,zoom:1}));updatePanelThumbnails();updateInspector();redraw();announce('One photo. Seven angles. Drag each frame to find its story.');
  });
  $('#zoom').addEventListener('input',e=>zoomActive(e.target.value));
  $('#reset-crop').addEventListener('click',()=>{Object.assign(state.panels[state.selected],{x:.5,y:.5,zoom:1});updateInspector();updatePanelThumbnails([state.selected]);redraw();});
  $('#reset-all').addEventListener('click',resetComposition);
  document.querySelectorAll('[data-format]').forEach(b=>b.addEventListener('click',()=>setFormat(b.dataset.format)));
  document.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>exportCover(b.dataset.export)));
  canvas.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;e.preventDefault();const pos=pointerLocation(e),context=canvas.getContext('2d');
    const panels=coverPanels(1080,canvas.height/canvas.width*1080);
    const index=panels.findLastIndex(b=>context.isPointInPath(b.path,pos.x,pos.y));if(index<0)return;
    selectPanel(index);drag={...pos,id:e.pointerId};highlight=true;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);redraw();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;const pos=pointerLocation(e),panel=state.panels[state.selected],asset=assets.get(panel.asset),b=coverPanels(1080,canvas.height/canvas.width*1080)[state.selected];
    const box=cropGeometry(asset.art,panel,b);
    if(box.overflowX>0.1)panel.x=clamp(panel.x-(pos.x-drag.x)/box.overflowX);
    if(box.overflowY>0.1)panel.y=clamp(panel.y-(pos.y-drag.y)/box.overflowY);
    drag={...pos,id:e.pointerId};redraw();
  });
  const endDrag=()=>{if(!drag)return;drag=null;highlight=false;canvas.classList.remove('dragging');updatePanelThumbnails([state.selected]);redraw();};
  canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);canvas.addEventListener('lostpointercapture',endDrag);
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoomActive(state.panels[state.selected].zoom-e.deltaY*.0015);},{passive:false});
  canvas.addEventListener('keydown',e=>{
    const p=state.panels[state.selected],step=e.shiftKey?.08:.02;
    if(e.key==='ArrowLeft')p.x=clamp(p.x+step);else if(e.key==='ArrowRight')p.x=clamp(p.x-step);else if(e.key==='ArrowUp')p.y=clamp(p.y+step);else if(e.key==='ArrowDown')p.y=clamp(p.y-step);else if(e.key==='+'||e.key==='=')zoomActive(p.zoom+.1);else if(e.key==='-')zoomActive(p.zoom-.1);else return;
    e.preventDefault();updatePanelThumbnails([state.selected]);redraw();
  });
}
async function startStudio(){
  try{
    await document.fonts.load('100px Anton');
    const photos=await Promise.all([makePhoto('boulevard','Boulevard Queen','./samples/boulevard.jpg'),makePhoto('pier','Pier Pressure','./samples/pier.jpg')]);
    [...photos,...createSceneLibrary()].forEach(asset=>assets.set(asset.id,asset));buildControls();wireEditor();
    const query=new URLSearchParams(location.search),shot=query.get('shot');
    if(shot){
      await runShot(shot,query,async(photo,text,grade,format)=>{
        basePhoto=photo;state.panels=newComposition(photo);state.caption=text;caption.value=text;state.grade=GRADES[grade]?grade:'vice';selectedAsset=photo;
        let chosen=FORMATS[format]?format:'square';
        if(shot==='cover'&&!format){const ratio=innerWidth/innerHeight;chosen=ratio>1.4?'wide':ratio<.9?'portrait':'square';}
        document.querySelectorAll('.grade-button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.grade===state.grade));
        updateInspector();updatePanelThumbnails();setFormat(chosen);
      });
    }else{setFormat('square');window.__shotReady=true;}
  }catch(error){announce(error.message);console.error(error);}
}
startStudio();
