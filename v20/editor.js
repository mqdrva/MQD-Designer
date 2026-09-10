import {partitionLongSleeveTriangle,longSleevePanelUv} from './long-sleeve-panels.js';
import {partitionLongSleevePoloTriangle} from './long-sleeve-polo-panels.js';
import {panelNames, partitionTriangle, partitionBodyTriangle, panelUv} from './panels.js';
import {TSHIRT_FACE_COUNT,isTshirtCollarFace} from './tshirt-collar-mask.js';
import {POLO_FACE_COUNT,isPoloCollarFace} from './polo-collar-mask.js';

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
const ownerMode=new URLSearchParams(location.search).get('owner')==='1';
document.body.classList.toggle('owner-mode',ownerMode);
let catalog=JSON.parse(localStorage.getItem('mqd-catalog')||'null')||seed;
let product=catalog[0],activeZone=product.zones[0],activeLayerId=null,layerSeq=1;
const designs={};
const history=[],future=[];
let scene,camera,renderer,controls,garment=null,decalGroup=null,editorZoom=1,showGrid=true,dragState=null,cropMode=false;
let tshirtZoneGroup=null;
const tshirtZoneMeshes=new Map();
const MQD_TSHIRT_ZONE_CALIBRATION='v25-exact-collar-topology';
// LOCKED after renderer regression: do not alter the T-shirt GLB load/split path while adding editor UI features.
const MQD_TSHIRT_RENDERER_LOCK='stable-v1';
// LOCKED: 3D T-shirt zone textures must stay in the stable rectangular UV frame.
// 2D template clipping/cropping is editor-only and must not redefine the 3D UV texture frame.
const MQD_TSHIRT_TEXTURE_FRAME_LOCK='stable-a8bc447';
// Short Sleeve Polo Phase 1: use the proven short-sleeve isolated five-panel renderer.
// T-shirt and Long Sleeve T-shirt branches above remain unchanged/frozen.
const MQD_SHORT_SLEEVE_POLO_CALIBRATION='isolated-short-sleeve-exact-collar-v3-back-artwork-alignment';
// Long Sleeve Polo Phase 1: inherit the frozen long-sleeve isolation logic.
const MQD_LONG_SLEEVE_POLO_CALIBRATION='isolated-long-sleeve-polo-v2-exclusive-zones';
let colorRaf=0;
let previewUpdateTimer=0;
function scheduleGarmentPreview(delay=110){
  clearTimeout(previewUpdateTimer);
  previewUpdateTimer=setTimeout(()=>{previewUpdateTimer=0;rebuildGarmentPreview();},delay);
}
const templateCache=new Map();
const editorCanvas=$('editorCanvas'),ctx=editorCanvas.getContext('2d');
const TEXT_FONTS=['Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Oswald','Raleway','Merriweather','Playfair Display','Nunito','Ubuntu','PT Sans','Source Sans 3','Noto Sans','Noto Serif','Rubik','Work Sans','DM Sans','Manrope','Bebas Neue','Anton','Archivo','Cabin','Karla','Mulish','Quicksand','Fira Sans','Hind','Arvo','Bitter','Libre Baskerville','Libre Franklin','Josefin Sans','Exo 2','Barlow','Barlow Condensed','Fjalla One','Titillium Web','Yanone Kaffeesatz','Abril Fatface','Lobster','Pacifico','Dancing Script','Permanent Marker','Caveat','Cinzel','Cormorant Garamond','Space Grotesk','League Spartan'];

function stateFor(pid=product.id){if(!designs[pid])designs[pid]={zones:{}};return designs[pid];}
function zoneState(zone=activeZone){const s=stateFor();if(!s.zones[zone])s.zones[zone]={background:'#FFFFFF',layers:[]};return s.zones[zone];}
function activeLayer(){return zoneState().layers.find(l=>l.id===activeLayerId)||null;}
function templateFor(zone=activeZone){return product.templates?.[zone]||null;}
function normalizeHex(v){v=String(v||'').trim().toUpperCase();if(!v.startsWith('#'))v='#'+v;return /^#[0-9A-F]{6}$/.test(v)?v:null;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cloneDesignState(source=designs){
  const out={};
  for(const [pid,ps] of Object.entries(source||{})){
    out[pid]={...ps,zones:{}};
    for(const [zone,z] of Object.entries(ps.zones||{})){
      out[pid].zones[zone]={...z,layers:(z.layers||[]).map(l=>({...l,crop:l.crop?{...l.crop}:l.crop,image:l.image||null}))};
    }
  }
  return out;
}
function restoreDesignState(state){
  Object.keys(designs).forEach(k=>delete designs[k]);
  Object.assign(designs,cloneDesignState(state));
  if(activeLayerId&&!activeLayer())activeLayerId=zoneState().layers.at(-1)?.id||null;
}
function snapshot(){history.push(cloneDesignState());if(history.length>30)history.shift();future.length=0;}
function undo(){if(!history.length)return;future.push(cloneDesignState());restoreDesignState(history.pop());renderAll();}
function redo(){if(!future.length)return;history.push(cloneDesignState());restoreDesignState(future.pop());renderAll();}
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
      const built=buildTemplateMask(img,zone);
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

function buildTemplateMask(img,zone=null){
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

    // Any strong template ink counts as a possible outline candidate.
    blocked[p]=(a>15&&(lum<245||redInk))?1:0;

    if(redInk){
      cutData.data[i]=235;
      cutData.data[i+1]=35;
      cutData.data[i+2]=45;
      cutData.data[i+3]=255;
    }
  }
  cx.putImageData(cutData,0,0);

  // Long Sleeve Polo Back and long sleeves: derive the fill only from the true red
  // production outline. Dilate dashed cutlines just enough to close dash gaps, then
  // flood-fill from the outside. This keeps helper graphics out of the fill mask and
  // makes each selected background color fill the complete production silhouette.
  if(product.id==='long-sleeve-polo'&&['Back','Left Sleeve','Right Sleeve'].includes(zone)){
    let barrier=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a>15&&r>170&&g<145&&b<145&&r>g*1.35)barrier[y*w+x]=1;
    }
    const passes=Math.max(18,Math.min(42,Math.round(Math.min(w,h)*.008)));
    for(let pass=0;pass<passes;pass++){
      const next=barrier.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const idx=y*w+x;
        if(barrier[idx])continue;
        if(barrier[idx-1]||barrier[idx+1]||barrier[idx-w]||barrier[idx+w]||
           barrier[idx-w-1]||barrier[idx-w+1]||barrier[idx+w-1]||barrier[idx+w+1])next[idx]=1;
      }
      barrier=next;
    }
    const outSide=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
    const push=idx=>{if(idx<0||idx>=outSide.length||outSide[idx]||barrier[idx])return;outSide[idx]=1;q[tail++]=idx;};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){const idx=q[head++],x=idx%w,y=(idx/w)|0;if(x>0)push(idx-1);if(x<w-1)push(idx+1);if(y>0)push(idx-w);if(y<h-1)push(idx+w);}
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d'),out=mx.createImageData(w,h);let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const idx=y*w+x,o=idx*4;if(!outSide[idx]){out.data[o]=255;out.data[o+1]=255;out.data[o+2]=255;out.data[o+3]=255;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
    if(maxX<minX||maxY<minY){minX=0;minY=0;maxX=w-1;maxY=h-1;mx.fillStyle='#fff';mx.fillRect(0,0,w,h);}else mx.putImageData(out,0,0);
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
  }

  // Keep the Short Sleeve Polo Back exactly on its previously approved mask.
  // The newer silhouette-fill logic remains active for the zones that needed it.
  if(product.id==='short-sleeve-polo'&&zone==='Back'){
    let head=0,tail=0;
    const push=idx=>{if(idx<0||idx>=outside.length||outside[idx]||blocked[idx])return;outside[idx]=1;queue[tail++]=idx;};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){
      const idx=queue[head++],x=idx%w,y=(idx/w)|0;
      if(x>0)push(idx-1);
      if(x<w-1)push(idx+1);
      if(y>0)push(idx-w);
      if(y<h-1)push(idx+w);
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

  // Build the fill mask from the LARGEST connected outline component.
  // That gives us the sleeve/body silhouette instead of the helper text.
  const barrier=new Uint8Array(w*h);
  const seen=new Uint8Array(w*h);
  const componentQueue=new Int32Array(w*h);
  let largest=[];

  const neighbors=(idx)=>{
    const x=idx%w,y=(idx/w)|0,arr=[];
    for(let dy=-1;dy<=1;dy++){
      for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;
        const nx=x+dx,ny=y+dy;
        if(nx<0||ny<0||nx>=w||ny>=h)continue;
        arr.push(ny*w+nx);
      }
    }
    return arr;
  };

  for(let i=0;i<blocked.length;i++){
    if(!blocked[i]||seen[i])continue;
    let head=0,tail=0;
    const points=[];
    seen[i]=1;
    componentQueue[tail++]=i;

    while(head<tail){
      const idx=componentQueue[head++];
      points.push(idx);
      for(const n of neighbors(idx)){
        if(blocked[n]&&!seen[n]){
          seen[n]=1;
          componentQueue[tail++]=n;
        }
      }
    }

    if(points.length>largest.length)largest=points;
  }

  largest.forEach(idx=>{barrier[idx]=1;});

  // Close outline gaps so the silhouette becomes one closed printable shape.
  const closePasses=Math.max(8,Math.min(18,Math.round(Math.min(w,h)*0.03)));
  for(let pass=0;pass<closePasses;pass++){
    const next=barrier.slice();
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
      const idx=y*w+x;
      if(barrier[idx])continue;
      let count=0;
      if(barrier[idx-1])count++;
      if(barrier[idx+1])count++;
      if(barrier[idx-w])count++;
      if(barrier[idx+w])count++;
      if(barrier[idx-w-1])count++;
      if(barrier[idx-w+1])count++;
      if(barrier[idx+w-1])count++;
      if(barrier[idx+w+1])count++;
      if(count>=3)next[idx]=1;
    }
    barrier.set(next);
  }

  let head=0,tail=0;
  const push=idx=>{if(idx<0||idx>=outside.length||outside[idx]||barrier[idx])return;outside[idx]=1;queue[tail++]=idx;};
  for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
  for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
  while(head<tail){
    const idx=queue[head++],x=idx%w,y=(idx/w)|0;
    if(x>0)push(idx-1);
    if(x<w-1)push(idx+1);
    if(y>0)push(idx-w);
    if(y<h-1)push(idx+w);
  }

  const mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const mx=mask.getContext('2d'),out=mx.createImageData(w,h);
  let minX=w,minY=h,maxX=-1,maxY=-1;

  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const idx=y*w+x,o=idx*4;
    if(!outside[idx]){
      out.data[o]=255;
      out.data[o+1]=255;
      out.data[o+2]=255;
      out.data[o+3]=255;
      minX=Math.min(minX,x);
      minY=Math.min(minY,y);
      maxX=Math.max(maxX,x);
      maxY=Math.max(maxY,y);
    }
  }

  if(maxX<minX||maxY<minY){
    minX=0;minY=0;maxX=w-1;maxY=h-1;
    mx.fillStyle='#fff';
    mx.fillRect(0,0,w,h);
  }else{
    mx.putImageData(out,0,0);
  }

  return {
    maskCanvas:mask,
    cutlineCanvas:cut,
    bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}
  };
}
function scaleBounds(b,sw,sh,dw,dh){return{x:b.x/sw*dw,y:b.y/sh*dh,w:b.w/sw*dw,h:b.h/sh*dh};}
function drawImageLayer(c,l,b){
  if(!l.image)return;
  const crop=l.crop||{left:0,top:0,right:0,bottom:0};
  const left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
  const fullW=Math.max(1,l.image.width),fullH=Math.max(1,l.image.height);
  const sx=fullW*left,sy=fullH*top,sw=Math.max(1,fullW*(1-left-right)),sh=Math.max(1,fullH*(1-top-bottom));
  const base=Math.max(b.w/fullW,b.h/fullH),scale=base*(l.scale||1),iw=fullW*scale,ih=fullH*scale;
  const dx=-iw/2+iw*left,dy=-ih/2+ih*top,dw=iw*(1-left-right),dh=ih*(1-top-bottom);
  c.scale(l.flipX?-1:1,l.flipY?-1:1);
  c.drawImage(l.image,sx,sy,sw,sh,dx,dy,dw,dh);
}
function drawTextLayer(c,l,b){
  const fs=Math.max(18,b.w*.10*(l.scale||1));
  const font=l.font||'Inter',weight=l.bold===false?400:(l.weight||800),style=l.italic?'italic':'normal';
  c.font=`${style} ${weight} ${fs}px "${font}", sans-serif`;
  c.textAlign=l.align||'center';c.textBaseline='middle';
  if('letterSpacing' in c)c.letterSpacing=`${fs*((Number(l.letterSpacing)||0)/100)}px`;
  const text=l.text||'Text',maxWidth=b.w*.85,stroke=Math.max(0,Number(l.strokeWidth)||0);
  if(stroke>0){c.strokeStyle=l.strokeColor||'#FFFFFF';c.lineWidth=Math.max(1,fs*(stroke/100));c.lineJoin='round';c.strokeText(text,0,0,maxWidth);}
  c.fillStyle=l.color||'#111111';c.fillText(text,0,0,maxWidth);
}
function editorDesignBounds(zone,r,rec=ensureTemplateImage(zone)){
  let b={...r};
  if(rec?.img&&rec?.bounds){
    const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,sb=scaleBounds(rec.bounds,sw,sh,r.w,r.h);
    b={x:r.x+sb.x,y:r.y+sb.y,w:sb.w,h:sb.h};
  }
  return b;
}
function drawEditorTextOverlay(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec),z=zoneState(zone);
  (z.layers||[]).forEach(l=>{if(l.visible===false||l.type!=='text')return;c.save();const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);drawTextLayer(c,l,b);c.restore();});
}
function drawSafeAreaGuide(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec),ix=Math.max(9,b.w*.075),iy=Math.max(9,b.h*.075),x=b.x+ix,y=b.y+iy,w=Math.max(10,b.w-ix*2),h=Math.max(10,b.h-iy*2);
  c.save();c.strokeStyle='#FF8A00';c.lineWidth=2;c.setLineDash([9,7]);c.strokeRect(x,y,w,h);c.setLineDash([]);c.fillStyle='#B85F00';c.font='700 10px Inter, sans-serif';c.textAlign='left';c.textBaseline='top';c.fillText('SAFE AREA',x+5,y+5);c.restore();
}
function imageLayerEstimatedDpi(l,zone=activeZone){
  if(!l||l.type!=='image'||!l.image)return null;const t=product.templates?.[zone],rec=ensureTemplateImage(zone);let tw=t?.width||0,th=t?.height||0;
  if(rec?.bounds){tw=rec.bounds.w;th=rec.bounds.h;}if(!tw||!th)return null;
  const iw=Math.max(1,l.image.naturalWidth||l.image.width),ih=Math.max(1,l.image.naturalHeight||l.image.height),base=Math.max(tw/iw,th/ih)*Math.max(.01,Number(l.scale)||1);
  return 300/Math.max(.0001,base);
}
function zoneQuality(zone=activeZone){
  const z=zoneState(zone),images=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='image'&&l.image),texts=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='text');
  if(!images.length){if(texts.length)return{tone:'good',label:'Text quality ✓',note:'Text is rendered at the production template resolution.'};return{tone:'neutral',label:'No image to check',note:'Add an image to see estimated print resolution.'};}
  const values=images.map(l=>imageLayerEstimatedDpi(l,zone)).filter(Number.isFinite);if(!values.length)return{tone:'neutral',label:'Resolution unavailable',note:'Source pixel dimensions could not be read.'};
  const dpi=Math.round(Math.min(...values));if(dpi>=240)return{tone:'good',label:`≈ ${dpi} DPI ✓`,note:'Good print resolution at the current design size.'};if(dpi>=150)return{tone:'warn',label:`≈ ${dpi} DPI`,note:'Usable, but increasing the image size further may soften the print.'};return{tone:'bad',label:`≈ ${dpi} DPI ⚠`,note:'Low resolution — this image may print blurry at the current size.'};
}
function ensureCustomerUx(){
  if(!document.getElementById('mqdUxStyles')){const style=document.createElement('style');style.id='mqdUxStyles';style.textContent=`.zone-icon{position:relative}.zone-icon.complete::after{content:'✓';position:absolute;right:4px;top:4px;width:14px;height:14px;border-radius:50%;background:#18a558;color:#fff;font-size:9px;font-weight:900;display:grid;place-items:center;box-shadow:0 0 0 2px #fff}.guide-legend{font-size:9px;color:#777;text-align:center;margin-top:-2px;margin-bottom:7px}.guide-legend .cut{color:#EB232D;font-weight:800}.guide-legend .safe{color:#D66F00;font-weight:800}.quality-card{border:1px solid #e5e5e5;border-radius:8px;background:#fafafa;padding:9px;margin-top:8px}.quality-card .q-label{font-size:9px;color:#888}.quality-card .q-value{font-size:13px;font-weight:800;margin-top:3px}.quality-card .q-note{font-size:9px;color:#777;line-height:1.35;margin-top:3px}.quality-card.good .q-value{color:#157c3f}.quality-card.warn .q-value{color:#9a6100}.quality-card.bad .q-value{color:#b42318}`;document.head.appendChild(style);}
  if(!document.getElementById('guideLegend')){const title=document.querySelector('.zone-title');if(title){const d=document.createElement('div');d.id='guideLegend';d.className='guide-legend';d.innerHTML='<span class="cut">Red</span> = cut / bleed edge &nbsp;·&nbsp; <span class="safe">Orange</span> = keep important text & logos inside';title.insertAdjacentElement('afterend',d);}}
  if(!document.getElementById('printQualityCard')){const status=$('statusProduct')?.closest('.section');if(status){const d=document.createElement('div');d.id='printQualityCard';d.className='section quality-card neutral';d.innerHTML='<div class="q-label">Estimated print quality</div><div id="printQualityValue" class="q-value">—</div><div id="printQualityNote" class="q-note">Select or add artwork to check resolution.</div>';status.insertAdjacentElement('beforebegin',d);}}
}
function renderPrintQuality(){ensureCustomerUx();const q=zoneQuality(activeZone),card=$('printQualityCard'),value=$('printQualityValue'),note=$('printQualityNote');if(!card||!value||!note)return;card.classList.remove('good','warn','bad','neutral');card.classList.add(q.tone);value.textContent=q.label;note.textContent=q.note+' Estimated against a 300-DPI production target.';}

function drawLayerStack(c,zone,b){
  const z=zoneState(zone);c.fillStyle=z.background||'#FFFFFF';c.fillRect(b.x,b.y,b.w,b.h);
  (z.layers||[]).forEach(l=>{if(l.visible===false)return;c.save();const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);
    if(l.type==='image'&&l.image){drawImageLayer(c,l,b);}
    else if(l.type==='text'){drawTextLayer(c,l,b);}c.restore();});
}
function renderMaskedZoneCanvas(zone,w,h,includeGuide=false){
  const out=document.createElement('canvas');out.width=w;out.height=h;const ox=out.getContext('2d'),rec=ensureTemplateImage(zone),t=product.templates?.[zone];
  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,b=scaleBounds(rec.bounds,sw,sh,w,h);drawLayerStack(ox,zone,b);ox.globalCompositeOperation='destination-in';ox.drawImage(rec.maskCanvas,0,0,w,h);ox.globalCompositeOperation='source-over';if(includeGuide){ox.save();ox.globalAlpha=.72;ox.globalCompositeOperation='multiply';ox.drawImage(rec.img,0,0,w,h);ox.restore();}return out;}
  if(t?.shape==='rectangle'||!t?.path){drawLayerStack(ox,zone,{x:0,y:0,w,h});return out;}
  ox.save();traceZonePath(ox,zone,w,h);ox.clip();drawLayerStack(ox,zone,{x:0,y:0,w,h});ox.restore();return out;
}
function zoneDesignAspect(zone){const rec=ensureTemplateImage(zone),t=product.templates?.[zone];if(rec?.bounds)return rec.bounds.w/Math.max(1,rec.bounds.h);if(t?.width&&t?.height)return t.width/t.height;return 1;}
function makeCleanZoneDesignCanvas(zone,maxSide=1600){const ratio=zoneDesignAspect(zone);let w,h;if(ratio>=1){w=maxSide;h=Math.max(256,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(256,Math.round(maxSide*ratio));}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';drawLayerStack(x,zone,{x:0,y:0,w,h});return c;}
function makeCleanZoneArtworkCanvas(zone,maxSide=1600){const ratio=zoneDesignAspect(zone);let w,h;if(ratio>=1){w=maxSide;h=Math.max(256,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(256,Math.round(maxSide*ratio));}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';const z=zoneState(zone),b={x:0,y:0,w,h};(z.layers||[]).forEach(l=>{if(l.visible===false)return;x.save();const cx=b.w/2+(l.x||0)*b.w/200,cy=b.h/2+(l.y||0)*b.h/200;x.translate(cx,cy);x.rotate((l.rotation||0)*Math.PI/180);if(l.type==='image'&&l.image)drawImageLayer(x,l,b);else if(l.type==='text')drawTextLayer(x,l,b);x.restore();});return c;}

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
    if(l.type==='image'&&l.image){drawImageLayer(c,l,r);}
    else if(l.type==='text'){drawTextLayer(c,l,r);}c.restore();});
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
function traceLongSleevePoloSleeve2D(c,w,h){
  // 2D-only visual fill matching the Long Sleeve Polo sleeve cut silhouette.
  // This is deliberately separate from production/3D texture generation.
  c.beginPath();
  c.moveTo(w*.29,h*.92);
  c.lineTo(w*.17,h*.24);
  c.bezierCurveTo(w*.29,h*.22,w*.35,h*.07,w*.50,h*.065);
  c.bezierCurveTo(w*.65,h*.07,w*.71,h*.22,w*.83,h*.24);
  c.lineTo(w*.71,h*.92);
  c.closePath();
}
function drawZoneComposite(targetCtx,w,h,includeGuides=false){
  const r=editorRect(activeZone,w,h),rec=ensureTemplateImage(activeZone);
  targetCtx.save();
  targetCtx.clearRect(0,0,w,h);
  targetCtx.translate(w/2,h/2);
  targetCtx.scale(editorZoom,editorZoom);
  targetCtx.translate(-w/2,-h/2);
  if(showGrid&&includeGuides)drawGridLines(targetCtx,r);

  // Long Sleeve Polo sleeves: 2D editor background fill only.
  // Keep the approved 3D renderer and all production texture logic untouched.
  if(product.id==='long-sleeve-polo'&&['Left Sleeve','Right Sleeve'].includes(activeZone)){
    targetCtx.save();
    targetCtx.translate(r.x,r.y);
    traceLongSleevePoloSleeve2D(targetCtx,r.w,r.h);
    targetCtx.clip();
    targetCtx.fillStyle=zoneState(activeZone).background||'#FFFFFF';
    targetCtx.fillRect(0,0,r.w,r.h);
    targetCtx.restore();
  }

  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){
    const source=renderMaskedZoneCanvas(activeZone,rec.img.naturalWidth||rec.img.width,rec.img.naturalHeight||rec.img.height,false);
    targetCtx.drawImage(source,r.x,r.y,r.w,r.h);

    // Show the helper artwork only before the customer starts designing.
    // Once a zone has content, customer artwork/text gets visual priority.
    const solidBackground=(zoneState(activeZone).background||'#FFFFFF').toUpperCase()!=='#FFFFFF';
    if(!solidBackground&&!zoneHasContent(activeZone)){
      targetCtx.save();
      targetCtx.globalAlpha=.34;
      targetCtx.globalCompositeOperation='multiply';
      targetCtx.drawImage(rec.img,r.x,r.y,r.w,r.h);
      targetCtx.restore();
    }

    // The physical sleeve/collar masks can contain blank internal regions.
    // Redraw text in the editor design frame so it is always easy to see and edit,
    // while the 3D/production rendering remains unchanged.
    drawEditorTextOverlay(targetCtx,activeZone,r,rec);
    drawSafeAreaGuide(targetCtx,activeZone,r,rec);

    // Production cut/sew lines are always drawn last in true red so they stay
    // visible over black, white, artwork or any other customer background.
    if(rec.cutlineCanvas){
      targetCtx.save();
      targetCtx.globalAlpha=1;
      targetCtx.globalCompositeOperation='source-over';
      // Preserve true-red production cut/sew lines while keeping them readable over similar fill colors.
      targetCtx.shadowColor='rgba(255,255,255,.98)';
      targetCtx.shadowBlur=5;
      targetCtx.shadowOffsetX=0;
      targetCtx.shadowOffsetY=0;
      targetCtx.drawImage(rec.cutlineCanvas,r.x,r.y,r.w,r.h);
      targetCtx.shadowBlur=0;
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
function activeLayerScreenRect(){
  const l=activeLayer();if(!l)return null;const r=editorRect(),rec=ensureTemplateImage(activeZone);let b=r;
  if(rec?.img&&rec?.bounds){const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,sb=scaleBounds(rec.bounds,sw,sh,r.w,r.h);b={x:r.x+sb.x,y:r.y+sb.y,w:sb.w,h:sb.h};}
  const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;
  if(l.type==='image'&&l.image){
    const crop=l.crop||{left:0,top:0,right:0,bottom:0},left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
    const fullW=Math.max(1,l.image.width),fullH=Math.max(1,l.image.height),base=Math.max(b.w/fullW,b.h/fullH),scale=base*(l.scale||1),iw=fullW*scale,ih=fullH*scale;
    const x=cx-iw/2+iw*left,y=cy-ih/2+ih*top,w=iw*(1-left-right),h=ih*(1-top-bottom);
    return{x,y,w,h,cx,cy,b,fullW:iw,fullH:ih,crop};
  }
  const fs=Math.max(18,b.w*.10*(l.scale||1));return{x:cx-b.w*.22,y:cy-fs*.75,w:b.w*.44,h:fs*1.5,cx,cy,b};
}
function rotateSelectionPoint(x,y,cx,cy,a){const dx=x-cx,dy=y-cy,co=Math.cos(a),si=Math.sin(a);return{x:cx+dx*co-dy*si,y:cy+dx*si+dy*co};}
function selectionGeometry(l,q){
  const a=(Number(l.rotation)||0)*Math.PI/180,cx=q.cx,cy=q.cy;
  const raw=[[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]];
  const corners=raw.map(([x,y])=>rotateSelectionPoint(x,y,cx,cy,a));
  const top=rotateSelectionPoint(q.x+q.w/2,q.y,cx,cy,a),rotateHandle=rotateSelectionPoint(q.x+q.w/2,q.y-34,cx,cy,a);
  return{corners,top,rotateHandle,resizeHandle:corners[2]};
}
function drawSelectionOverlay(){
  const l=activeLayer(),q=activeLayerScreenRect();if(!l||!q)return;ctx.save();ctx.lineWidth=2;
  if(cropMode&&l.type==='image'){
    ctx.strokeStyle='#ff6b00';ctx.setLineDash([7,5]);ctx.strokeRect(q.x,q.y,q.w,q.h);ctx.setLineDash([]);
    for(const [x,y] of[[q.x,q.y],[q.x+q.w,q.y],[q.x,q.y+q.h],[q.x+q.w,q.y+q.h]]){ctx.fillStyle='#fff';ctx.strokeStyle='#ff6b00';ctx.beginPath();ctx.rect(x-6,y-6,12,12);ctx.fill();ctx.stroke();}
  }else{
    const g=selectionGeometry(l,q);ctx.strokeStyle='#1b78ff';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(g.corners[0].x,g.corners[0].y);for(let i=1;i<4;i++)ctx.lineTo(g.corners[i].x,g.corners[i].y);ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(g.top.x,g.top.y);ctx.lineTo(g.rotateHandle.x,g.rotateHandle.y);ctx.stroke();
    ctx.fillStyle='#fff';ctx.strokeStyle='#1b78ff';ctx.beginPath();ctx.rect(g.resizeHandle.x-6,g.resizeHandle.y-6,12,12);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(g.rotateHandle.x,g.rotateHandle.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
function drawEditor(){ctx.clearRect(0,0,editorCanvas.width,editorCanvas.height);drawZoneComposite(ctx,editorCanvas.width,editorCanvas.height,true);drawSelectionOverlay();}
function makeZoneTextureCanvas(zone){return makeCleanZoneDesignCanvas(zone,1600);}
function zoneHasContent(zone){const z=stateFor().zones[zone];return z&&((z.background||'#FFFFFF').toUpperCase()!=='#FFFFFF'||(z.layers||[]).length);}

function renderProducts(){const sel=$('productSelect');sel.innerHTML='';catalog.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=`${p.name} — $${Number(p.price).toFixed(2)}`;sel.appendChild(o);});sel.value=product.id;}
function zoneIconLabel(z){if(z==='Front')return'▰\nFront';if(z==='Back')return'▱\nBack';if(z.includes('Sleeve'))return'▭\n'+(z.startsWith('Left')?'L Sleeve':'R Sleeve');if(z==='Collar')return'⌒\nCollar';if(z==='Hood')return'◠\nHood';return z;}
function renderZones(){const rail=$('zoneRail');rail.innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone-icon'+(z===activeZone?' active':'')+(zoneHasContent(z)?' complete':'');b.innerHTML=escapeHtml(zoneIconLabel(z)).replace('\n','<br>');b.title=zoneHasContent(z)?z+' — design added':z+' — not designed yet';b.onclick=()=>selectZone(z);rail.appendChild(b);});}
function renderLayerPanel(){
  const wrap=$('layers'),empty=$('emptyLayers'),controlsEl=$('layerControls'),textControls=$('textControls');
  wrap.innerHTML='';const arr=zoneState().layers;empty.classList.toggle('hidden',arr.length>0);
  // The layer at the TOP of this list is also the layer visually rendered on top.
  const panelOrder=[...arr].reverse();
  panelOrder.forEach(l=>{const d=document.createElement('div');d.className='layer'+(l.id===activeLayerId?' active':'');d.draggable=true;d.dataset.layerId=l.id;d.title='Drag to change layer order';d.innerHTML=`<div class="layer-head"><div><div class="layer-name">${escapeHtml(l.label)}</div><div class="layer-meta">${escapeHtml(activeZone)} · ${l.type==='image'?'Image':'Text'}${l.visible===false?' · hidden':''}</div></div><span>↕ ${l.type==='image'?'▧':'T'}</span></div>`;
    d.onclick=()=>{activeLayerId=l.id;renderLayerPanel();drawEditor();};
    d.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',l.id);d.classList.add('dragging-layer');};
    d.ondragend=()=>d.classList.remove('dragging-layer');
    d.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';d.classList.add('layer-drop-target');};
    d.ondragleave=()=>d.classList.remove('layer-drop-target');
    d.ondrop=e=>{e.preventDefault();d.classList.remove('layer-drop-target');const moved=e.dataTransfer.getData('text/plain');if(!moved||moved===l.id)return;snapshot();const order=[...arr].reverse().map(x=>x.id),from=order.indexOf(moved),to=order.indexOf(l.id);if(from<0||to<0)return;const [id]=order.splice(from,1);order.splice(to,0,id);const byId=new Map(arr.map(x=>[x.id,x]));arr.splice(0,arr.length,...order.reverse().map(id=>byId.get(id)).filter(Boolean));activeLayerId=moved;renderAll();};
    wrap.appendChild(d);});
  const l=activeLayer();controlsEl.classList.toggle('hidden',!l);if(!l){textControls?.classList.add('hidden');return;}
  $('selectedLayerLabel').textContent=l.label;$('layerX').value=l.x||0;$('layerY').value=l.y||0;$('layerScale').value=Math.round((l.scale||1)*100);$('layerRotation').value=l.rotation||0;$('layerXVal').textContent=l.x||0;$('layerYVal').textContent=l.y||0;$('layerScaleVal').textContent=Math.round((l.scale||1)*100);$('layerRotationVal').textContent=(l.rotation||0)+'°';$('toggleLayer').textContent=l.visible===false?'Show':'Hide';
  const isText=l.type==='text';textControls?.classList.toggle('hidden',!isText);$('imageQuickControls')?.classList.toggle('hidden',l.type!=='image');$('cropHint')?.classList.toggle('hidden',!(cropMode&&l.type==='image'));$('cropTool')?.classList.toggle('active-tool',cropMode&&l.type==='image');
  if(isText){$('textValue').value=l.text||'';$('textFont').value=l.font||'Inter';$('textColor').value=(l.color||'#111111').toLowerCase();$('textStrokeColor').value=(l.strokeColor||'#FFFFFF').toLowerCase();$('textStrokeWidth').value=Number(l.strokeWidth)||0;$('textStrokeWidthVal').textContent=Number(l.strokeWidth)||0;$('textLetterSpacing').value=Number(l.letterSpacing)||0;$('textLetterSpacingVal').textContent=Number(l.letterSpacing)||0;$('textBold').classList.toggle('primary',l.bold!==false);$('textItalic').classList.toggle('primary',!!l.italic);$('textAlign').value=l.align||'center';}
}

function renderStatus(){const t=templateFor();$('zoneName').textContent=activeZone;$('zoneSize').textContent=t?.width&&t?.height?`${t.width.toLocaleString()} × ${t.height.toLocaleString()} px`:'Custom zone';$('statusProduct').textContent=product.name;$('statusZone').textContent=activeZone;$('statusLayers').textContent=zoneState().layers.length;const c=zoneState().background||'#FFFFFF';$('zoneColor').value=c.toLowerCase();$('zoneHex').value=c;}
function renderAll(){ensureCustomerUx();renderProducts();renderZones();renderLayerPanel();renderStatus();renderPrintQuality();drawEditor();rebuildGarmentPreview();}


function init3D(){const canvas=$('webgl');renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.01,100);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(2,3,4);scene.add(key);decalGroup=new THREE.Group();scene.add(decalGroup);const resize=()=>{const r=canvas.getBoundingClientRect();camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false)};addEventListener('resize',resize);resize();(function loop(){controls.update();renderer.render(scene,camera);requestAnimationFrame(loop)})();}
function fitGarment(){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),m=Math.max(size.x,size.y,size.z);garment.position.sub(center);camera.position.set(0,m*.45,m*2.15);camera.near=m/100;camera.far=m*20;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();}
function downloadMockupPNG(){
 if(!renderer||!garment)return;
 renderer.render(scene,camera);
 const src=renderer.domElement,out=document.createElement('canvas');out.width=src.width;out.height=src.height;
 const c=out.getContext('2d');c.fillStyle='#F7F7F7';c.fillRect(0,0,out.width,out.height);c.drawImage(src,0,0,out.width,out.height);
 out.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=product.id+'-mockup.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);},'image/png');
}
$('downloadMockup').onclick=downloadMockupPNG;
function clearDecals(){while(decalGroup.children.length){const o=decalGroup.children[0];decalGroup.remove(o);o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map?.dispose();m.dispose();});}}
function zonePlacement(zone){
  const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3()),p=new THREE.Vector3(),r=new THREE.Euler(),d=new THREE.Vector3();
  const torso=/tshirt|polo|hooded-long-sleeve|hood-mask-shirt/.test(product.id),bottom=/shorts|sweat-pants/.test(product.id),longSleeveTshirt=product.id==='long-sleeve-tshirt';
  const bodyWidth=bottom?.76:(longSleeveTshirt?.69:torso?.61:.67),bodyHeight=bottom?.90:(longSleeveTshirt?.88:torso?.80:.76);
  if(zone==='Back'){p.set(c.x,c.y-size.y*(bottom?.01:.015),box.min.z-size.z*.04);r.set(0,Math.PI,0);d.set(size.x*bodyWidth,size.y*bodyHeight,size.z*1.35);}
  else if(zone==='Left Sleeve'){p.set(box.min.x,c.y+size.y*.17,c.z);r.set(0,-Math.PI/2,0);d.set(size.z*.96,size.y*(torso?.35:.40),size.x*.30);}
  else if(zone==='Right Sleeve'){p.set(box.max.x,c.y+size.y*.17,c.z);r.set(0,Math.PI/2,0);d.set(size.z*.96,size.y*(torso?.35:.40),size.x*.30);}
  else if(zone==='Collar'){p.set(c.x,box.max.y-size.y*.035,c.z+size.z*.10);r.set(-Math.PI/2,0,0);d.set(size.x*.34,size.z*1.0,size.y*.12);}
  else if(zone==='Hood'){p.set(c.x,c.y+size.y*.31,box.min.z);r.set(0,Math.PI,0);d.set(size.x*.58,size.y*.32,size.z*.92);}
  else if(zone==='Front Panel'){p.set(c.x,c.y+size.y*.14,box.max.z+size.z*.15);d.set(size.x*.44,size.y*.32,size.z*.72);}
  else if(zone==='Top of Bill'){p.set(c.x,c.y-size.y*.03,box.max.z+size.z*.20);r.set(-Math.PI/2,0,0);d.set(size.x*.48,size.z*.46,size.y*.14);}
  else if(zone==='Entire Mask'||zone==='Built-In Mask'){p.set(c.x,c.y,box.max.z+size.z*.06);d.set(size.x*.54,size.y*.30,size.z*.48);}
  else{p.set(c.x,c.y-size.y*(bottom?.01:.015),box.max.z+size.z*.04);d.set(size.x*bodyWidth,size.y*bodyHeight,size.z*1.35);}
  return{p,r,d};
}

function findPrimaryMesh(root=garment){let best=null,score=-1;root?.traverse(o=>{if(!o.isMesh||!o.geometry?.getAttribute('position'))return;const count=o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count;if(count>score){score=count;best=o;}});return best;}
function splitTshirtGeometry(sourceMesh){
 const longSleeve=product.id==='long-sleeve-tshirt';
 const longSleevePolo=product.id==='long-sleeve-polo';
 const shortPolo=product.id==='short-sleeve-polo';
 const geometry=sourceMesh.geometry;if(!geometry?.getAttribute('position')||!sourceMesh.parent)return false;
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index;
 const buffers=panelNames.map(()=>({P:[],N:[],UV:[],min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}}));
 const count=index?index.count:pos.count,faceCount=(count/3)|0,useExactCollar=product.id==='tshirt'&&faceCount===TSHIRT_FACE_COUNT,useExactPoloCollar=shortPolo&&faceCount===POLO_FACE_COUNT;
 if(product.id==='tshirt'&&!useExactCollar)console.warn('MQD T-shirt collar topology mask disabled: expected',TSHIRT_FACE_COUNT,'faces but found',faceCount);
 if(shortPolo&&!useExactPoloCollar)console.warn('MQD Short Sleeve Polo collar topology mask disabled: expected',POLO_FACE_COUNT,'faces but found',faceCount);
 for(let t=0;t<count;t+=3){
  const faceIndex=(t/3)|0;
  const triangle=[0,1,2].map(k=>{const i=index?index.getX(t+k):t+k;return[pos.getX(i),pos.getY(i),pos.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i)];});
  const parts=longSleevePolo?partitionLongSleevePoloTriangle(triangle):longSleeve?partitionLongSleeveTriangle(triangle):useExactPoloCollar?(isPoloCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):useExactCollar?(isTshirtCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):partitionTriangle(triangle);
  for(const [zi,poly] of parts){
   const out=buffers[zi];
   for(let k=1;k<poly.length-1;k++)for(const v of[poly[0],poly[k],poly[k+1]]){
    out.P.push(...v.slice(0,3));const length=Math.hypot(...v.slice(3))||1;out.N.push(...v.slice(3).map(n=>n/length));
    ['x','y','z'].forEach((axis,j)=>{out.min[axis]=Math.min(out.min[axis],v[j]);out.max[axis]=Math.max(out.max[axis],v[j]);});
   }
  }
 }
 if(buffers.some(b=>!b.P.length))return false;
 const group=new THREE.Group();group.name='MQD_Tshirt_Zones';group.position.copy(sourceMesh.position);group.quaternion.copy(sourceMesh.quaternion);group.scale.copy(sourceMesh.scale);
 const base=Array.isArray(sourceMesh.material)?sourceMesh.material[0]:sourceMesh.material;
 buffers.forEach((b,zi)=>{
  for(let i=0;i<b.P.length;i+=3)b.UV.push(...((longSleeve||longSleevePolo)?longSleevePanelUv:panelUv)(panelNames[zi],...b.P.slice(i,i+3),b));
  // Unwrap triangles across the angular seam without stretching across the entire texture.
  if(zi>=2)for(let i=0;i<b.UV.length;i+=6){const us=[b.UV[i],b.UV[i+2],b.UV[i+4]];if(Math.max(...us)-Math.min(...us)>.5)for(let k=0;k<6;k+=2)if(b.UV[i+k]<.5)b.UV[i+k]+=1;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.UV,2));g.computeBoundingBox();g.computeBoundingSphere();
  const m=base?.clone?base.clone():new THREE.MeshStandardMaterial();m.color.set('#fff');m.vertexColors=false;
  for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in m)m[key]=null;
  m.roughness=.88;m.metalness=0;m.needsUpdate=true;
  const mesh=new THREE.Mesh(g,m);mesh.name='MQD_'+panelNames[zi].replace(/\s+/g,'_');group.add(mesh);tshirtZoneMeshes.set(panelNames[zi],mesh);
 });
 sourceMesh.parent.add(group);tshirtZoneGroup=group;sourceMesh.visible=false;return true;
}
function disposeZoneTexture(mesh){const map=mesh?.material?.map;if(map){mesh.material.map=null;map.dispose();}}
function updateTshirtZoneTextures(){if(!['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)||!tshirtZoneMeshes.size)return false;product.zones.forEach(zone=>{const mesh=tshirtZoneMeshes.get(zone);if(!mesh)return;disposeZoneTexture(mesh);const artwork=makeCleanZoneArtworkCanvas(zone,1600),canvas=document.createElement('canvas');canvas.width=artwork.width;canvas.height=artwork.height;const paint=canvas.getContext('2d');paint.fillStyle=zoneState(zone).background||'#FFFFFF';paint.fillRect(0,0,canvas.width,canvas.height);const artworkY=product.id==='short-sleeve-polo'&&zone==='Back'?-canvas.height*.08:0;paint.drawImage(artwork,0,artworkY);const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=true;if(zone.includes('Sleeve')||zone==='Collar')tex.wrapS=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;mesh.material.map=tex;mesh.material.transparent=false;mesh.material.opacity=1;if(mesh.material.color)mesh.material.color.set('#fff');mesh.material.needsUpdate=true;});return true;}
function findLargestMesh(){let best=null,score=-1;garment?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),v=s.x*s.y*s.z;if(v>score){score=v;best=o;}});return best;}
function rebuildDecals(){if(!garment||!decalGroup)return;clearDecals();const target=findLargestMesh();if(!target)return;product.zones.forEach(zone=>{if(!zoneHasContent(zone))return;const canvas=makeZoneTextureCanvas(zone),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const q=zonePlacement(zone);try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;decalGroup.add(mesh);}catch(e){console.warn('Decal failed',zone,e);}});}
function rebuildGarmentPreview(){if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)&&tshirtZoneMeshes.size){clearDecals();updateTshirtZoneTextures();return;}rebuildDecals();}

function loadGarment(){if(!renderer)init3D();if(garment){scene.remove(garment);garment.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose?.();m.dispose?.();});});garment=null;}tshirtZoneMeshes.clear();tshirtZoneGroup=null;clearDecals();preloadTemplates();new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)){const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);}rebuildGarmentPreview();},undefined,e=>console.error(e));}

function selectProduct(id){cropMode=false;product=catalog.find(p=>p.id===id)||catalog[0];activeZone=product.zones[0];activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;preloadTemplates();renderAll();loadGarment();}
function selectZone(z){cropMode=false;activeZone=z;activeLayerId=zoneState().layers.at(-1)?.id||null;editorZoom=1;ensureTemplateImage(z);renderAll();}
const MAX_ZONE_LAYERS=6;
function canAddLayer(zone=activeZone){const z=zoneState(zone);if(z.layers.length>=MAX_ZONE_LAYERS){alert(`This print zone can have up to ${MAX_ZONE_LAYERS} layers.`);return false;}return true;}
function nextLabel(){return `Layer ${zoneState().layers.length+1}`;}
function addImage(src,filename){if(!canAddLayer())return;const img=new Image();img.onload=()=>{if(!canAddLayer())return;snapshot();const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),filename:filename||'artwork',src,image:img,x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true};zoneState().layers.push(l);activeLayerId=l.id;renderAll();};img.src=src;}
function addText(){if(!canAddLayer())return;const text=prompt('Text to add');if(!text)return;snapshot();const l={id:'layer-'+layerSeq++,type:'text',label:nextLabel(),text,x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111',font:'Inter',strokeColor:'#FFFFFF',strokeWidth:0,letterSpacing:0,bold:true,italic:false,align:'center'};zoneState().layers.push(l);activeLayerId=l.id;renderAll();}
function updateLayer(prop,val){const l=activeLayer();if(!l)return;l[prop]=val;renderLayerPanel();renderPrintQuality();drawEditor();scheduleGarmentPreview();}
function setBackground(hex,record=true){const v=normalizeHex(hex);if(!v)return;if(record)snapshot();zoneState().background=v;renderStatus();drawEditor();rebuildGarmentPreview();}
function applyBackgroundAll(){const c=normalizeHex($('zoneHex').value);if(!c)return;snapshot();product.zones.forEach(z=>{const old=activeZone;activeZone=z;zoneState().background=c;activeZone=old;});renderAll();}

function requireImageLayer(){const l=activeLayer();return l&&l.type==='image'?l:null;}
function flipActive(axis){const l=requireImageLayer();if(!l)return;snapshot();l[axis]=!l[axis];renderAll();}
function alignActive(){const l=activeLayer();if(!l)return;snapshot();l.x=0;l.y=0;renderAll();}
function duplicateLayerIntoZone(source,zone,{offset=false}={}){
  const target=zoneState(zone);
  if(target.layers.length>=MAX_ZONE_LAYERS)return false;
  const copy={...source,id:'layer-'+layerSeq++,label:'Layer '+(target.layers.length+1),crop:source.crop?{...source.crop}:undefined};
  if(offset){copy.x=(source.x||0)+6;copy.y=(source.y||0)+6;}
  target.layers.push(copy);
  return copy;
}
function duplicateActive(){const l=activeLayer();if(!l||!canAddLayer())return;snapshot();const copy=duplicateLayerIntoZone(l,activeZone,{offset:true});if(!copy)return;activeLayerId=copy.id;renderAll();}
function duplicateActiveToZone(zone){
  const l=activeLayer();
  if(!l||!product.zones.includes(zone))return;
  const target=zoneState(zone);
  if(target.layers.length>=MAX_ZONE_LAYERS){alert(zone+' is already at the 6-layer limit.');return;}
  snapshot();
  const copy=duplicateLayerIntoZone(l,zone,{offset:zone===activeZone});
  if(zone===activeZone&&copy)activeLayerId=copy.id;
  renderAll();
}
function cloneActiveToAllZones(){
  const l=activeLayer();if(!l)return;
  const available=product.zones.filter(z=>zoneState(z).layers.length<MAX_ZONE_LAYERS);
  if(!available.length){alert('All print zones are already at the 6-layer limit.');return;}
  snapshot();
  let currentCopy=null;
  for(const z of available){const copy=duplicateLayerIntoZone(l,z,{offset:z===activeZone});if(z===activeZone)currentCopy=copy;}
  if(currentCopy)activeLayerId=currentCopy.id;
  renderAll();
}
function closeDuplicateMenu(){document.getElementById('duplicateZoneMenu')?.remove();}
function openDuplicateMenu(){
  const l=activeLayer();if(!l)return;
  const btn=$('duplicateTool');if(!btn)return;
  closeDuplicateMenu();
  const menu=document.createElement('div');menu.id='duplicateZoneMenu';
  Object.assign(menu.style,{position:'fixed',zIndex:'120',minWidth:'210px',padding:'8px',background:'#fff',border:'1px solid #e1e1e1',borderRadius:'12px',boxShadow:'0 12px 32px rgba(0,0,0,.16)'});
  const r=btn.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-226,r.left+r.width/2-105))+'px';menu.style.top=(r.bottom+8)+'px';
  const add=(label,handler,strong=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;Object.assign(b.style,{display:'block',width:'100%',border:'0',background:'#fff',padding:'11px 12px',borderRadius:'8px',textAlign:'left',cursor:'pointer',fontWeight:strong?'800':'500',color:'#222'});b.onmouseenter=()=>b.style.background='#f6f6f6';b.onmouseleave=()=>b.style.background='#fff';b.onclick=e=>{e.stopPropagation();closeDuplicateMenu();handler();};menu.appendChild(b);};
  add('Same Zone',()=>duplicateActive());
  for(const z of product.zones.filter(z=>z!==activeZone))add('To '+z,()=>duplicateActiveToZone(z));
  const line=document.createElement('div');Object.assign(line.style,{height:'1px',background:'#ececec',margin:'6px 4px'});menu.appendChild(line);
  add('To All Zones',()=>cloneActiveToAllZones(),true);
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',closeDuplicateMenu,{once:true}),0);
}
function cropActive(){const l=requireImageLayer();if(!l)return;cropMode=!cropMode;renderLayerPanel();drawEditor();}
function nudgeActive(dx,dy){const l=activeLayer();if(!l)return;snapshot();l.x=Math.max(-100,Math.min(100,(Number(l.x)||0)+dx));l.y=Math.max(-100,Math.min(100,(Number(l.y)||0)+dy));renderAll();}

function resetActive(){const l=activeLayer();if(!l)return;snapshot();Object.assign(l,{x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false});if(l.type==='image')l.crop={left:0,top:0,right:0,bottom:0};renderAll();}
$('flipXTool')?.addEventListener('click',()=>flipActive('flipX'));
$('flipYTool')?.addEventListener('click',()=>flipActive('flipY'));
$('alignTool')?.addEventListener('click',alignActive);
$('cloneAllTool')?.addEventListener('click',cloneActiveToAllZones);
$('cropTool')?.addEventListener('click',cropActive);
$('duplicateTool')?.addEventListener('click',e=>{e.stopPropagation();openDuplicateMenu();});
$('resetTool')?.addEventListener('click',resetActive);
$('nudgeUp')?.addEventListener('click',()=>nudgeActive(0,-2));$('nudgeDown')?.addEventListener('click',()=>nudgeActive(0,2));$('nudgeLeft')?.addEventListener('click',()=>nudgeActive(-2,0));$('nudgeRight')?.addEventListener('click',()=>nudgeActive(2,0));$('nudgeCenter')?.addEventListener('click',alignActive);

function initTextFonts(){const sel=$('textFont');if(!sel)return;sel.innerHTML=TEXT_FONTS.map(f=>`<option value="${f}">${f}</option>`).join('');}
function updateTextProp(prop,val){const l=activeLayer();if(!l||l.type!=='text')return;l[prop]=val;if(prop==='font'&&document.fonts?.load)document.fonts.load(`32px "${val}"`).finally(()=>renderAll());else renderAll();}
$('textValue')?.addEventListener('input',e=>updateTextProp('text',e.target.value));
$('textFont')?.addEventListener('change',e=>updateTextProp('font',e.target.value));
$('textColor')?.addEventListener('input',e=>updateTextProp('color',e.target.value.toUpperCase()));
$('textStrokeColor')?.addEventListener('input',e=>updateTextProp('strokeColor',e.target.value.toUpperCase()));
$('textStrokeWidth')?.addEventListener('input',e=>updateTextProp('strokeWidth',Number(e.target.value)));
$('textLetterSpacing')?.addEventListener('input',e=>updateTextProp('letterSpacing',Number(e.target.value)));
$('textBold')?.addEventListener('click',()=>{const l=activeLayer();if(!l||l.type!=='text')return;snapshot();l.bold=l.bold===false;renderAll();});
$('textItalic')?.addEventListener('click',()=>{const l=activeLayer();if(!l||l.type!=='text')return;snapshot();l.italic=!l.italic;renderAll();});
$('textAlign')?.addEventListener('change',e=>updateTextProp('align',e.target.value));
initTextFonts();

$('productSelect').onchange=e=>selectProduct(e.target.value);$('addImageBtn').onclick=()=>$('artUpload').click();$('artUpload').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>addImage(rd.result,f.name);rd.readAsDataURL(f);e.target.value='';};$('addTextBtn').onclick=addText;$('zoneColor').oninput=e=>{const v=e.target.value.toUpperCase();$('zoneHex').value=v;cancelAnimationFrame(colorRaf);colorRaf=requestAnimationFrame(()=>setBackground(v,false));};$('zoneColor').onchange=e=>setBackground(e.target.value.toUpperCase(),false);$('zoneHex').onchange=e=>{const v=normalizeHex(e.target.value);if(v)setBackground(v);else renderStatus();};$('applyAll').onclick=applyBackgroundAll;
[['layerX','x',Number],['layerY','y',Number],['layerScale','scale',v=>Number(v)/100],['layerRotation','rotation',Number]].forEach(([id,p,fn])=>$(id).oninput=e=>updateLayer(p,fn(e.target.value)));
$('fillLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.x=0;l.y=0;l.scale=1;l.rotation=0;renderAll();};$('toggleLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();l.visible=l.visible===false;renderAll();};$('deleteLayer').onclick=()=>{const l=activeLayer();if(!l)return;snapshot();const arr=zoneState().layers;arr.splice(arr.findIndex(x=>x.id===l.id),1);activeLayerId=arr.at(-1)?.id||null;renderAll();};$('undo').onclick=undo;$('redo').onclick=redo;$('gridToggle').onclick=()=>{showGrid=!showGrid;drawEditor();};$('zoomIn').onclick=()=>{editorZoom=Math.min(1.6,editorZoom+.1);drawEditor();};$('zoomOut').onclick=()=>{editorZoom=Math.max(.6,editorZoom-.1);drawEditor();};

function pointerToCanvas(e){const r=editorCanvas.getBoundingClientRect();return{x:(e.clientX-r.left)*editorCanvas.width/r.width,y:(e.clientY-r.top)*editorCanvas.height/r.height};}
editorCanvas.addEventListener('pointerdown',e=>{const l=activeLayer(),q=activeLayerScreenRect();if(!l||!q)return;const p=pointerToCanvas(e),near=(x,y)=>Math.hypot(p.x-x,p.y-y)<=18;snapshot();let mode='move',corner=null;if(cropMode&&l.type==='image'){const hs=[[q.x,q.y,'tl'],[q.x+q.w,q.y,'tr'],[q.x,q.y+q.h,'bl'],[q.x+q.w,q.y+q.h,'br']];const hit=hs.find(h=>near(h[0],h[1]));if(hit){mode='crop';corner=hit[2];}}else{const g=selectionGeometry(l,q);if(near(g.rotateHandle.x,g.rotateHandle.y))mode='rotate';else if(near(g.resizeHandle.x,g.resizeHandle.y))mode='resize';}dragState={mode,corner,start:p,x:Number(l.x)||0,y:Number(l.y)||0,scale:Number(l.scale)||1,rotation:Number(l.rotation)||0,startAngle:Math.atan2(p.y-q.cy,p.x-q.cx),crop:{...(l.crop||{left:0,top:0,right:0,bottom:0})},q};editorCanvas.setPointerCapture(e.pointerId);editorCanvas.classList.add('dragging');});
editorCanvas.addEventListener('pointermove',e=>{if(!dragState)return;const l=activeLayer();if(!l)return;const p=pointerToCanvas(e),q=dragState.q,b=q.b||editorRect(),dx=p.x-dragState.start.x,dy=p.y-dragState.start.y;if(dragState.mode==='move'){l.x=Math.max(-100,Math.min(100,dragState.x+dx/Math.max(1,b.w)*200));l.y=Math.max(-100,Math.min(100,dragState.y+dy/Math.max(1,b.h)*200));}else if(dragState.mode==='resize'){const d0=Math.hypot(dragState.start.x-q.cx,dragState.start.y-q.cy)||1,d1=Math.hypot(p.x-q.cx,p.y-q.cy);l.scale=Math.max(.05,Math.min(2.2,dragState.scale*d1/d0));}else if(dragState.mode==='rotate'){const angle=Math.atan2(p.y-q.cy,p.x-q.cx),delta=(angle-dragState.startAngle)*180/Math.PI;let value=dragState.rotation+delta;if(e.shiftKey)value=Math.round(value/15)*15;l.rotation=Math.round(((value+180)%360+360)%360-180);}else if(dragState.mode==='crop'&&l.type==='image'){const c={...dragState.crop},fx=dx/Math.max(40,q.fullW||q.w),fy=dy/Math.max(40,q.fullH||q.h),corner=dragState.corner;if(corner.includes('l'))c.left=Math.max(0,Math.min(.45,(dragState.crop.left||0)+fx));if(corner.includes('r'))c.right=Math.max(0,Math.min(.45,(dragState.crop.right||0)-fx));if(corner.includes('t'))c.top=Math.max(0,Math.min(.45,(dragState.crop.top||0)+fy));if(corner.includes('b'))c.bottom=Math.max(0,Math.min(.45,(dragState.crop.bottom||0)-fy));if(c.left+c.right<.9&&c.top+c.bottom<.9)l.crop=c;}drawEditor();renderLayerPanel();scheduleGarmentPreview();});
editorCanvas.addEventListener('pointerup',e=>{dragState=null;try{editorCanvas.releasePointerCapture(e.pointerId)}catch{}editorCanvas.classList.remove('dragging');});

function designJSON(){
 const clean=JSON.parse(JSON.stringify(designs,(k,v)=>k==='image'?undefined:v));
 const templates=Object.fromEntries(product.zones.map(z=>[z,product.templates?.[z]||null]));
 return{schema:'mqd-design-v1',engine:{calibration:product.id==='tshirt'?MQD_TSHIRT_ZONE_CALIBRATION:'legacy-preview'},product:{id:product.id,name:product.name,category:product.category,price:product.price,model:product.model},activeZone,templates,design:clean[product.id]||{},savedAt:new Date().toISOString()};
}
function recomputeLayerSeq(){
 let max=0;
 Object.values(designs).forEach(ps=>Object.values(ps.zones||{}).forEach(z=>(z.layers||[]).forEach(l=>{const m=String(l.id||'').match(/^layer-(\d+)$/);if(m)max=Math.max(max,Number(m[1]));})));
 layerSeq=max+1;
}
function downloadJsonFile(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('saveDesign').onclick=()=>downloadJsonFile(product.id+'-design.json',designJSON());
$('loadDesign').onclick=()=>$('designUpload').click();
$('designUpload').onchange=async e=>{
 const f=e.target.files?.[0];if(!f)return;
 try{
  const payload=JSON.parse(await f.text()),pid=payload?.product?.id,p=catalog.find(x=>x.id===pid);
  if(!p)throw new Error('This design belongs to a product that is not in the current catalog.');
  if(!payload?.design||typeof payload.design!=='object')throw new Error('This is not a valid MQD design file.');
  snapshot();designs[pid]=payload.design;product=p;activeZone=p.zones.includes(payload.activeZone)?payload.activeZone:p.zones[0];activeLayerId=zoneState().layers.at(-1)?.id||null;
  recomputeLayerSeq();repairImageObjects();editorZoom=1;renderAll();loadGarment();alert('Design loaded.');
 }catch(err){console.error(err);alert('Design could not be loaded: '+err.message);}finally{e.target.value='';}
};
function dataUrlBlob(dataUrl){const [h,b]=dataUrl.split(','),bin=atob(b),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:h.match(/data:(.*?);/)[1]});}
$('downloadPack').onclick=async()=>{
 const button=$('downloadPack');button.disabled=true;$('productSelect').disabled=true;
 const selected=product,oldZone=activeZone,zip=new JSZip(),root=zip.folder(selected.id+'-production');
 try{
  const metadata=designJSON(),colors={};
  for(const [zoneIndex,z] of selected.zones.entries()){
   const folder=String(zoneIndex+1).padStart(2,'0')+'-'+z.toLowerCase().replace(/[^a-z0-9]+/g,'-');
   const state=zoneState(z);colors[z]=state.background||'#FFFFFF';
   root.file(`original-assets/${folder}/background-hex.txt`,colors[z]+'\n');
   const layers=[];
   for(const [i,l] of state.layers.entries()){
    const info=JSON.parse(JSON.stringify(l,(k,v)=>k==='image'||k==='src'?undefined:v));
    if(l.type==='image'&&l.src){
     const blob=l.src.startsWith('data:')?dataUrlBlob(l.src):await fetch(l.src).then(r=>{if(!r.ok)throw new Error('Unable to download original artwork');return r.blob();});
     const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[blob.type]||'bin';
     const name=String(i+1).padStart(2,'0')+'-'+(l.filename||l.label||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/\.[^.]+$/,'')+'.'+ext;
     root.file(`original-assets/${folder}/${name}`,new Uint8Array(await blob.arrayBuffer()));info.originalFile=name;
    }
    layers.push(info);
   }
   root.file(`original-assets/${folder}/layers.json`,JSON.stringify(layers,null,2));
   const t=selected.templates?.[z];
   if(t?.path){const response=await fetch(t.path);if(!response.ok)throw new Error('Template could not be downloaded: '+z);root.file(`template-references/${folder}.png`,new Uint8Array(await response.arrayBuffer()));
    const rec=ensureTemplateImage(z);if(rec?.status==='loading')await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(rec.status!=='loading'){clearInterval(timer);resolve();}else if(Date.now()-started>15000){clearInterval(timer);reject(new Error('Template is still loading: '+z));}},50);});
    if(rec?.status!=='ready')throw new Error('Template is not ready: '+z);
   }
   const c=document.createElement('canvas');c.width=t?.width||2048;c.height=t?.height||2048;drawProductionZone(c.getContext('2d'),z,c.width,c.height);
   root.file(`zones/${folder}.png`,new Uint8Array(await dataUrlBlob(c.toDataURL('image/png')).arrayBuffer()));
  }
  const manifest={schema:'mqd-production-v1',generatedAt:new Date().toISOString(),engineCalibration:selected.id==='tshirt'?MQD_TSHIRT_ZONE_CALIBRATION:'legacy-preview',product:{id:selected.id,name:selected.name,category:selected.category,price:selected.price,model:selected.model},zones:selected.zones.map(z=>({name:z,template:selected.templates?.[z]||null,backgroundHex:colors[z]||'#FFFFFF'}))};
  root.file('manifest.json',JSON.stringify(manifest,null,2));
  root.file('background-colors.json',JSON.stringify(colors,null,2));
  root.file('background-colors.txt',Object.entries(colors).map(([z,c])=>z+': '+c).join('\n')+'\n');
  root.file('design.json',JSON.stringify(metadata,null,2));
  root.file('README.txt','Original uploaded files and per-zone HEX colors are in original-assets. Text, placement, visibility, scale and rotation are in each layers.json. Zone PNGs are design references for your manual print sizing and preparation. The 3D preview is a visual approximation.\n');
  const blob=await zip.generateAsync({type:'blob'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=selected.id+'-production.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(error){console.error(error);alert('Export could not finish: '+error.message);}
 finally{activeZone=oldZone;button.disabled=false;$('productSelect').disabled=false;}
};

function renderAdmin(){const list=$('adminList');list.innerHTML='';catalog.forEach(p=>{const d=document.createElement('div');d.className='product-row';d.innerHTML=`<div><strong>${escapeHtml(p.name)}</strong><div class="subtle">${escapeHtml(p.category)} · $${Number(p.price).toFixed(2)}</div></div><button class="btn">Edit</button>`;d.querySelector('button').onclick=()=>loadAdmin(p.id);list.appendChild(d);});}
function loadAdmin(id){const p=catalog.find(x=>x.id===id);if(!p)return;$('adminName').value=p.name;$('adminCategory').value=p.category;$('adminPrice').value=p.price;$('adminZones').innerHTML='';p.zones.forEach(z=>{const s=document.createElement('span');s.className='chip';s.textContent=z;$('adminZones').appendChild(s);});$('saveProductAdmin').dataset.id=id;}
$('openAdmin').onclick=()=>{$('adminOverlay').classList.remove('hidden');renderAdmin();loadAdmin(product.id);};$('closeAdmin').onclick=()=>$('adminOverlay').classList.add('hidden');$('adminOverlay').onclick=e=>{if(e.target===$('adminOverlay'))$('adminOverlay').classList.add('hidden');};$('saveProductAdmin').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;p.name=$('adminName').value.trim()||p.name;p.category=$('adminCategory').value.trim()||p.category;p.price=Number($('adminPrice').value)||p.price;localStorage.setItem('mqd-catalog',JSON.stringify(catalog));if(p.id===product.id)product=p;renderProducts();renderAdmin();alert('Product saved.');};$('addZone').onclick=()=>{const p=catalog.find(x=>x.id===$('saveProductAdmin').dataset.id);if(!p)return;const z=prompt('Zone name');if(!z)return;p.zones.push(z.trim());localStorage.setItem('mqd-catalog',JSON.stringify(catalog));loadAdmin(p.id);if(p.id===product.id){product=p;renderAll();}};

renderProducts();renderAll();init3D();loadGarment();
