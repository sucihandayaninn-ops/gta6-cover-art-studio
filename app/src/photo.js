// Small edge-preserving paint filter: softened detail, stepped pigments and ink contours.
// Runs once per local photo, rather than on every drag or export.
export function loadImage(url) {
  return new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('This photo could not be opened. Try a JPEG, PNG or WebP.'));image.src=url;
  });
}
export function inkPhoto(image) {
  const canvas=document.createElement('canvas');
  const ratio=Math.min(1,1100/Math.max(image.naturalWidth||image.width,image.naturalHeight||image.height));
  canvas.width=Math.max(1,Math.round((image.naturalWidth||image.width)*ratio));canvas.height=Math.max(1,Math.round((image.naturalHeight||image.height)*ratio));
  const c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(image,0,0,canvas.width,canvas.height);
  const frame=c.getImageData(0,0,canvas.width,canvas.height),src=new Uint8ClampedArray(frame.data),out=frame.data;
  const w=canvas.width,h=canvas.height,weights=new Float32Array(766);
  for(let i=0;i<weights.length;i++)weights[i]=Math.exp(-i*i/4800);
  const luminance=new Float32Array(w*h);
  for(let i=0,p=0;i<src.length;i+=4,p++)luminance[p]=src[i]*.299+src[i+1]*.587+src[i+2]*.114;
  for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){
    const p=y*w+x,i=p*4;let r=0,g=0,b=0,total=0;
    for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++){
      const j=((y+yy)*w+x+xx)*4;
      const diff=Math.abs(src[i]-src[j])+Math.abs(src[i+1]-src[j+1])+Math.abs(src[i+2]-src[j+2]);
      const weight=weights[diff]*(xx*xx+yy*yy<3?1:.45);r+=src[j]*weight;g+=src[j+1]*weight;b+=src[j+2]*weight;total+=weight;
    }
    r/=total;g/=total;b/=total;
    const l=r*.299+g*.587+b*.114;
    const gx=luminance[p+1]-luminance[p-1],gy=luminance[p+w]-luminance[p-w];
    const edge=Math.min(.48,Math.max(0,Math.sqrt(gx*gx+gy*gy)-13)*.0065);
    const shadow=Math.max(0,(118-l)/118);
    for(let k=0;k<3;k++){
      let channel=[r,g,b][k];channel=l+(channel-l)*1.25;channel=(channel-128)*1.14+128;
      channel=Math.round(channel/8)*8;
      channel=channel*(1-edge)+(k===2?14:k===0?6:-4)*shadow;
      out[i+k]=Math.max(0,Math.min(255,channel));
    }
  }
  c.putImageData(frame,0,0);return canvas;
}
export async function makePhoto(id,name,url) {
  const image=await loadImage(url);
  return {id,name,image,art:inkPhoto(image),scene:false};
}
