
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
let tshirtZoneGroup=null;
const tshirtZoneMeshes=new Map();
const MQD_TSHIRT_ZONE_CALIBRATION='v22.2-stable-visible-renderer';
let colorRaf=0;
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
  const rec={img:null,maskCanvas:null,cutlineCanvas:null,bounds:null,status:'loading'};
  templateCache.set(t.path,rec);
  const img=new Image();
  img.onload=()=>{
    rec.img=img;
    try{
      const built=buildTemplateMask(img);
      rec.maskCanvas=built.maskCanvas;
      rec.cutlineCanvas=built.cutlineCanvas;
      rec.bounds=built.bounds;
      rec.status='ready';
    }catch(err){
      console.warn('Template mask build failed',t.path,err);
      rec.status='guide-only';
    }
    if(zone===activeZone)drawEditor();
  };
  img.onerror=()=>{rec.status='error';};
  img.src=t.path;
  return rec;
}
function templateImageFor(zone=activeZone){return ensureTemplateImage(zone)?.img||null;}
function preloadTemplates(){product.zones.forEach(z=>ensureTemplateImage(z));}

function buildTemplateMask(img){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const src=document.createElement('canvas');src.width=w;src.height=h;
  const sx=src.getContext('2d',{willReadFrequently:true});sx.drawImage(img,0,0,w,h);
  const pixels=sx.getImageData(0,0,w,h).data;
  const blocked=new Uint8Array(w*h),outside=new Uint8Array(w*h),queue=new Int32Array(w*h);
  const cut=document.createElement('canvas');cut.width=w;cut.height=h;
  const cx=cut.getContext('2d'),cutData=cx.createImageData(w,h);

  for(let i=0,p=0;i<pixels.length;i+=4,p++){
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3],lum=(r+g+b)/3;
    const redInk=a>15&&r>170&&g<145&&b<145&&r>g*1.35;
    blocked[p]=(a>15&&(lum<232||redInk))?1:0;
    if(redInk){
      cutData.data[i]=235;
      cutData.data[i+1]=35;
      cutData.data[i+2]=45;
      cutData.data[i+3]=255;
    }
  }
  cx.putImageData(cutData,0,0);

  let head=0,tail=0;
  const push=idx=>{if(idx<0||idx>=outside.length||outside[idx]||blocked[idx])return;outside[idx]=1;queue[tail++]=idx;};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(head<tail){
    const idx=queue[head++],x=idx%w,y=(idx/w)|0;
    if(x>0)push(idx-1);if(x<w-1)push(idx+1);if(y>0)push(idx-w);if(y<h-1)push(idx+w);
  }

  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const mx=mask.getContext('2d'),out=mx.createImageData(w,h);
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const idx=y*w+x,o=idx*4;
    if(!outside[idx]){
      out.data[o]=255;out.data[o+1]=255;out.data[o+2]=255;out.data[o+3]=255;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
  }
  if(maxX<minX||maxY<minY){
    minX=0;minY=0;maxX=w-1;maxY=h-1;mx.fillStyle='#fff';mx.fillRect(0,0,w,h);
  }else{
    mx.putImageData(out,0,0);
  }
  return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
}
function scaleBounds(b,sw,sh,dw,dh){return{x:b.x/sw*dw,y:b.y/sh*dh,w:b.w/sw*dw,h:b.h/sh*dh};}
function drawLayerStack(c,zone,b){
  const z=zoneState(zone);c.fillStyle=z.background||'#FFFFFF';c.fillRect(b.x,b.y,b.w,b.h);
  (z.layers||[]).forEach(l=>{if(l.visible===false)return;c.save();const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);
    if(l.type==='image'&&l.image){const base=Math.max(b.w/l.image.width,b.h/l.image.height),scale=base*(l.scale||1),iw=l.image.width*scale,ih=l.image.height*scale;c.drawImage(l.image,-iw/2,-ih/2,iw,ih);}
    else if(l.type==='text'){const fs=Math.max(24,b.w*.10*(l.scale||1));c.fillStyle=l.color||'#111';c.font=`800 ${fs}px Inter, sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(l.text||'Text',0,0,b.w*.84);}c.restore();});
}
function renderMaskedZoneCanvas(zone,w,h,includeGuide=false){
  const out=document.createElement('canvas');out.width=w;out.height=h;const ox=out.getContext('2d'),rec=ensureTemplateImage(zone),t=product.templates?.[zone];
  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,b=scaleBounds(rec.bounds,sw,sh,w,h);drawLayerStack(ox,zone,b);ox.globalCompositeOperation='destination-in';ox.drawImage(rec.maskCanvas,0,0,w,h);ox.globalCompositeOperation='source-over';if(includeGuide){ox.save();ox.globalAlpha=.72;ox.globalCompositeOperation='multiply';ox.drawImage(rec.img,0,0,w,h);ox.restore();}return out;}
  if(t?.shape==='rectangle'||!t?.path){drawLayerStack(ox,zone,{x:0,y:0,w,h});return out;}
  ox.save();traceZonePath(ox,zone,w,h);ox.clip();drawLayerStack(ox,zone,{x:0,y:0,w,h});ox.restore();return out;
}
function zoneDesignAspect(zone){const rec=ensureTemplateImage(zone),t=product.templates?.[zone];if(rec?.bounds)return rec.bounds.w/Math.max(1,rec.bounds.h);if(t?.width&&t?.height)return t.width/t.height;return 1;}
function makeCleanZoneDesignCanvas(zone,maxSide=1600){const ratio=zoneDesignAspect(zone);let w,h;if(ratio>=1){w=maxSide;h=Math.max(256,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(256,Math.round(maxSide*ratio));}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';drawLayerStack(x,zone,{x:0,y:0,w,h});return c;}

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
function drawProductionZone(c,zone,w,h){c.clearRect(0,0,w,h);const masked=renderMaskedZoneCanvas(zone,w,h,false);c.drawImage(masked,0,0,w,h);}


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
  const r=editorRect(activeZone,w,h),rec=ensureTemplateImage(activeZone);
  targetCtx.save();
  targetCtx.clearRect(0,0,w,h);
  targetCtx.translate(w/2,h/2);
  targetCtx.scale(editorZoom,editorZoom);
  targetCtx.translate(-w/2,-h/2);
  if(showGrid&&includeGuides)drawGridLines(targetCtx,r);

  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){
    const source=renderMaskedZoneCanvas(activeZone,rec.img.naturalWidth||rec.img.width,rec.img.naturalHeight||rec.img.height,false);
    targetCtx.drawImage(source,r.x,r.y,r.w,r.h);

    // Keep the familiar product-template details faint, but do not rely on
    // multiply blending for the red production seam lines.
    targetCtx.save();
    targetCtx.globalAlpha=.34;
    targetCtx.globalCompositeOperation='multiply';
    targetCtx.drawImage(rec.img,r.x,r.y,r.w,r.h);
    targetCtx.restore();

    // Production cut/sew lines are always drawn last in true red so they stay
    // visible over black, white, artwork or any other customer background.
    if(rec.cutlineCanvas){
      targetCtx.save();
      targetCtx.globalAlpha=1;
      targetCtx.globalCompositeOperation='source-over';
      targetCtx.drawImage(rec.cutlineCanvas,r.x,r.y,r.w,r.h);
      targetCtx.restore();
    }
  }else{
    targetCtx.save();
    targetCtx.translate(r.x,r.y);
    traceZonePath(targetCtx,activeZone,r.w,r.h);
    targetCtx.clip();
    drawLayerStack(targetCtx,activeZone,{x:0,y:0,w:r.w,h:r.h});
    targetCtx.restore();
    // Fallback red guide for zones without a production-template bitmap.
    targetCtx.save();
    targetCtx.translate(r.x,r.y);
    targetCtx.setLineDash([12,9]);
    targetCtx.strokeStyle='#EB232D';
    targetCtx.lineWidth=2;
    traceZonePath(targetCtx,activeZone,r.w,r.h);
    targetCtx.stroke();
    targetCtx.restore();
  }
  targetCtx.restore();
}
function drawEditor(){ctx.clearRect(0,0,editorCanvas.width,editorCanvas.height);drawZoneComposite(ctx,editorCanvas.width,editorCanvas.height,true);}
function makeZoneTextureCanvas(zone){return makeCleanZoneDesignCanvas(zone,1600);}
function zoneHasContent(zone){const z=stateFor().zones[zone];return z&&((z.background||'#FFFFFF').toUpperCase()!=='#FFFFFF'||(z.layers||[]).length);}

function renderProducts(){const sel=$('productSelect');sel.innerHTML='';catalog.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — $${Number(p.price).toFixed(2)}`;sel.appendChild(o);});sel.value=product.id;}
function zoneIconLabel(z){if(z==='Front')return'▰\nFront';if(z==='Back')return'▱\nBack';if(z.includes('Sleeve'))return'▭\n'+(z.startsWith('Left')?'L Sleeve':'R Sleeve');if(z==='Collar')return'⌒\nCollar';if(z==='Hood')return'◠\nHood';return z;}
function renderZones(){const rail=$('zoneRail');rail.innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone-icon'+(z===activeZone?' active':'');b.innerHTML=escapeHtml(zoneIconLabel(z)).replace('\n','<br>');b.onclick=()=>selectZone(z);rail.appendChild(b);});}
function renderLayerPanel(){const wrap=$('layers'),empty=$('emptyLayers'),controlsEl=$('layerControls');wrap.innerHTML='';const arr=zoneState().layers;empty.classList.toggle('hidden',arr.length>0);arr.forEach(l=>{const d=document.createElement('div');d.className='layer'+(l.id===activeLayerId?' active':'');d.innerHTML=`<div class="layer-head"><div><div class="layer-name">${escapeHtml(l.label)}</div><div class="layer-meta">${escapeHtml(activeZone)} · ${l.type==='image'?'Image':'Text'}${l.visible===false?' · hidden':''}</div></div><span>${l.type==='image'?'▧':'T'}</span></div>`;d.onclick=()=>{activeLayerId=l.id;renderLayerPanel();};wrap.appendChild(d);});const l=activeLayer();controlsEl.classList.toggle('hidden',!l);if(!l)return;$('selectedLayerLabel').textContent=l.label;$('layerX').value=l.x||0;$('layerY').value=l.y||0;$('layerScale').value=Math.round((l.scale||1)*100);$('layerRotation').value=l.rotation||0;$('layerXVal').textContent=l.x||0;$('layerYVal').textContent=l.y||0;$('layerScaleVal').textContent=Math.round((l.scale||1)*100);$('layerRotationVal').textContent=(l.rotation||0)+'°';$('toggleLayer').textContent=l.visible===false?'Show':'Hide';}
function renderStatus(){const t=templateFor();$('zoneName').textContent=activeZone;$('zoneSize').textContent=t?.width&&t?.height?`${t.width.toLocaleString()} × ${t.height.toLocaleString()} px`:'Custom zone';$('statusProduct').textContent=product.name;$('statusZone').textContent=activeZone;$('statusLayers').textContent=zoneState().layers.length;const c=zoneState().background||'#FFFFFF';$('zoneColor').value=c.toLowerCase();$('zoneHex').value=c;}
function renderAll(){renderProducts();renderZones();renderLayerPanel();renderStatus();drawEditor();rebuildGarmentPreview();}


function findPrimaryMesh(root=garment){let best=null,score=-1;root?.traverse(o=>{if(!o.isMesh||!o.geometry?.getAttribute('position'))return;const count=o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count;if(count>score){score=count;best=o;}});return best;}
function classifyTshirtTriangle(cx,cy,cz,b){
  const sx=Math.max(1e-6,b.max.x-b.min.x),sy=Math.max(1e-6,b.max.y-b.min.y),sz=Math.max(1e-6,b.max.z-b.min.z);
  const centerX=(b.min.x+b.max.x)/2,centerZ=(b.min.z+b.max.z)/2;
  const xn=Math.abs(cx-centerX)/(sx/2),yn=(cy-b.min.y)/sy,zn=(cz-centerZ)/(sz/2);

  // The collar is a narrow ring at the very top of the garment.  The old
  // rectangular test (yn>.86 && xn<.36) swallowed a large block of upper
  // chest geometry, creating the white band below the collar.  Restrict it
  // to the actual neck-ring neighborhood so Front reaches the collar seam.
  const neckRing=(xn/.30)*(xn/.30)+(zn/.46)*(zn/.46);
  if(yn>.925&&xn<.34&&neckRing>.18&&neckRing<1.72)return'Collar';

  // Zone names are from the wearer's perspective.  When the garment faces
  // the camera, the wearer's RIGHT sleeve is on screen-left (negative X).
  if(xn>.56&&yn>.52)return cx<centerX?'Right Sleeve':'Left Sleeve';

  return zn>=0?'Front':'Back';
}
function uvForZone(zone,x,y,z,b){const sx=Math.max(1e-6,b.max.x-b.min.x),sy=Math.max(1e-6,b.max.y-b.min.y);let u=.5,v=.5;if(zone==='Front'||zone==='Back'){u=(x-b.min.x)/sx;v=(y-b.min.y)/sy;if(zone==='Back')u=1-u;}else if(zone==='Left Sleeve'||zone==='Right Sleeve'){const left=zone==='Left Sleeve',shoulder={x:left?-.36:.36,y:.66},cuff={x:left?-.64:.64,y:.28},dx=cuff.x-shoulder.x,dy=cuff.y-shoulder.y,len2=dx*dx+dy*dy,px=x-shoulder.x,py=y-shoulder.y,along=Math.max(0,Math.min(1,(px*dx+py*dy)/len2)),len=Math.sqrt(len2),perp=(-dy/len)*px+(dx/len)*py,angle=Math.atan2(z,perp);u=(angle+Math.PI)/(Math.PI*2);v=1-along;}else if(zone==='Collar'){u=(Math.atan2(z,x)+Math.PI)/(Math.PI*2);v=(y-b.min.y)/sy;}return[Math.max(0,Math.min(1,u)),Math.max(0,Math.min(1,v))];}
function splitTshirtGeometry(sourceMesh){
  const geometry=sourceMesh.geometry;if(!geometry?.getAttribute('position'))return false;if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index,triCount=index?index.count/3:pos.count/3;geometry.computeBoundingBox();const bb=geometry.boundingBox.clone(),names=['Front','Back','Left Sleeve','Right Sleeve','Collar'],zoneIndex=new Map(names.map((n,i)=>[n,i])),faces=names.map(()=>[]),bounds=names.map(()=>({min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}})),vid=(t,k)=>index?index.getX(t*3+k):t*3+k;
  for(let t=0;t<triCount;t++){const a=vid(t,0),b=vid(t,1),c=vid(t,2),cx=(pos.getX(a)+pos.getX(b)+pos.getX(c))/3,cy=(pos.getY(a)+pos.getY(b)+pos.getY(c))/3,cz=(pos.getZ(a)+pos.getZ(b)+pos.getZ(c))/3,name=classifyTshirtTriangle(cx,cy,cz,bb),zi=zoneIndex.get(name);faces[zi].push(t);const zb=bounds[zi];for(const vi of[a,b,c]){const x=pos.getX(vi),y=pos.getY(vi),z=pos.getZ(vi);zb.min.x=Math.min(zb.min.x,x);zb.min.y=Math.min(zb.min.y,y);zb.min.z=Math.min(zb.min.z,z);zb.max.x=Math.max(zb.max.x,x);zb.max.y=Math.max(zb.max.y,y);zb.max.z=Math.max(zb.max.z,z);}}
  const parent=sourceMesh.parent;if(!parent)return false;tshirtZoneGroup=new THREE.Group();tshirtZoneGroup.name='MQD_Tshirt_Zones';tshirtZoneGroup.position.copy(sourceMesh.position);tshirtZoneGroup.quaternion.copy(sourceMesh.quaternion);tshirtZoneGroup.scale.copy(sourceMesh.scale);parent.add(tshirtZoneGroup);const base=Array.isArray(sourceMesh.material)?sourceMesh.material[0]:sourceMesh.material;
  names.forEach((name,zi)=>{const remap=new Int32Array(pos.count);remap.fill(-1);const P=[],N=[],UV=[],I=[];let next=0,zb=bounds[zi];for(const t of faces[zi])for(let k=0;k<3;k++){const old=vid(t,k);let ni=remap[old];if(ni<0){ni=next++;remap[old]=ni;const x=pos.getX(old),y=pos.getY(old),z=pos.getZ(old);P.push(x,y,z);N.push(normal.getX(old),normal.getY(old),normal.getZ(old));const uv=uvForZone(name,x,y,z,zb);UV.push(uv[0],uv[1]);}I.push(ni);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));g.setIndex(I);g.computeBoundingBox();g.computeBoundingSphere();const m=base?.clone?base.clone():new THREE.MeshStandardMaterial({roughness:.88,metalness:0});if(m.color)m.color.set('#fff');for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in m)m[key]=null;if('roughness'in m)m.roughness=.88;if('metalness'in m)m.metalness=0;m.needsUpdate=true;const mesh=new THREE.Mesh(g,m);mesh.name='MQD_'+name.replace(/\s+/g,'_');mesh.castShadow=sourceMesh.castShadow;mesh.receiveShadow=sourceMesh.receiveShadow;tshirtZoneGroup.add(mesh);tshirtZoneMeshes.set(name,mesh);});sourceMesh.visible=false;console.info('MQD stable UV material zones ready',Object.fromEntries([...tshirtZoneMeshes].map(([k,v])=>[k,v.geometry.index.count/3])));return tshirtZoneMeshes.size===5;
}
function disposeZoneTexture(mesh){const map=mesh?.material?.map;if(map){mesh.material.map=null;map.dispose();}}
function updateTshirtZoneTextures(){if(product.id!=='tshirt'||!tshirtZoneMeshes.size)return false;product.zones.forEach(zone=>{const mesh=tshirtZoneMeshes.get(zone);if(!mesh)return;disposeZoneTexture(mesh);const canvas=makeCleanZoneDesignCanvas(zone,1600),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;mesh.material.map=tex;if(mesh.material.color)mesh.material.color.set('#fff');mesh.material.needsUpdate=true;});return true;}
function findLargestMesh(){let best=null,score=-1;garment?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),v=s.x*s.y*s.z;if(v>score){score=v;best=o;}});return best;}
function rebuildDecals(){if(!garment||!decalGroup)return;clearDecals();const target=findLargestMesh();if(!target)return;product.zones.forEach(zone=>{if(!zoneHasContent(zone))return;const canvas=makeZoneTextureCanvas(zone),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const q=zonePlacement(zone);try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;decalGroup.add(mesh);}catch(e){console.warn('Decal failed',zone,e);}});}
function rebuildGarmentPreview(){if(product.id==='tshirt'&&tshirtZoneMeshes.size){clearDecals();updateTshirtZoneTextures();return;}rebuildDecals();}

function loadGarment(){if(!renderer)init3D();if(garment){scene.remove(garment);garment.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose?.();m.dispose?.();});});garment=null;}tshirtZoneMeshes.clear();tshirtZoneGroup=null;clearDecals();preloadTemplates();new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});if(product.id==='tshirt'){const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);}rebuildGarmentPreview();},undefined,e=>console.error(e));}

function selectProduct(id){product=catalog.find(p=>p.id===id)||catalog[0];activeZone=product.zones[0];activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;preloadTemplates();renderAll();loadGarment();}
function selectZone(z){activeZone=z;activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;ensureTemplateImage(z);renderAll();}
function nextLabel(){return `Layer ${zoneState().layers.length+1}`;}
function addImage(src){const img=new Image();img.onload=()=>{snapshot();const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),src,image:img,x:0,y:0,scale:1,rotation:0,visible:true};zoneState().layers.push(l);activeLayerId=l.id;renderAll();};img.src=src;}
function addText(){const text=prompt('Text to add');if(!text)return;snapshot();const l={id:'layer-'+layerSeq++,type:'text',label:nextLabel(),text,x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111'};zoneState().layers.push(l);activeLayerId=l.id;renderAll();}
function updateLayer(prop,val){const l=activeLayer();if(!l)return;l[prop]=val;renderLayerPanel();drawEditor();rebuildGarmentPreview();}
function setBackground(hex,record=true){const v=normalizeHex(hex);if(!v)return;if(record)snapshot();zoneState().background=v;renderStatus();drawEditor();rebuildGarmentPreview();}
function applyBackgroundAll(){const c=normalizeHex($('zoneHex').value);if(!c)return;snapshot();product.zones.forEach(z=>{const old=activeZone;activeZone=z;zoneState().background=c;activeZone=old;});renderAll();}

$('productSelect').onchange=e=>selectProduct(e.target.value);$('addImageBtn').onclick=()=>$('artUpload').click();$('artUpload').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>addImage(rd.result);rd.readAsDataURL(f);e.target.value='';};$('addTextBtn').onclick=addText;$('zoneColor').oninput=e=>{const v=e.target.value.toUpperCase();$('zoneHex').value=v;cancelAnimationFrame(colorRaf);colorRaf=requestAnimationFrame(()=>setBackground(v,false));};$('zoneColor').onchange=e=>setBackground(e.target.value.toUpperCase(),false);$('zoneHex').onchange=e=>{const v=normalizeHex(e.target.value);if(v)setBackground(v);else renderStatus();};$('applyAll').onclick=applyBackgroundAll;
[['layerX','x',Number],['layerY','y',Number],['layerScale','scale',v=>Number(v)/100],['layerRotation','rotation',Number]].forEach(([id,p,fn])=>$(id).oninput=e=>updateLayer(p,fn(e.target.value)));
$('fillLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.x=0;l.y=0;l.scale=1;l.rotation=0;renderAll();};$('toggleLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.visible=l.visible===false;renderAll();};$('deleteLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();const arr=zoneState().layers;arr.splice(arr.findIndex(x=>x.id===l.id),1);activeLayerId=arr.at(-1)?.id||null;renderAll();};$('undo').onclick=undo;$('redo').onclick=redo;$('gridToggle').onclick=()=>{showGrid=!showGrid;drawEditor();};$('zoomIn').onclick=()=>{editorZoom=Math.min(1.6,editorZoom+.1);drawEditor();};$('zoomOut').onclick=()=>{editorZoom=Math.max(.6,editorZoom-.1);drawEditor();};

function pointerToCanvas(e){const r=editorCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*editorCanvas.width/r.width,y:(e.clientY-r.top)*editorCanvas.height/r.height};}
editorCanvas.addEventListener('pointerdown',e=>{const l=activeLayer();if(!l)return;snapshot();const p=pointerToCanvas(e);dragState={start:p,x:l.x||0,y:l.y||0};editorCanvas.setPointerCapture(e.pointerId);editorCanvas.classList.add('dragging');});editorCanvas.addEventListener('pointermove',e=>{if(!dragState)return;const l=activeLayer();if(!l)return;const p=pointerToCanvas(e),r=editorRect(),dx=(p.x-dragState.start.x)/Math.max(1,r.w)*200,dy=(p.y-dragState.start.y)/Math.max(1,r.h)*200;l.x=Math.max(-100,Math.min(100,dragState.x+dx));l.y=Math.max(-100,Math.min(100,dragState.y+dy));drawEditor();renderLayerPanel();rebuildGarmentPreview();});editorCanvas.addEventListener('pointerup',e=>{dragState=null;editorCanvas.releasePointerCapture(e.pointerId);editorCanvas.classList.remove('dragging');});

function designJSON(){const clean=JSON.parse(JSON.stringify(designs,(k,v)=>k==='image'?undefined:v));return{product:{id:product.id,name:product.name,category:product.category,price:product.price},activeZone,design:clean[product.id]||{},createdAt:new Date().toISOString()};}
$('saveDesign').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(designJSON(),null,2)],{type:'application/json'}));a.download=product.id+'-design.json';a.click();};
function dataUrlBlob(dataUrl){const [h,b]=dataUrl.split(','),bin=atob(b),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:h.match(/data:(.*?);/)[1]});}
$('downloadPack').onclick=async()=>{const zip=new JSZip(),root=zip.folder(product.id+'-production'),old=activeZone;for(const z of product.zones){activeZone=z;const t=templateFor(z),w=t?.width||2048,h=t?.height||2048,c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),oldZoom=editorZoom;editorZoom=1;drawProductionZone(x,z,w,h);editorZoom=oldZoom;root.file(`zones/${z.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,dataUrlBlob(c.toDataURL('image/png')));if(t?.path){try{const r=await fetch(t.path);if(r.ok)root.file(`template-references/${z.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`,await r.blob());}catch{}}}activeZone=old;root.file('design.json',JSON.stringify(designJSON(),null,2));try{const r=await fetch(product.model);if(r.ok)root.file(product.id+'.glb',await r.blob());}catch{}const blob=await zip.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=product.id+'-production.zip';a.click();renderAll();};

function renderAdmin(){const list=$('adminList');list.innerHTML='';catalog.forEach(p=>{const d=document.createElement('div');d.className='product-row';d.innerHTML=`<div><strong>${escapeHtml(p.name)}</strong><div class="subtle">${escapeHtml(p.category)} · $${Number(p.price).toFixed(2)}</div></div><button class="btn">Edit</button>`;d.querySelector('button').onclick=()=>loadAdmin(p.id);list.appendChild(d);});}
function loadAdmin(id){const p=catalog.find(x=>x.id===id);if(!p)return;$('adminName').value=p.name;$('adminCategory').value=p.category;$('adminPrice').value=p.price;$('adminZones').innerHTML='';p.zones.forEach(z=>{const s=document.createElement('span');s.className='chip';s.textContent=z;$('adminZones').appendChild(s);});$('saveProductAdmin').dataset.id=id;}
$('openAdmin').onclick=()=>{$('adminOverlay').classList.remove('hidden');renderAdmin();loadAdmin(product.id);};$('closeAdmin').onclick=()=>$('adminOverlay').classList.add('hidden');$('adminOverlay').onclick=e=>{if(e.target===$('adminOverlay'))$('adminOverlay').classList.add('hidden');};$('saveProductAdmin').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;p.name=$('adminName').value.trim()||p.name;p.category=$('adminCategory').value.trim()||p.category;p.price=Number($('adminPrice').value)||p.price;localStorage.setItem('mqd-catalog',JSON.stringify(catalog));if(p.id===product.id)product=p;renderProducts();renderAdmin();alert('Product saved.');};$('addZone').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;const z=prompt('Zone name');if(!z)return;p.zones.push(z.trim());localStorage.setItem('mqd-catalog',JSON.stringify(catalog));loadAdmin(p.id);if(p.id===product.id){product=p;renderAll();}};

renderProducts();renderAll();init3D();loadGarment();
