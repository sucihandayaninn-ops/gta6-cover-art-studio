// Screenshot URLs use the exact same renderer and scene as a downloaded cover.
export async function runShot(shot,query,load) {
  if(shot==='cover')document.body.classList.add('shot-cover');
  const photo=query.get('photo')==='pier'?'pier':'boulevard';
  const caption=(query.get('caption')||'Sunset Syndicate').slice(0,48);
  await load(photo,caption,query.get('grade')||'vice',query.get('format'));
  await document.fonts.ready;
  // Canvas pixels were painted synchronously by load(); a task boundary also
  // works in a background tab, where animation frames can be suspended.
  await new Promise(resolve=>setTimeout(resolve,0));
  window.__shotReady=true;
}
