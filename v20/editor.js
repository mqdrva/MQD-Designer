
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';

const seed=[
{id:'tshirt',name:'All-Over Print T-Shirt',category:'T-Shirts',price:39,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/tshirt.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],templates:{'Front':{path:'/assets/templates/tshirt/front.png',width:3763,height:4992},'Back':{path:'/assets/templates/tshirt/back.png',width:3750,height:5011},'Left Sleeve':{path:'/assets/templates/tshirt/sleeve.png',width:2841,height:1702},'Right Sleeve':{path:'/assets/templates/tshirt/sleeve.png',width:2841,height:1702},'Collar':{path:'/assets/templates/tshirt/collar.png',width:3276,height:435}}},
{id:'long-sleeve-tshirt',name:'Long Sleeve T-Shirt',category:'Long Sleeve',price:49,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/long-sleeve-tshirt.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],templates:{'Front':{path:'/assets/templates/tshirt/front.png',width:3763,height:4992},'Back':{path:'/assets/templates/tshirt/back.png',width:3750,height:5011},'Left Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Right Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Collar':{path:'/assets/templates/tshirt/collar.png',width:3276,height:435}}},
{id:'short-sleeve-polo',name:'Short Sleeve Polo',category:'Polos',price:54,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/short-sleeve-polo.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],templates:{'Front':{path:'/assets/templates/polo/front.png',width:3730,height:4980},'Back':{path:'/assets/templates/polo/back.png',width:3730,height:5080},'Left Sleeve':{path:'/assets/templates/polo/sleeve.png',width:2930,height:1740},'Right Sleeve':{path:'/assets/templates/polo/sleeve.png',width:2930,height:1740},'Collar':{path:'/assets/templates/polo/collar.png',width:3180,height:1130}}},
{id:'long-sleeve-polo',name:'Long Sleeve Polo',category:'Polos',price:59,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/long-sleeve-polo.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],templates:{'Front':{path:'/assets/templates/polo/front.png',width:3730,height:4980},'Back':{path:'/assets/templates/polo/back.png',width:3730,height:5080},'Left Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Right Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Collar':{path:'/assets/templates/polo/collar.png',width:3180,height:1130}}},
{id:'fleece-hoodie',name:'Fleece Hoodie',category:'Hoodies',price:69,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/fleece-hoodie.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood'],templates:{'Front':{path:'/assets/templates/hoodie/front.png',width:3865,height:3884},'Back':{path:'/assets/templates/hoodie/back.png',width:3865,height:4006},'Left Sleeve':{path:'/assets/templates/hoodie/sleeve.png',width:3276,height:6124},'Right Sleeve':{path:'/assets/templates/hoodie/sleeve.png',width:3276,height:6124},'Hood':{path:'/assets/templates/hoodie/hood.png',width:4684,height:2073}}},
{id:'lightweight-jacket',name:'Lightweight Jacket',category:'Jackets',price:79,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/lightweight-jacket.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood'],templates:{'Front':{path:'/assets/templates/rain-jacket/front.png',width:4220,height:4740},'Back':{path:'/assets/templates/hoodie/back.png',width:3865,height:4006},'Left Sleeve':{path:'/assets/templates/hoodie/sleeve.png',width:3276,height:6124},'Right Sleeve':{path:'/assets/templates/hoodie/sleeve.png',width:3276,height:6124},'Hood':{path:'/assets/templates/hoodie/hood.png',width:4684,height:2073}}},
{id:'mask',name:'Mask',category:'Accessories',price:19,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/mask.glb',zones:['Entire Mask'],templates:{'Entire Mask':{shape:'rectangle',width:3100,height:3110}}},
{id:'hood-mask-shirt',name:'Long Sleeve Shirt With Hood And Built-In Mask',category:'Long Sleeve',price:64,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hood-mask-shirt.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood','Built-In Mask'],templates:{'Front':{path:'/assets/templates/tshirt/front.png',width:3763,height:4992},'Back':{path:'/assets/templates/tshirt/back.png',width:3750,height:5011},'Left Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Right Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Hood':{path:'/assets/templates/hoodie/hood.png',width:4684,height:2073},'Built-In Mask':{shape:'rectangle',width:3100,height:3110}}},
{id:'shorts',name:'Shorts',category:'Bottoms',price:44,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/shorts.glb',zones:['Front','Back'],templates:{'Front':{path:'/assets/templates/shorts/front.png',width:2145,height:3480},'Back':{path:'/assets/templates/shorts/back.png',width:2455,height:3650}}},
{id:'sweat-pants',name:'Sweat Pants',category:'Bottoms',price:54,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/sweat-pants.glb',zones:['Front','Back'],templates:{'Front':{path:'/assets/templates/sweat-pants/front.png',width:3670,height:5960},'Back':{path:'/assets/templates/sweat-pants/back.png',width:3670,height:5960}}},
{id:'hooded-long-sleeve',name:'Long Sleeve Shirt With Hood',category:'Long Sleeve',price:59,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hooded-long-sleeve.glb',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood'],templates:{'Front':{path:'/assets/templates/tshirt/front.png',width:3763,height:4992},'Back':{path:'/assets/templates/tshirt/back.png',width:3750,height:5011},'Left Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Right Sleeve':{path:'/assets/templates/long-sleeve/sleeve.png',width:2690,height:4120},'Hood':{path:'/assets/templates/hoodie/hood.png',width:4684,height:2073}}},
{id:'hat',name:'Hat',category:'Headwear',price:34,model:'https://gsxuhpffgdffsqksrkrf.supabase.co/storage/v1/object/public/garments/hat.glb',zones:['Front Panel','Top of Bill'],templates:{'Front Panel':{path:'/assets/templates/hat/front-panel.png',width:1151,height:1050},'Top of Bill':{path:'/assets/templates/hat/top-of-bill.png',width:1169,height:941}}}
];
const $=id=>document.getElementById(id);
let catalog=JSON.parse(localStorage.getItem('mqd-catalog')||'null')||seed;
let product=catalog[0],activeZone=product.zones[0],activeLayerId=null,layerSeq=1;
const designs={};
const history=[],future=[];
let scene,camera,renderer,controls,garment=null,decalGroup=null,editorZoom=1,showGrid=true,dragState=null;
const templateCache=new Map();
const editorCanvas=$('editorCanvas'),ctx=editorCanvas.getContext('2d');

function stateFor(pid=product.id){if(!designs[pid])designs[pid]={zones:{}};return designs[pid];}
function zoneState(zone=activeZone){const s=stateFor();if(!s.zones[zone])s.zones[zone]={background:'#FFFFFF',layers:[]};return s.zones[zone];}
function activeLayer(){return zoneState().layers.find(l=>l.id===activeLayerId)||null;}
function templateFor(zone=activeZone){return product.templates?.[zone]||null;}
function normalizeHex(v){v=String(v||'').trim().toUpperCase();if(!v.startsWith('#'))v='#'+v;return /^#[0-9A-F]{6}$/.test(v)?v:null;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function snapshot(){history.push(JSON.stringify(designs));if(history.length>30)history.shift();future.length=0;}
function undo(){if(!history.length)return;future.push(JSON.stringify(designs));const prev=JSON.parse(history.pop());Object.keys(designs).forEach(k=>delete designs[k]);Object.assign(designs,prev);repairImageObjects();renderAll();}
function redo(){if(!future.length)return;history.push(JSON.stringify(designs));const next=JSON.parse(future.pop());Object.keys(designs).forEach(k=>delete designs[k]);Object.assign(designs,next);repairImageObjects();renderAll();}
function repairImageObjects(){Object.values(designs).forEach(ps=>Object.values(ps.zones||{}).forEach(z=>z.layers?.forEach(l=>{if(l.type==='image'&&l.src&&!l.image){const img=new Image();img.onload=renderAll;img.src=l.src;l.image=img;}})));}

function ensureTemplateImage(zone=activeZone){
  const t=product.templates?.[zone];
  if(!t?.path)return null;
  if(templateCache.has(t.path))return templateCache.get(t.path);
  const rec={img:null,status:'loading'};templateCache.set(t.path,rec);
  const img=new Image();
  img.onload=()=>{rec.img=img;rec.status='ready';if(zone===activeZone)drawEditor();};
  img.onerror=()=>{rec.status='error';};
  img.src=t.path;
  return rec;
}
function templateImageFor(zone=activeZone){return ensureTemplateImage(zone)?.img||null;}
function preloadTemplates(){product.zones.forEach(z=>ensureTemplateImage(z));}
function editorRect(zone=activeZone,w=editorCanvas.width,h=editorCanvas.height){
  const t=product.templates?.[zone],padX=82,padY=68,maxW=Math.max(120,w-padX*2),maxH=Math.max(120,h-padY*2);
  const tw=t?.width||1000,th=t?.height||1000,scale=Math.min(maxW/tw,maxH/th),dw=Math.round(tw*scale),dh=Math.round(th*scale);
  return{x:Math.round((w-dw)/2),y:Math.round((h-dh)/2),w:dw,h:dh};
}
function drawGridLines(c,r){
  const step=Math.max(24,Math.round(Math.min(r.w,r.h)/14));c.save();c.strokeStyle='rgba(0,0,0,.075)';c.lineWidth=1;
  for(let x=r.x;x<=r.x+r.w;x+=step){c.beginPath();c.moveTo(x,r.y);c.lineTo(x,r.y+r.h);c.stroke();}
  for(let y=r.y;y<=r.y+r.h;y+=step){c.beginPath();c.moveTo(r.x,y);c.lineTo(r.x+r.w,y);c.stroke();}c.restore();
}
function drawTemplateGuide(c,zone,r,alpha=.46){
  const img=templateImageFor(zone);if(!img)return;c.save();c.globalAlpha=alpha;c.globalCompositeOperation='multiply';c.drawImage(img,r.x,r.y,r.w,r.h);c.restore();
}
function drawZoneLayersRect(c,zone,r){
  const z=stateFor().zones[zone]||{background:'#FFFFFF',layers:[]};c.fillStyle=z.background||'#FFFFFF';c.fillRect(r.x,r.y,r.w,r.h);
  (z.layers||[]).forEach(l=>{if(l.visible===false)return;c.save();const cx=r.x+r.w/2+(l.x||0)*r.w/200,cy=r.y+r.h/2+(l.y||0)*r.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);
    if(l.type==='image'&&l.image){const base=Math.max(r.w/l.image.width,r.h/l.image.height),scale=base*(l.scale||1),iw=l.image.width*scale,ih=l.image.height*scale;c.drawImage(l.image,-iw/2,-ih/2,iw,ih);}
    else if(l.type==='text'){const fs=Math.max(26,r.w*.10*(l.scale||1));c.fillStyle=l.color||'#111';c.font=`800 ${fs}px Inter, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(l.text||'Text',0,0,r.w*.85);}c.restore();});
}
function drawProductionZone(c,zone,w,h){
  c.clearRect(0,0,w,h);c.save();traceZonePath(c,zone,w,h);c.clip();drawZoneLayersRect(c,zone,{x:0,y:0,w,h});c.restore();
}


function traceZonePath(c,zone,w,h){
  c.beginPath();
  if(zone==='Front'||zone==='Back'){
    const back=zone==='Back';
    c.moveTo(w*.20,h*.08);c.lineTo(w*.35,h*.04);
    c.bezierCurveTo(w*.38,h*.10,w*.41,h*(back?.11:.17),w*.50,h*(back?.12:.20));
    c.bezierCurveTo(w*.59,h*(back?.11:.17),w*.62,h*.10,w*.65,h*.04);
    c.lineTo(w*.80,h*.08);c.lineTo(w*.82,h*.18);c.bezierCurveTo(w*.80,h*.24,w*.82,h*.28,w*.86,h*.31);
    c.lineTo(w*.80,h*.90);c.lineTo(w*.20,h*.90);c.lineTo(w*.14,h*.31);c.bezierCurveTo(w*.18,h*.28,w*.20,h*.24,w*.18,h*.18);c.closePath();
  }else if(zone==='Left Sleeve'||zone==='Right Sleeve'){
    c.moveTo(w*.14,h*.23);c.lineTo(w*.82,h*.12);c.lineTo(w*.90,h*.76);c.lineTo(w*.22,h*.90);c.closePath();
  }else if(zone==='Collar'){
    c.moveTo(w*.08,h*.30);c.bezierCurveTo(w*.27,h*.05,w*.73,h*.05,w*.92,h*.30);c.lineTo(w*.82,h*.72);c.bezierCurveTo(w*.66,h*.53,w*.34,h*.53,w*.18,h*.72);c.closePath();
  }else if(zone==='Hood'){
    c.moveTo(w*.12,h*.72);c.bezierCurveTo(w*.10,h*.18,w*.31,h*.07,w*.50,h*.10);c.bezierCurveTo(w*.69,h*.07,w*.90,h*.18,w*.88,h*.72);c.bezierCurveTo(w*.67,h*.88,w*.33,h*.88,w*.12,h*.72);c.closePath();
  }else if(zone==='Entire Mask'||zone==='Built-In Mask'){
    c.roundRect(w*.10,h*.20,w*.80,h*.60,w*.12);
  }else if(zone==='Front Panel'){
    c.moveTo(w*.24,h*.88);c.lineTo(w*.15,h*.18);c.quadraticCurveTo(w*.50,h*.02,w*.85,h*.18);c.lineTo(w*.76,h*.88);c.closePath();
  }else if(zone==='Top of Bill'){
    c.ellipse(w*.50,h*.52,w*.41,h*.28,0,0,Math.PI*2);
  }else{
    c.roundRect(w*.12,h*.10,w*.76,h*.80,w*.05);
  }
}
function fitRect(){const pad=58;const w=editorCanvas.width-pad*2,h=editorCanvas.height-pad*2;return{x:pad,y:pad,w,h};}
function drawZoneComposite(targetCtx,w,h,includeGuides=false){
  const r=editorRect(activeZone,w,h);targetCtx.save();targetCtx.clearRect(0,0,w,h);targetCtx.translate(w/2,h/2);targetCtx.scale(editorZoom,editorZoom);targetCtx.translate(-w/2,-h/2);
  if(showGrid&&includeGuides)drawGridLines(targetCtx,r);
  drawTemplateGuide(targetCtx,activeZone,r,.25);
  targetCtx.save();targetCtx.translate(r.x,r.y);traceZonePath(targetCtx,activeZone,r.w,r.h);targetCtx.clip();drawZoneLayersRect(targetCtx,activeZone,{x:0,y:0,w:r.w,h:r.h});targetCtx.restore();
  drawTemplateGuide(targetCtx,activeZone,r,.50);
  if(!templateImageFor(activeZone)){targetCtx.save();targetCtx.translate(r.x,r.y);traceZonePath(targetCtx,activeZone,r.w,r.h);targetCtx.strokeStyle='#222';targetCtx.lineWidth=2.4;targetCtx.stroke();targetCtx.setLineDash([12,9]);targetCtx.strokeStyle='#d91e18';targetCtx.lineWidth=1.8;traceZonePath(targetCtx,activeZone,r.w,r.h);targetCtx.stroke();targetCtx.restore();}
  targetCtx.restore();
}
function drawEditor(){ctx.clearRect(0,0,editorCanvas.width,editorCanvas.height);drawZoneComposite(ctx,editorCanvas.width,editorCanvas.height,true);}
function makeZoneTextureCanvas(zone){
  const t=product.templates?.[zone],maxSide=1400,ratio=t?.width&&t?.height?t.width/t.height:1;
  let w=1024,h=1024;if(ratio>=1){w=maxSide;h=Math.max(320,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(320,Math.round(maxSide*ratio));}
  const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';drawZoneLayersRect(x,zone,{x:0,y:0,w,h});return c;
}
function zoneHasContent(zone){const z=stateFor().zones[zone];return z&&((z.background||'#FFFFFF').toUpperCase()!=='#FFFFFF'||(z.layers||[]).length);}

function renderProducts(){const sel=$('productSelect');sel.innerHTML='';catalog.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — $${Number(p.price).toFixed(2)}`;sel.appendChild(o);});sel.value=product.id;}
function zoneIconLabel(z){if(z==='Front')return'▰\nFront';if(z==='Back')return'▱\nBack';if(z.includes('Sleeve'))return'▭\n'+(z.startsWith('Left')?'L Sleeve':'R Sleeve');if(z==='Collar')return'⌒\nCollar';if(z==='Hood')return'◠\nHood';return z;}
function renderZones(){const rail=$('zoneRail');rail.innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone-icon'+(z===activeZone?' active':'');b.innerHTML=escapeHtml(zoneIconLabel(z)).replace('\n','<br>');b.onclick=()=>selectZone(z);rail.appendChild(b);});}
function renderLayerPanel(){const wrap=$('layers'),empty=$('emptyLayers'),controlsEl=$('layerControls');wrap.innerHTML='';const arr=zoneState().layers;empty.classList.toggle('hidden',arr.length>0);arr.forEach(l=>{const d=document.createElement('div');d.className='layer'+(l.id===activeLayerId?' active':'');d.innerHTML=`<div class="layer-head"><div><div class="layer-name">${escapeHtml(l.label)}</div><div class="layer-meta">${escapeHtml(activeZone)} · ${l.type==='image'?'Image':'Text'}${l.visible===false?' · hidden':''}</div></div><span>${l.type==='image'?'▧':'T'}</span></div>`;d.onclick=()=>{activeLayerId=l.id;renderLayerPanel();};wrap.appendChild(d);});const l=activeLayer();controlsEl.classList.toggle('hidden',!l);if(!l)return;$('selectedLayerLabel').textContent=l.label;$('layerX').value=l.x||0;$('layerY').value=l.y||0;$('layerScale').value=Math.round((l.scale||1)*100);$('layerRotation').value=l.rotation||0;$('layerXVal').textContent=l.x||0;$('layerYVal').textContent=l.y||0;$('layerScaleVal').textContent=Math.round((l.scale||1)*100);$('layerRotationVal').textContent=(l.rotation||0)+'°';$('toggleLayer').textContent=l.visible===false?'Show':'Hide';}
function renderStatus(){const t=templateFor();$('zoneName').textContent=activeZone;$('zoneSize').textContent=t?.width&&t?.height?`${t.width.toLocaleString()} × ${t.height.toLocaleString()} px`:'Custom zone';$('statusProduct').textContent=product.name;$('statusZone').textContent=activeZone;$('statusLayers').textContent=zoneState().layers.length;const c=zoneState().background||'#FFFFFF';$('zoneColor').value=c.toLowerCase();$('zoneHex').value=c;}
function renderAll(){renderProducts();renderZones();renderLayerPanel();renderStatus();drawEditor();rebuildDecals();}

function init3D(){const canvas=$('webgl');renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.01,100);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(2,3,4);scene.add(key);decalGroup=new THREE.Group();scene.add(decalGroup);const resize=()=>{const r=canvas.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false)};addEventListener('resize',resize);resize();(function loop(){controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)})();}
function fitGarment(){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),m=Math.max(size.x,size.y,size.z);garment.position.sub(center);camera.position.set(0,m*.45,m*2.15);camera.near=m/100;camera.far=m*20;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();}
function clearDecals(){while(decalGroup.children.length){const o=decalGroup.children[0];decalGroup.remove(o);o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map?.dispose();m.dispose();});}}
function zonePlacement(zone){
  const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),p=new THREE.Vector3(),r=new THREE.Euler(),d=new THREE.Vector3();
  const torso=/tshirt|polo|hooded-long-sleeve|hood-mask-shirt/.test(product.id),bottom=/shorts|sweat-pants/.test(product.id);
  if(zone==='Back'){p.set(c.x,c.y-size.y*(bottom?.01:.015),box.min.z-size.z*.04);r.set(0,Math.PI,0);d.set(size.x*(bottom?.76:torso?.61:.67),size.y*(bottom?.90:torso?.80:.76),size.z*1.35);}
  else if(zone==='Left Sleeve'){p.set(box.min.x,c.y+size.y*.17,c.z);r.set(0,-Math.PI/2,0);d.set(size.z*.96,size.y*(torso?.35:.40),size.x*.30);}
  else if(zone==='Right Sleeve'){p.set(box.max.x,c.y+size.y*.17,c.z);r.set(0,Math.PI/2,0);d.set(size.z*.96,size.y*(torso?.35:.40),size.x*.30);}
  else if(zone==='Collar'){p.set(c.x,box.max.y-size.y*.035,c.z+size.z*.10);r.set(-Math.PI/2,0,0);d.set(size.x*.34,size.z*1.0,size.y*.12);}
  else if(zone==='Hood'){p.set(c.x,c.y+size.y*.31,box.min.z);r.set(0,Math.PI,0);d.set(size.x*.58,size.y*.32,size.z*.92);}
  else if(zone==='Front Panel'){p.set(c.x,c.y+size.y*.14,box.max.z+size.z*.15);d.set(size.x*.44,size.y*.32,size.z*.72);}
  else if(zone==='Top of Bill'){p.set(c.x,c.y-size.y*.03,box.max.z+size.z*.20);r.set(-Math.PI/2,0,0);d.set(size.x*.48,size.z*.46,size.y*.14);}
  else if(zone==='Entire Mask'||zone==='Built-In Mask'){p.set(c.x,c.y,box.max.z+size.z*.06);d.set(size.x*.54,size.y*.30,size.z*.48);}
  else{p.set(c.x,c.y-size.y*(bottom?.01:.015),box.max.z+size.z*.04);d.set(size.x*(bottom?.76:torso?.61:.67),size.y*(bottom?.90:torso?.80:.76),size.z*1.35);}
  return{p,r,d};
}
function findLargestMesh(){let best=null,score=-1;garment?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),v=s.x*s.y*s.z;if(v>score){score=v;best=o;}});return best;}
function rebuildDecals(){if(!garment||!decalGroup)return;clearDecals();const target=findLargestMesh();if(!target)return;product.zones.forEach(zone=>{if(!zoneHasContent(zone))return;const canvas=makeZoneTextureCanvas(zone),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const q=zonePlacement(zone);try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;decalGroup.add(mesh);}catch(e){console.warn('Decal failed',zone,e);}});}
function loadGarment(){if(!renderer)init3D();if(garment){scene.remove(garment);garment.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>m.dispose?.());});garment=null;}clearDecals();preloadTemplates();new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map=null;if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});rebuildDecals();},undefined,e=>console.error(e));}

function selectProduct(id){product=catalog.find(p=>p.id===id)||catalog[0];activeZone=product.zones[0];activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;preloadTemplates();renderAll();loadGarment();}
function selectZone(z){activeZone=z;activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;ensureTemplateImage(z);renderAll();}
function nextLabel(){return `Layer ${zoneState().layers.length+1}`;}
function addImage(src){const img=new Image();img.onload=()=>{snapshot();const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),src,image:img,x:0,y:0,scale:1,rotation:0,visible:true};zoneState().layers.push(l);activeLayerId=l.id;renderAll();};img.src=src;}
function addText(){const text=prompt('Text to add');if(!text)return;snapshot();const l={id:'layer-'+layerSeq++,type:'text',label:nextLabel(),text,x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111'};zoneState().layers.push(l);activeLayerId=l.id;renderAll();}
function updateLayer(prop,val){const l=activeLayer();if(!l)return;l[prop]=val;renderLayerPanel();drawEditor();rebuildDecals();}
function setBackground(hex,record=true){const v=normalizeHex(hex);if(!v)return;if(record)snapshot();zoneState().background=v;renderStatus();drawEditor();rebuildDecals();}
function applyBackgroundAll(){const c=normalizeHex($('zoneHex').value);if(!c)return;snapshot();product.zones.forEach(z=>{const old=activeZone;activeZone=z;zoneState().background=c;activeZone=old;});renderAll();}

$('productSelect').onchange=e=>selectProduct(e.target.value);$('addImageBtn').onclick=()=>$('artUpload').click();$('artUpload').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>addImage(rd.result);rd.readAsDataURL(f);e.target.value='';};$('addTextBtn').onclick=addText;$('zoneColor').oninput=e=>{$('zoneHex').value=e.target.value.toUpperCase();};$('zoneColor').onchange=e=>setBackground(e.target.value.toUpperCase());$('zoneHex').onchange=e=>{const v=normalizeHex(e.target.value);if(v)setBackground(v);else renderStatus();};$('applyAll').onclick=applyBackgroundAll;
[['layerX','x',Number],['layerY','y',Number],['layerScale','scale',v=>Number(v)/100],['layerRotation','rotation',Number]].forEach(([id,p,fn])=>$(id).oninput=e=>updateLayer(p,fn(e.target.value)));
$('fillLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.x=0;l.y=0;l.scale=1;l.rotation=0;renderAll();};$('toggleLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.visible=l.visible===false;renderAll();};$('deleteLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();const arr=zoneState().layers;arr.splice(arr.findIndex(x=>x.id===l.id),1);activeLayerId=arr.at(-1)?.id||null;renderAll();};$('undo').onclick=undo;$('redo').onclick=redo;$('gridToggle').onclick=()=>{showGrid=!showGrid;drawEditor();};$('zoomIn').onclick=()=>{editorZoom=Math.min(1.6,editorZoom+.1);drawEditor();};$('zoomOut').onclick=()=>{editorZoom=Math.max(.6,editorZoom-.1);drawEditor();};

function pointerToCanvas(e){const r=editorCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*editorCanvas.width/r.width,y:(e.clientY-r.top)*editorCanvas.height/r.height};}
editorCanvas.addEventListener('pointerdown',e=>{const l=activeLayer();if(!l)return;snapshot();const p=pointerToCanvas(e);dragState={start:p,x:l.x||0,y:l.y||0};editorCanvas.setPointerCapture(e.pointerId);editorCanvas.classList.add('dragging');});editorCanvas.addEventListener('pointermove',e=>{if(!dragState)return;const l=activeLayer();if(!l)return;const p=pointerToCanvas(e),dx=(p.x-dragState.start.x)/editorCanvas.width*200,dy=(p.y-dragState.start.y)/editorCanvas.height*200;l.x=Math.max(-100,Math.min(100,dragState.x+dx));l.y=Math.max(-100,Math.min(100,dragState.y+dy));drawEditor();renderLayerPanel();rebuildDecals();});editorCanvas.addEventListener('pointerup',e=>{dragState=null;editorCanvas.releasePointerCapture(e.pointerId);editorCanvas.classList.remove('dragging');});

function designJSON(){const clean=JSON.parse(JSON.stringify(designs,(k,v)=>k==='image'?undefined:v));return{product:{id:product.id,name:product.name,category:product.category,price:product.price},activeZone,design:clean[product.id]||{},createdAt:new Date().toISOString()};}
$('saveDesign').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(designJSON(),null,2)],{type:'application/json'}));a.download=product.id+'-design.json';a.click();};
function dataUrlBlob(dataUrl){const [h,b]=dataUrl.split(','),bin=atob(b),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:h.match(/data:(.*?);/)[1]});}
$('downloadPack').onclick=async()=>{const zip=new JSZip(),root=zip.folder(product.id+'-production'),old=activeZone;for(const z of product.zones){activeZone=z;const t=templateFor(z),w=t?.width||2048,h=t?.height||2048,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),oldZoom=editorZoom;editorZoom=1;drawProductionZone(x,z,w,h);editorZoom=oldZoom;root.file(`zones/${z.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,dataUrlBlob(c.toDataURL('image/png')));if(t?.path){try{const r=await fetch(t.path);if(r.ok)root.file(`template-references/${z.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,await r.blob());}catch{}}}activeZone=old;root.file('design.json',JSON.stringify(designJSON(),null,2));try{const r=await fetch(product.model);if(r.ok)root.file(product.id+'.glb',await r.blob());}catch{}const blob=await zip.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=product.id+'-production.zip';a.click();renderAll();};

function renderAdmin(){const list=$('adminList');list.innerHTML='';catalog.forEach(p=>{const d=document.createElement('div');d.className='product-row';d.innerHTML=`<div><strong>${escapeHtml(p.name)}</strong><div class="subtle">${escapeHtml(p.category)} · $${Number(p.price).toFixed(2)}</div></div><button class="btn">Edit</button>`;d.querySelector('button').onclick=()=>loadAdmin(p.id);list.appendChild(d);});}
function loadAdmin(id){const p=catalog.find(x=>x.id===id);if(!p)return;$('adminName').value=p.name;$('adminCategory').value=p.category;$('adminPrice').value=p.price;$('adminZones').innerHTML='';p.zones.forEach(z=>{const s=document.createElement('span');s.className='chip';s.textContent=z;$('adminZones').appendChild(s);});$('saveProductAdmin').dataset.id=id;}
$('openAdmin').onclick=()=>{$('adminOverlay').classList.remove('hidden');renderAdmin();loadAdmin(product.id);};$('closeAdmin').onclick=()=>$('adminOverlay').classList.add('hidden');$('adminOverlay').onclick=e=>{if(e.target===$('adminOverlay'))$('adminOverlay').classList.add('hidden');};$('saveProductAdmin').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;p.name=$('adminName').value.trim()||p.name;p.category=$('adminCategory').value.trim()||p.category;p.price=Number($('adminPrice').value)||p.price;localStorage.setItem('mqd-catalog',JSON.stringify(catalog));if(p.id===product.id)product=p;renderProducts();renderAdmin();alert('Product saved.');};$('addZone').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;const z=prompt('Zone name');if(!z)return;p.zones.push(z.trim());localStorage.setItem('mqd-catalog',JSON.stringify(catalog));loadAdmin(p.id);if(p.id===product.id){product=p;renderAll();}};

renderProducts();renderAll();init3D();loadGarment();
