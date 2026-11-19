import { seededRandom } from './scenes.js';

export const FORMATS = {square:[1080,1080],portrait:[1080,1350],wide:[1920,1080]};
export const PANEL_NAMES = ['Ocean Drive','The Getaway','The Lead','Air Patrol','The Detail','Coast Runner','After Hours'];
export const GRADES = {
  vice:{name:'Vice',label:'Vice sunset',colors:['#b847b4','#ffc48b','#ec5f9f'],css:'linear-gradient(130deg,#7353a3,#f275a6 52%,#ffd59b)',sky:'#f67ab1',shade:'#381c53',accent:'#7ae0d0'},
  heat:{name:'Heatwave',label:'Heatwave',colors:['#b65e7f','#ffd175','#e54b58'],css:'linear-gradient(130deg,#b44d6a,#ff9364 52%,#ffdc8b)',sky:'#ffbe6a',shade:'#5e2141',accent:'#ffd791'},
  night:{name:'After hours',label:'After hours',colors:['#6650b5','#c789cc','#297da0'],css:'linear-gradient(130deg,#343b94,#aa62b9 52%,#5bcee2)',sky:'#a06de3',shade:'#151f50',accent:'#7de6ed'},
  coast:{name:'Ocean',label:'Ocean neon',colors:['#388f9f','#ffe2b2','#d57d9e'],css:'linear-gradient(130deg,#1e8797,#7fdacb 52%,#ffc89e)',sky:'#7fe1d6',shade:'#173d55',accent:'#a5f1d3'},
};

/** Seven independent polygon frames; the lead always keeps a portrait-shaped crop. */
export function coverPanels(w,h) {
  const wide=w/h>1.4;
  const points=wide?[
    [[0,0],[.32,0],[.33,.49],[0,.52]],
    [[0,.52],[.33,.49],[.35,1],[0,1]],
    [[.32,0],[.72,0],[.70,1],[.35,1],[.33,.49]],
    [[.72,0],[1,0],[1,.47],[.71,.49]],
    [[.71,.49],[1,.47],[1,1],[.70,1]],
    [[0,.80],[.35,.79],[.35,1],[0,1]],
    [[.70,.78],[1,.77],[1,1],[.70,1]],
  ]:[
    [[0,0],[.315,0],[.298,.326],[0,.343]],
    [[0,.343],[.298,.326],[.325,.745],[0,.765]],
    [[.315,0],[.76,0],[.765,.733],[.325,.745],[.298,.326]],
    [[.76,0],[1,0],[1,.354],[.762,.367]],
    [[.762,.367],[1,.354],[1,.747],[.765,.733]],
    [[0,.765],[.325,.745],[.582,.736],[.561,1],[0,1]],
    [[.582,.736],[1,.747],[1,1],[.561,1]],
  ];
  return points.map((poly,index)=>{
    const vertices=poly.map(([x,y])=>[x*w,y*h]);
    const xs=vertices.map(p=>p[0]),ys=vertices.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys);
    const path=new Path2D();vertices.forEach(([xx,yy],i)=>i?path.lineTo(xx,yy):path.moveTo(xx,yy));path.closePath();
    return {index,vertices,path,x,y,w:Math.max(...xs)-x,h:Math.max(...ys)-y};
  });
}
export function newComposition(photo='boulevard') {
  return [
    {asset:'coast',x:.5,y:.35,zoom:1},
    {asset:'gt',x:.50,y:.61,zoom:1},
    {asset:photo,x:photo==='pier'?.46:.51,y:.3,zoom:1.02},
    {asset:'air',x:.48,y:.45,zoom:1},
    {asset:photo,x:photo==='pier'?.94:.11,y:photo==='pier'?.97:.95,zoom:1.75},
    {asset:'boat',x:.53,y:.62,zoom:1},
    {asset:'coast',x:.82,y:.52,zoom:1.20},
  ];
}
export function cropGeometry(image, panel, bounds) {
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const scale=Math.max(bounds.w/iw,bounds.h/ih)*panel.zoom;
  const w=iw*scale,h=ih*scale;
  return {x:bounds.x+(bounds.w-w)*panel.x,y:bounds.y+(bounds.h-h)*panel.y,w,h,overflowX:w-bounds.w,overflowY:h-bounds.h};
}
export function drawPhotoCrop(c, image, panel, bounds) {
  const box=cropGeometry(image,panel,bounds);c.drawImage(image,box.x,box.y,box.w,box.h);return box;
}
function tintPanel(c,bounds,preset,scene,index) {
  const g=c.createLinearGradient(bounds.x,bounds.y,bounds.x+bounds.w*.35,bounds.y+bounds.h);
  g.addColorStop(0,preset.colors[0]);g.addColorStop(.50,preset.colors[1]);g.addColorStop(1,preset.colors[2]);
  c.globalCompositeOperation='soft-light';c.globalAlpha=scene?.36:.62;c.fillStyle=g;c.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
  c.globalCompositeOperation='color';c.globalAlpha=scene?.07:.13;c.fillStyle=preset.sky;c.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
  c.globalCompositeOperation='multiply';c.globalAlpha=scene?.12:.16;
  const shade=c.createLinearGradient(0,bounds.y,0,bounds.y+bounds.h);shade.addColorStop(0,'#fff7e8');shade.addColorStop(.6,'#fff7e8');shade.addColorStop(1,preset.shade);c.fillStyle=shade;c.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);
  c.globalAlpha=1;c.globalCompositeOperation='source-over';
  if(index===2) {
    const glow=c.createLinearGradient(bounds.x,0,bounds.x+bounds.w*.5,0);glow.addColorStop(0,'#ffb67c46');glow.addColorStop(1,'#ff7b9a00');
    c.globalCompositeOperation='screen';c.fillStyle=glow;c.fillRect(bounds.x,bounds.y,bounds.w,bounds.h);c.globalCompositeOperation='source-over';
  }
}
let printTexture;
function getPrintTexture() {
  if(printTexture)return printTexture;
  printTexture=document.createElement('canvas');printTexture.width=256;printTexture.height=256;
  const c=printTexture.getContext('2d'),data=c.createImageData(256,256),rand=seededRandom(62025);
  for(let i=0;i<data.data.length;i+=4) {const value=rand()>.5?255:0;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=Math.floor(rand()*15);}
  c.putImageData(data,0,0);return printTexture;
}
function trackedText(c,text,x,y,size,spacing=2,color='#fff0d4') {
  c.save();c.font=`600 ${size}px sans-serif`;c.fillStyle=color;
  for(const letter of text){c.fillText(letter,x,y);x+=c.measureText(letter).width+spacing;}c.restore();
}
/** Original heavy italic display lettering with ink outline and a coral extrusion. */
function drawBlockLettering(c,text,x,baseline,size,maxWidth) {
  c.save();c.translate(x,baseline);c.transform(1,-.035,-.12,1,0,0);
  c.font=`${size}px Anton`;
  const width=c.measureText(text).width;
  if(width>maxWidth)c.scale(maxWidth/width,1);
  c.lineJoin='round';c.miterLimit=2;c.textBaseline='alphabetic';
  c.strokeStyle='#151525';c.lineWidth=size*.145;c.strokeText(text,7,11);
  c.fillStyle='#e45c95';c.fillText(text,7,11);
  c.strokeStyle='#171422';c.lineWidth=size*.12;c.strokeText(text,0,0);
  const g=c.createLinearGradient(0,-size,0,10);g.addColorStop(0,'#fffde6');g.addColorStop(.6,'#fff2d8');g.addColorStop(1,'#edc7bb');
  c.fillStyle=g;c.fillText(text,0,0);
  c.strokeStyle='#fffce536';c.lineWidth=1;c.strokeText(text,0,-1);
  c.restore();
}
export function splitCaption(caption) {
  const text=caption.trim().toUpperCase().replace(/\s+/g,' ');
  if(!text)return [];
  const words=text.split(' ');
  if(words.length===1)return [text];
  let best=1,delta=Infinity;
  for(let i=1;i<words.length;i++){
    const a=words.slice(0,i).join(' '),b=words.slice(i).join(' ');
    const d=Math.abs(a.length-b.length)+(a.length>b.length?1:0);if(d<delta){delta=d;best=i;}
  }
  return [words.slice(0,best).join(' '),words.slice(best).join(' ')];
}
function chapterMark(c,x,y,width,accent) {
  c.save();c.translate(x,y);c.scale(width/200,width/200);
  c.save();c.globalAlpha=.55;c.strokeStyle=accent;c.lineWidth=2;c.beginPath();c.arc(95,82,99,0,Math.PI*2);c.stroke();c.restore();
  trackedText(c,'CHAPTER',29,-12,12,4,'#ffe3ce');
  const v=new Path2D('M1 0H39L78 119 115 0H151L97 160H57Z');
  const i=new Path2D('M153 0H198V22H189V138H198V160H153V138H162V22H153Z');
  c.lineJoin='round';c.lineWidth=18;c.strokeStyle='#171424';c.stroke(v);c.stroke(i);
  c.save();c.translate(4,7);c.fillStyle=accent;c.fill(v);c.fill(i);c.restore();
  const g=c.createLinearGradient(0,0,0,160);g.addColorStop(0,'#ffe3bf');g.addColorStop(.48,'#ffb0bc');g.addColorStop(1,'#db528c');
  c.fillStyle=g;c.fill(v);c.fill(i);c.lineWidth=2;c.strokeStyle='#ffe2ca';c.stroke(v);c.stroke(i);
  c.save();const both=new Path2D(v);both.addPath(i);c.clip(both);c.strokeStyle='#813c7070';c.lineWidth=3;
  for(let yy=72;yy<160;yy+=13){c.beginPath();c.moveTo(0,yy);c.lineTo(205,yy);c.stroke();}c.restore();
  trackedText(c,'NO LIMITS',24,190,10,4,'#ffdabd');c.restore();
}

/** One renderer for preview, all PNG sizes, and deterministic full-bleed screenshots. */
export function drawCover(canvas,state,assets,options={}) {
  const c=canvas.getContext('2d'),w=1080,h=canvas.height/canvas.width*w;
  c.save();c.setTransform(canvas.width/w,0,0,canvas.width/w,0,0);
  c.fillStyle='#171424';c.fillRect(0,0,w,h);
  const preset=GRADES[state.grade]||GRADES.vice,panels=coverPanels(w,h);
  panels.forEach((bounds,index)=>{
    const panel=state.panels[index],asset=assets.get(panel.asset);if(!asset)return;
    c.save();c.clip(bounds.path);drawPhotoCrop(c,asset.art,panel,bounds);tintPanel(c,bounds,preset,asset.scene,index);c.restore();
  });
  // Print-black comic gutters with a warm hairline register.
  panels.forEach(bounds=>{c.strokeStyle='#171424';c.lineWidth=13;c.lineJoin='round';c.stroke(bounds.path);c.strokeStyle='#ffd1b54d';c.lineWidth=1.3;c.stroke(bounds.path);});
  const vignette=c.createRadialGradient(w*.5,h*.36,w*.16,w*.5,h*.5,Math.max(w,h)*.71);
  vignette.addColorStop(0,'#15132600');vignette.addColorStop(.63,'#19132508');vignette.addColorStop(1,'#17142788');c.fillStyle=vignette;c.fillRect(0,0,w,h);
  // A smoky title bed follows the lettering, keeping the actual face clear.
  const bed=c.createLinearGradient(0,h*.55,0,h);bed.addColorStop(0,'#20152800');bed.addColorStop(.55,'#21182d7a');bed.addColorStop(1,'#1616299c');
  c.fillStyle=bed;c.fillRect(0,h*.55,w,h*.45);
  c.save();c.globalCompositeOperation='soft-light';c.fillStyle=c.createPattern(getPrintTexture(),'repeat');c.fillRect(0,0,w,h);c.restore();
  c.fillStyle='#16142366';c.fillRect(10,10,w-20,38);
  trackedText(c,'THE OTHER SIDE OF PARADISE',31,35,11,3.2);
  c.textAlign='right';c.font='600 10px sans-serif';c.fillStyle='#ffe6d3';c.fillText('SOUTH COAST  /  VOL. 06',w-30,34);c.textAlign='left';
  const lines=splitCaption(state.caption),wide=w/h>1.4;
  if(lines.length){
    const size=Math.min(h*(wide?.198:.153),172),maxWidth=w*(wide?.67:.76);
    const bottom=h*(wide?.88:.885),gap=size*.99;
    if(lines.length===1)drawBlockLettering(c,lines[0],w*.06,bottom,size*1.1,maxWidth);
    else{
      drawBlockLettering(c,lines[0],w*.071,bottom-gap,size,maxWidth*.94);
      drawBlockLettering(c,lines[1],w*.052,bottom,size,maxWidth);
    }
    trackedText(c,'GOOD PEOPLE. BAD DECISIONS.',w*.063,h*.935,Math.min(12,h*.018),3.1,'#ffe6cc');
  }
  chapterMark(c,w*.813,h*(wide?.625:.758),w*.146,preset.accent);
  c.fillStyle='#171424';c.fillRect(0,h-38,w,38);
  trackedText(c,'AN ORIGINAL CRIME STORY',30,h-16,9,2.5,'#c9aea9');
  c.textAlign='right';c.font='500 9px sans-serif';c.fillStyle='#c9aea9';c.fillText('25° 46′ N   /   80° 11′ W      ✦      EST. 2026',w-30,h-16);c.textAlign='left';
  c.strokeStyle='#171424';c.lineWidth=17;c.strokeRect(0,0,w,h);c.strokeStyle='#ffd9b8';c.lineWidth=2;c.strokeRect(8,8,w-16,h-16);
  if(options.highlight!=null){const b=panels[options.highlight];c.strokeStyle='#c1ffe5';c.lineWidth=3;c.setLineDash([10,8]);c.stroke(b.path);c.setLineDash([]);}
  c.restore();
}
