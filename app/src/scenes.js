// Original vector-painted story scenes, drawn locally. No stock or game artwork.
const INK = '#19152b';
export function seededRandom(seed = 617) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}
function path(c, d, fill, stroke = INK, width = 4) {
  const p = new Path2D(d);
  if (fill) { c.fillStyle = fill; c.fill(p); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(p); }
}
function linear(c, x, y, xx, yy, stops) {
  const g = c.createLinearGradient(x, y, xx, yy);
  stops.forEach(([p, col]) => g.addColorStop(p, col)); return g;
}
function sky(c, colors, sunX = 650, sunY = 350, radius = 210) {
  c.fillStyle = linear(c, 0, 0, 0, 1000, [[0, colors[0]], [.53, colors[1]], [1, colors[2]]]);
  c.fillRect(0, 0, 1000, 1000);
  const glow = c.createRadialGradient(sunX, sunY, radius * .1, sunX, sunY, radius * 1.9);
  glow.addColorStop(0, '#fff5b780'); glow.addColorStop(1, '#ffb35d00');
  c.fillStyle = glow; c.fillRect(0, 0, 1000, 1000);
  c.save(); c.beginPath(); c.arc(sunX, sunY, radius, 0, Math.PI * 2); c.clip();
  c.fillStyle = linear(c, 0, sunY - radius, 0, sunY + radius, [[0, '#fff4ad'], [.6, '#ffc27d'], [1, '#ff738b']]);
  c.fillRect(sunX - radius, sunY - radius, radius * 2, radius * 2);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 8; i++) c.clearRect(sunX - radius, sunY + i * 24, radius * 2, 3 + i * 1.7);
  c.restore();
  c.strokeStyle = '#fbd6b349'; c.lineWidth = 3;
  for (let i = 0; i < 8; i++) { const y = 80 + i * 57; c.beginPath(); c.moveTo(0, y); c.lineTo(230 + i * 75, y + 4); c.stroke(); }
}
export function drawPalm(c, x, y, scale = 1, lean = 50, color = '#1c1931') {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const topX = lean, topY = -510;
  path(c, `M -17 8 Q -18 -260 ${topX - 10} ${topY} L ${topX + 8} ${topY} Q 6 -250 22 8 Z`, color, color, 3);
  c.strokeStyle = '#a25c6f55'; c.lineWidth = 3;
  for (let t = 30; t < 490; t += 23) { c.beginPath(); c.moveTo(-12 + lean * t / 510, -t); c.lineTo(15 + lean * t / 510, -t - 7); c.stroke(); }
  c.translate(topX, topY);
  const tips = [[-255, 100], [-272, 5], [-210,-110], [-114,-172], [25,-170], [150,-140], [260,-65], [270,60], [190,145], [50,120]];
  tips.forEach(([tx,ty], i) => {
    const cx = tx * .53, cy = ty < 0 ? ty * 1.2 - 25 : ty - 100;
    path(c, `M 0 0 Q ${cx} ${cy} ${tx} ${ty} Q ${cx + 15} ${cy + 40} 0 0Z`, color, color, 3);
    c.strokeStyle = color; c.lineWidth = 3;
    for (let k = .25; k < .97; k += .13) {
      const px = 2 * (1-k)*k*cx + k*k*tx, py = 2*(1-k)*k*cy+k*k*ty;
      c.beginPath(); c.moveTo(px,py); c.lineTo(px + (tx < 0 ? -20:20), py + 26*(1-k)+8); c.stroke();
    }
  });
  c.restore();
}
function city(c, base = 650, seed = 9, color = '#57405d', depth = 1) {
  const rand = seededRandom(seed);
  for (let x = -20; x < 1040;) {
    const w = 25 + rand()*70, h = 30 + rand()*160*depth;
    c.fillStyle = color; c.fillRect(x, base-h, w, h+12);
    c.fillStyle = '#f7a6ad55'; c.fillRect(x+3, base-h+4, 3, h-4);
    if (h>120) { c.fillStyle=color; c.fillRect(x+w*.4,base-h-20,3,24); }
    c.fillStyle='#f8d3ad80';
    for(let yy=base-h+15;yy<base-10;yy+=17) for(let xx=x+10;xx<x+w-5;xx+=13) if(rand()>.4)c.fillRect(xx,yy,3,7);
    x += w+4;
  }
}
function ocean(c, y = 580, seed = 34) {
  c.fillStyle = linear(c,0,y,0,1000,[[0,'#55b7b1'],[.35,'#2397a7'],[1,'#155578']]); c.fillRect(0,y,1000,1000-y);
  const rand=seededRandom(seed);
  for(let i=0;i<220;i++) { const yy=y+rand()*(1000-y), x=rand()*1000; c.fillStyle=i%4===0?'#ffe9c68c':'#8af0d666'; c.fillRect(x,yy,8+rand()*(yy-y)*.3,1+(yy-y)/160); }
}
function drawCoastalDrive(c) {
  sky(c,['#bb6caa','#ffb788','#eab88c'],600,320,200); ocean(c,590);
  city(c,605,25,'#78607b',.7); city(c,628,66,'#514265',.45);
  path(c,'M 600 610 L 1000 680 L 1000 1000 L 100 1000Z',linear(c,0,600,0,1000,[[0,'#59425f'],[1,'#30283e']]));
  path(c,'M 588 610 L 620 610 L 180 1000 L 80 1000Z','#eeb69e',INK,3);
  path(c,'M 805 659 L 829 667 L 607 1000 L 560 1000Z','#f1c49d',null);
  c.fillStyle='#f9bcaa'; for(let i=0;i<6;i++) { let y=690+i*57; c.fillRect(740-(y-690)*.4,y,8+i*2,17+i*3); }
  drawPalm(c,150,900,1.30,65); drawPalm(c,1000,810,1.05,-70);
  for(let i=0;i<6;i++) drawPalm(c,630+i*57,649+i*10,.13+i*.025,50);
  c.fillStyle='#ffe7bb'; c.fillRect(32,692,119,9); c.fillRect(45,705,8,100); c.fillRect(128,705,8,100);
  c.font='19px Anton'; c.fillStyle='#ffe4bc'; c.fillText('OCEAN DRIVE',39,681);
  // A few inked birds above the horizon.
  c.strokeStyle='#59405d'; c.lineWidth=3;
  for(const [x,y] of [[700,160],[740,183],[440,123]]){ c.beginPath(); c.moveTo(x-12,y+2);c.quadraticCurveTo(x-5,y-8,x,y);c.quadraticCurveTo(x+5,y-8,x+12,y+2);c.stroke(); }
}
function drawMidnightGT(c) {
  sky(c,['#704285','#ed86a0','#f7be91'],830,265,126);
  city(c,590,50,'#76516b',.8);
  path(c,'M0 570H1000V1000H0Z',linear(c,0,560,0,1000,[[0,'#b06b84'],[.55,'#4d3a5d'],[1,'#26283f']]));
  drawPalm(c,130,625,.85,45); drawPalm(c,880,580,.9,-10);
  c.fillStyle='#d4a1aa'; c.fillRect(0,626,1000,4); c.fillStyle='#69cecc88';c.fillRect(0,830,1000,5);
  // Neon motel behind the getaway car.
  path(c,'M 670 275H870V525H670Z','#5b4064');
  path(c,'M 682 290H858V510H682Z',null,'#fca0bd',7);
  c.fillStyle='#f9c1b5'; c.font='61px Anton'; c.textAlign='center'; c.fillText('MOTEL',770,366); c.font='27px Anton';c.fillText('VACANCY',770,420);c.textAlign='start';
  c.save();c.translate(500,556);c.scale(1.1,1.1);
  c.fillStyle='#16182eaa';c.beginPath();c.ellipse(0,175,415,58,0,0,Math.PI*2);c.fill();
  // Wide tires, independent from the silhouette.
  path(c,'M-320 20Q-370 45-357 145Q-342 191-298 164L-254 135V26Z','#14192b');
  path(c,'M265 3Q321-10 338 43L337 132Q314 175 271 137Z','#151728');
  path(c,'M-308 43Q-333 74-326 127Q-305 159-283 126L-275 69Z','#68738a');
  path(c,'M289 31Q315 38 314 98Q298 133 280 101Z','#727e8b');
  path(c,'M-286-55L-205-201Q-100-233 137-212L252-85 340-34 354 87 304 132-321 149-371 85-357-9Z',linear(c,0,-230,0,150,[[0,'#ff9d90'],[.4,'#f25872'],[.62,'#da315b'],[1,'#722e57']]),INK,7);
  // Windshield and roofline.
  path(c,'M-258-62L-193-183Q-42-212 127-191L219-75Z',linear(c,-180,-180,100,-50,[[0,'#5ab4b4'],[.48,'#7696b3'],[1,'#2d3656']]),INK,7);
  path(c,'M-165-180L-195-64M98-193L174-69',null,'#e48a9e',7);
  path(c,'M-226-175L-89-192-164-63-245-64Z','#d2f1d22e',null);
  // Long hood / sculpted front with ink seams.
  path(c,'M-258-57L220-71 333-20-344 11Z',linear(c,0,-70,0,15,[[0,'#f77f83'],[1,'#d3406a']]),INK,5);
  path(c,'M-184-53L-239 4M136-65L246-10M-348 21L345-9M-349 91L329 72',null,'#842852',4);
  path(c,'M-333 27L-167 25-165 73-336 78Z','#ffdfa5',INK,5);
  path(c,'M159 13L315 9 326 55 165 62Z','#ffe4b1',INK,5);
  for(let x=-317;x<-170;x+=17)path(c,`M${x} 32V67`,null,'#b99980',2);
  for(let x=178;x<315;x+=17)path(c,`M${x} 18V53`,null,'#b99980',2);
  path(c,'M-137 29L132 19 141 72-145 86Z','#20243c',INK,5);
  for(let y=37;y<75;y+=9)path(c,`M-130 ${y+6}L129 ${y-4}`,null,'#6a5d74',2);
  path(c,'M-330 111L315 91 300 119-309 136Z','#eaa2a3',INK,4);
  path(c,'M-44 94L61 89 63 119-44 124Z','#f6d6ad',INK,3);
  c.fillStyle='#483650';c.font='14px Anton';c.fillText('NO LIMIT',-32,114);
  path(c,'M-276-88L-327-108-345-84-278-70Z','#d74369',INK,5);
  path(c,'M232-101L280-117 295-88 249-74Z','#ec5679',INK,5);
  path(c,'M-195-205Q-40-236 133-216',null,'#ffe2b7',5);
  c.restore();
  const g=c.createLinearGradient(0,930,0,1000);g.addColorStop(0,'#e87fa530');g.addColorStop(1,'#e87fa500');c.fillStyle=g;c.fillRect(80,930,850,70);
}
function drawAirPatrol(c) {
  sky(c,['#6b4e91','#e37d9f','#ffbd96'],410,430,236);city(c,845,73,'#614365',1);city(c,900,19,'#322e50',.75);
  c.save();c.translate(505,405);c.rotate(-.13);c.scale(.9,.9);
  // Original helicopter, modeled as layered inked shapes.
  path(c,'M-120 30L-470-97-488-158-438-155-378-82-56-25Z','#333049',INK,7);
  path(c,'M-419-80L-410-181-371-181-354-62Z','#78536d',INK,6);
  path(c,'M-140-80Q-31-153 142-102L251-31Q283 0 243 61L112 115-111 77Q-176 40-140-80Z',linear(c,0,-100,0,120,[[0,'#9d7b90'],[.3,'#756c86'],[.58,'#4c4664'],[1,'#292a45']]),INK,8);
  path(c,'M29-107Q157-102 227-33L118 4 27-7Z',linear(c,0,-110,190,20,[[0,'#b7e9df'],[.5,'#6dc3cb'],[1,'#2d6a91']]),INK,6);
  path(c,'M-105-83L6-105 5-3-117 7Z','#74aebd',INK,6);
  path(c,'M50-94L83-92 71-16 42-19Z','#e3fff247',null);
  path(c,'M-89-74L-67-79-85-3-108-3Z','#ddfff533',null);
  path(c,'M106-91L116 1M-109 27L50 29 57 90-88 71Z',null,'#b199a3',3);
  path(c,'M-119 32L-75 43M-59 46L-16 52',null,'#e9bca8',4);
  path(c,'M-63-111L-47-175H16L27-112Z','#4b3d59',INK,5);
  path(c,'M-24-169L-23-207',null,INK,13);
  path(c,'M-496-213L439-193 441-185-488-200Z','#201e36',INK,3);
  path(c,'M-93 94L-111 148M137 103L151 150M-184 141Q-144 167-95 160L223 156',null,INK,13);
  path(c,'M-179 141Q-141 159-98 155L223 151',null,'#ad8e9f',3);
  c.fillStyle='#d6a7a8';c.font='25px Anton';c.fillText('06',72,63);
  path(c,'M-127-41L-382-108M-122-35L-375-100',null,'#c094a799',2);
  for(let n=0;n<5;n++)path(c,`M${-50+n*12} -88L${-50+n*12} -61`,null,'#30283f',5);
  // Tail rotor, not a borrowed logo.
  path(c,'M-437-96L-474-59M-438-59L-475-96',null,'#e1b2bc',11);
  c.fillStyle='#ff8e9d';c.beginPath();c.arc(-390,-180,8,0,7);c.fill();
  c.restore();
  const beam=c.createLinearGradient(0,520,0,1000);beam.addColorStop(0,'#ffe6a52a');beam.addColorStop(1,'#ffe6a500');
  path(c,'M650 506L875 1000H270Z',beam,null);
  drawPalm(c,970,1060,.73,-15);
}
function drawCoastRunner(c) {
  sky(c,['#d188aa','#ffbc96','#ffe0a9'],770,265,145); ocean(c,440,121);
  city(c,440,91,'#8f6a84',.4);
  drawPalm(c,60,590,.95,35);
  c.save();c.translate(550,648);c.rotate(-.19);
  // Foam is painted behind the hull.
  path(c,'M-292 65Q-458 30-551 104Q-357 86-259 163L351 135Q133 211-278 180L-541 242Q-115 216 354 151Z','#c5efcf',null);
  path(c,'M-323 42L355 59Q230 170-181 176L-291 147Z',linear(c,0,60,0,180,[[0,'#fb8e99'],[.5,'#e25681'],[1,'#7b3d6c']]),INK,7);
  path(c,'M-365 28L378 24 353 74Q87 136-289 109Z','#f8ddb9',INK,6);
  path(c,'M-277 27L-192-94 154-72 252 23Z','#f4c3b3',INK,6);
  path(c,'M-188-89L-137-178 92-155 148-70Z','#6bb2ba',INK,6);
  path(c,'M-139-171L-125-74M29-160L70-75',null,'#d1e0c7',5);
  path(c,'M-180-96L152-78 162-58-190-74Z','#251f3d',INK,3);
  path(c,'M-218-62L-254 16 215 17 167-52Z','#ab6582',INK,4);
  path(c,'M-260 44L286 47M-219 143Q64 166 281 101',null,'#fff0c7',5);
  path(c,'M-67-162L-53-264',null,INK,5);
  path(c,'M-53-260L5-250-51-226Z','#ec6c94',INK,3);
  c.restore();
  c.strokeStyle='#f0f5cf9c';c.lineWidth=4;
  for(let i=0;i<12;i++){c.beginPath();c.moveTo(420-i*20,830+i*9);c.quadraticCurveTo(600,840+i*12,850+i*14,765+i*13);c.stroke();}
}
export function createSceneLibrary() {
  const scenes = [
    ['coast','Ocean Drive',drawCoastalDrive], ['gt','Getaway GT',drawMidnightGT],
    ['air','Air Patrol',drawAirPatrol], ['boat','Coast Runner',drawCoastRunner],
  ];
  return scenes.map(([id,name,draw])=>{
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1000;
    const c=canvas.getContext('2d');draw(c);
    return {id,name,image:canvas,art:canvas,scene:true};
  });
}
