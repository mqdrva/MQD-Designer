// Canonical mapping source for the main and branded-service 3D designers.
// Edit here, then run npm run build:mappings. Host controls, prices and logo policy stay outside these sections.
// Build-time composition keeps the existing editor closure and approved mapping behavior intact.

// @mapping-begin imports
import {partitionTshirtBodyTriangle,tshirtSleeveArtworkBounds} from './tshirt-armhole-seams.js?v=2';
import {refineTshirtCollar} from './tshirt-collar-shell.js';
import {tshirtBodyPlacementFrame,matchTshirtDuplicatePlacement} from './tshirt-duplicate-placement.js';
import {tshirtSeamFrame,renderTshirtSeamMirror} from './tshirt-seam-mirror.js';
import {createTshirtNeckInterior} from './tshirt-neck-interior.js?armhole=v2';
import {createTshirtCollarFrame} from './tshirt-collar-frame.js';
import {loadTshirtSurfaceUv,applyTshirtSurfaceUv} from './tshirt-surface-uv.js';
import {createHoodMaskPanels} from './hood-mask-panels.js';
import {createHoodedLongSleevePanels,hoodedLongSleeveArtworkTransform} from './hooded-long-sleeve-panels.js';
import {partitionLongSleeveTriangle,longSleevePanelUv} from './long-sleeve-panels.js';
import {bodyPatternUv} from './long-sleeve-pattern-uv.js';
import {createJacketZones,jacketProjection,setJacketPanelUvs} from './lightweight-jacket-renderer.js?v=surface-1';
import {jacketSplashPreviewFrame} from './jacket-splash-preview.js';
import {isJacketSplash5,drawJacketSplash5} from './jacket-splash-5.js?v=back-1';
import {hoodieSplashPreviewFrame,hoodieArtworkBatches} from './hoodie-splash-preview.js?v=3';
import {shirtSplashPreviewFrame,clipShirtSplash,isShirtSplash,shirtSplashCutFrame} from './shirt-splash-preview.js?v=2';
import {isCutlineBottomArtwork,drawFittedSplash} from './water-splash-fit.js?v=grass-1';
import {createHatZones,hatProjection} from './hat-renderer.js';
import {createShortsPanels,shortsTemplatePolygons} from './shorts-panels.js';
import {createSweatPanels,sweatTemplate} from './sweat-pants-panels.js';
import {createMaskSurface,applyMaskTexture,MASK_MAPPING_CALIBRATION} from './mask-renderer.js';
import {partitionLongSleevePoloTriangle} from './long-sleeve-polo-panels.js';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from './fleece-hoodie-panels.js';
import {panelNames, partitionTriangle, partitionBodyTriangle, panelUv} from './panels.js';
import {TSHIRT_FACE_COUNT,isTshirtCollarFace} from './tshirt-collar-mask.js';
import {POLO_FACE_COUNT,isPoloCollarFace} from './polo-collar-mask.js';
import {TSHIRT_BODY_ARTWORK_OFFSET_Y,tshirtBodyImageOffsetY} from './tshirt-artwork-calibration.js';
import {tshirtSideWrapUv,isTshirtSleeveInterior,isTshirtCollarInterior} from './tshirt-side-wrap.js';
// @mapping-end imports

// @mapping-begin ensureTemplateImage
function ensureTemplateImage(zone=activeZone){
  if(product.id==='sweat-pants'&&sweatTemplates.has(zone))return sweatTemplates.get(zone);
  const t=product.templates?.[zone];
  if(!t?.path)return null;
  const jacketSleeve=product.id==='lightweight-jacket'&&zone.includes('Sleeve');
  const jacketBack=product.id==='lightweight-jacket'&&zone==='Back';
  const jacketFront=product.id==='lightweight-jacket'&&zone==='Front';
  const hoodMaskBody=product.id==='hood-mask-shirt'&&['Front','Back','Left Sleeve','Right Sleeve'].includes(zone);
  const hoodedLongBody=product.id==='hooded-long-sleeve'&&['Front','Back','Left Sleeve','Right Sleeve'].includes(zone);
  const tshirtBody2d=product.id==='tshirt'&&(zone==='Front'||zone==='Back');
  const longSleeveTshirtBody2d=product.id==='long-sleeve-tshirt'&&(zone==='Front'||zone==='Back');
  const longSleeveTshirtSleeve2d=product.id==='long-sleeve-tshirt'&&zone.includes('Sleeve');
  const poloSleeve2d=product.id==='long-sleeve-polo'&&zone.includes('Sleeve');
  const solidBodyTemplate=hoodMaskBody||hoodedLongBody;
  const cacheKey=product.id==='tshirt'&&zone==='Collar'?'tshirt-collar-print-frame-v1:'+t.path:poloSleeve2d?'long-sleeve-polo-sleeve-v1:'+zone+':'+t.path:product.id==='long-sleeve-tshirt'&&zone==='Collar'?'long-sleeve-tshirt-collar-v2:'+t.path:tshirtBody2d?'tshirt-body-v4:'+zone+':'+t.path:longSleeveTshirtBody2d?'long-sleeve-tshirt-body-v1:'+zone+':'+t.path:longSleeveTshirtSleeve2d?'long-sleeve-tshirt-sleeve-v1:'+zone+':'+t.path:hoodMaskBody?'hood-mask-2d:'+t.path:hoodedLongBody?'hooded-long-2d:'+t.path:jacketSleeve||jacketBack?'jacket-panel:'+t.path:t.path;
  if(templateCache.has(cacheKey))return templateCache.get(cacheKey);
  if(product.id==='tshirt'&&zone==='Collar'){const rec=createTshirtCollarFrame(document,t);templateCache.set(cacheKey,rec);return rec;}
  const rec={img:null,maskCanvas:null,cutlineCanvas:null,bounds:null,status:'loading'};
  templateCache.set(cacheKey,rec);
  const img=new Image();
  img.onload=()=>{
    rec.img=img;
    try{
      let buildSource=img;
      if(mobileDesignerMode()&&product.id==='tshirt'){
        const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height,maxEdge=Math.max(sw,sh);
        if(maxEdge>1000){
          const scale=1000/maxEdge,small=document.createElement('canvas');
          small.width=Math.max(1,Math.round(sw*scale));small.height=Math.max(1,Math.round(sh*scale));
          const smallCtx=small.getContext('2d');smallCtx.imageSmoothingEnabled=true;smallCtx.imageSmoothingQuality='high';smallCtx.drawImage(img,0,0,small.width,small.height);
          buildSource=small;
        }
      }
      const built=buildTemplateMask(buildSource,zone,jacketSleeve,jacketBack,solidBodyTemplate,poloSleeve2d);
      if(jacketFront){
        // Trace the red perimeter, not the template's grid, pockets or zipper.
        // Only replace the flat clipping mask; keep approved artwork/3D bounds.
        const mask=document.createElement('canvas');
        mask.width=built.maskCanvas.width;mask.height=built.maskCanvas.height;
        const mx=mask.getContext('2d');
        mx.scale(mask.width/796,mask.height/878);
        mx.beginPath();mx.moveTo(138,125);mx.lineTo(300,62);
        mx.bezierCurveTo(316,121,346,142,413,151);
        mx.bezierCurveTo(480,142,510,121,527,62);
        mx.lineTo(689,125);
        mx.bezierCurveTo(666,201,660,265,688,297);
        mx.bezierCurveTo(704,314,729,319,756,320);
        mx.lineTo(756,812);
        mx.bezierCurveTo(543,820,282,820,69,812);
        mx.lineTo(69,320);
        mx.bezierCurveTo(96,319,121,314,138,297);
        mx.bezierCurveTo(166,265,160,201,138,125);
        mx.closePath();mx.fill();built.maskCanvas=mask;
      }
      if(poloSleeve2d){
        // Correct the flat silhouette without rescaling approved 3D artwork.
        const previous=buildTemplateMask(buildSource,zone).bounds;
        rec.artworkAspect=previous.w/Math.max(1,previous.h);
      }
      // On phones, keep only the compact T-shirt template canvas. The original
      // 4K template bitmap is not needed after its mask/cutline were built and
      // retaining it caused Android browsers to run out of memory after several zones.
      if(buildSource!==img&&product.id==='tshirt')rec.img=buildSource;
      if(hoodMaskBody){
        // Keep the approved 3D artwork proportions independent of the 2D fill.
        const previous=buildTemplateMask(img,zone,false,false,false).bounds;
        rec.artworkAspect=previous.w/Math.max(1,previous.h);
      }
      if(product.id==='tshirt'||product.id==='shorts'||product.id==='long-sleeve-tshirt'){
        const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height;
        // The PNG is a screen reference while the configured dimensions are
        // the production frame. This is the exact aspect shown in the 2D editor.
        rec.artworkAspect=(t.width/t.height)*(built.bounds.w/sw)/(built.bounds.h/sh);
      }
      rec.maskCanvas=built.maskCanvas;
      rec.cutlineCanvas=built.cutlineCanvas;
      rec.bounds=built.bounds;
      rec.status='ready';
      if(product.id==='tshirt'||product.id==='shorts'||product.id==='long-sleeve-tshirt'||zoneState(zone).layers.some(l=>isCutlineBottomArtwork(l)||isJacketSplash5(product.id,zone,l)))scheduleGarmentPreview(0);
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
// @mapping-end ensureTemplateImage

// @mapping-begin templateImageFor
function templateImageFor(zone=activeZone){return ensureTemplateImage(zone)?.img||null;}
// @mapping-end templateImageFor

// @mapping-begin preloadTemplates
function preloadTemplates(){
 if(mobileDesignerMode()){ensureTemplateImage(activeZone);return;}
 product.zones.forEach(z=>ensureTemplateImage(z));
}
// @mapping-end preloadTemplates

// @mapping-begin buildTemplateMask
function buildTemplateMask(img,zone=null,jacketSleeve=false,jacketBack=false,solidBodyTemplate=false,poloSleeve2d=false){
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

  // Shorts only: fill both supplied production pieces. The instruction circle
  // is deliberately ignored so it can never become a circular artwork mask.
  if(product.id==='shorts'&&shortsTemplatePolygons[zone]){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.fillStyle='#fff';
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(const polygon of shortsTemplatePolygons[zone]){
      mx.beginPath();polygon.forEach(([x,y],i)=>{const px=x*w,py=y*h;i?mx.lineTo(px,py):mx.moveTo(px,py);minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);});mx.closePath();mx.fill();
    }
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX,h:maxY-minY}};
  }

  // Fill the complete production piece enclosed by its supplied perimeter.
  // This affects the 2D print canvas only; each garment's 3D split stays in
  // its product-specific renderer.
  if(solidBodyTemplate){
    const wall=new Uint8Array(w*h),exterior=new Uint8Array(w*h),pending=new Int32Array(w*h);
    for(let p=0;p<w*h;p++){const i=p*4;wall[p]=pixels[i+3]>15&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<180?1:0;}
    let head=0,tail=0;
    const visit=p=>{if(!wall[p]&&!exterior[p]){exterior[p]=1;pending[tail++]=p;}};
    for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
    for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
    while(head<tail){const p=pending[head++],x=p%w,y=Math.floor(p/w);if(x>0)visit(p-1);if(x<w-1)visit(p+1);if(y>0)visit(p-w);if(y<h-1)visit(p+w);}
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d'),data=mx.createImageData(w,h);let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x;if(exterior[p])continue;data.data.set([255,255,255,255],p*4);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    mx.putImageData(data,0,0);
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
  }

  // Trace the Back perimeter rather than flood-filling its instruction graphic.
  if(jacketBack){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.scale(w/660,h/708);mx.beginPath();
    mx.moveTo(276,57);mx.lineTo(398,57);mx.lineTo(513,144);
    mx.bezierCurveTo(559,177,552,209,571,256);
    mx.bezierCurveTo(582,281,597,292,621,299);
    mx.bezierCurveTo(602,432,601,486,616,650);mx.lineTo(58,650);
    mx.bezierCurveTo(72,485,73,421,53,301);
    mx.bezierCurveTo(98,286,104,265,115,218);
    mx.bezierCurveTo(129,162,126,170,276,57);mx.closePath();mx.fillStyle='#fff';mx.fill();
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:53*w/660,y:57*h/708,w:568*w/660,h:593*h/708}};
  }

  // Jacket sleeves: trace the supplied red perimeter, including the cuff.
  // The central instruction graphic hides the dashed outline in this PNG.
  if(jacketSleeve){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.scale(w/512,h/828);mx.beginPath();
    mx.moveTo(243,54);mx.bezierCurveTo(256,77,273,78,307,81);
    mx.bezierCurveTo(324,194,318,204,463,249);
    mx.lineTo(374,667);mx.lineTo(374,787);mx.lineTo(155,787);
    mx.lineTo(155,667);mx.lineTo(78,246);
    mx.bezierCurveTo(194,217,193,215,243,54);mx.closePath();mx.fillStyle='#fff';mx.fill();
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:78*w/512,y:54*h/828,w:385*w/512,h:733*h/828}};
  }

  // Fleece Hoodie sleeves: solid-fill the complete printable sleeve interior.
  if(product.id==='fleece-hoodie'&&(zone==='Left Sleeve'||zone==='Right Sleeve')){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');
    mx.fillStyle='#fff';
    mx.beginPath();
    mx.moveTo(w*.315,h*.905);
    mx.lineTo(w*.205,h*.305);
    mx.bezierCurveTo(w*.31,h*.292,w*.415,h*.235,w*.455,h*.135);
    mx.lineTo(w*.485,h*.052);
    mx.lineTo(w*.605,h*.083);
    mx.bezierCurveTo(w*.615,h*.175,w*.665,h*.235,w*.845,h*.292);
    mx.lineTo(w*.758,h*.775);
    mx.lineTo(w*.758,h*.920);
    mx.lineTo(w*.330,h*.920);
    mx.closePath();
    mx.fill();

    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{
      x:w*.205,
      y:h*.052,
      w:w*(.845-.205),
      h:h*(.920-.052)
    }};
  }

  // T-Shirt Front/Back 2D calibration only. Both T-Shirt products use the
  // same supplied production templates, so they share this exact cutline fill.
  // Match the supplied red production cutline from shoulder to hem. This is
  // deliberately isolated from the locked T-shirt 3D renderer and from sleeves/collar.
  if(['tshirt','long-sleeve-tshirt'].includes(product.id)&&(zone==='Front'||zone==='Back')){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.fillStyle='#fff';mx.beginPath();
    const back=zone==='Back';

    // Left hem -> side seam -> armhole -> shoulder.
    mx.moveTo(w*.115,h*.905);
    mx.bezierCurveTo(w*.118,h*.74,w*.122,h*.54,w*.135,h*.385);
    mx.bezierCurveTo(w*.142,h*.345,w*.175,h*.335,w*.195,h*.300);
    mx.bezierCurveTo(w*.215,h*.265,w*.200,h*.225,w*.190,h*.180);
    mx.lineTo(w*.185,h*.085);
    mx.lineTo(w*.350,h*.040);

    // Neck opening follows the red front/back neckline.
    if(back){
      mx.bezierCurveTo(w*.372,h*.080,w*.390,h*.105,w*.420,h*.116);
      mx.bezierCurveTo(w*.455,h*.129,w*.545,h*.129,w*.580,h*.116);
      mx.bezierCurveTo(w*.610,h*.105,w*.628,h*.080,w*.650,h*.040);
    }else{
      mx.bezierCurveTo(w*.370,h*.085,w*.382,h*.145,w*.420,h*.176);
      mx.bezierCurveTo(w*.456,h*.205,w*.544,h*.205,w*.580,h*.176);
      mx.bezierCurveTo(w*.618,h*.145,w*.630,h*.085,w*.650,h*.040);
    }

    // Right shoulder -> armhole -> side seam -> hem.
    mx.lineTo(w*.815,h*.085);
    mx.lineTo(w*.810,h*.180);
    mx.bezierCurveTo(w*.800,h*.225,w*.785,h*.265,w*.805,h*.300);
    mx.bezierCurveTo(w*.825,h*.335,w*.858,h*.345,w*.865,h*.385);
    mx.bezierCurveTo(w*.878,h*.54,w*.882,h*.74,w*.885,h*.905);
    mx.lineTo(w*.115,h*.905);
    mx.closePath();
    mx.fill();

    // Extend the solid customer fill to the center of the dashed red bleed edge
    // so there is no white strip between the color and production cutline.
    mx.save();
    mx.lineJoin='round';mx.lineCap='round';
    mx.lineWidth=Math.max(8,Math.min(w,h)*.010);
    mx.strokeStyle='#fff';mx.stroke();
    mx.restore();

    return{
      maskCanvas:mask,
      cutlineCanvas:cut,
      bounds:{x:w*.11,y:h*.035,w:w*.78,h:h*.875}
    };
  }

  // Long Sleeve T-Shirt sleeves 2D only: reconstruct the full printable
  // silhouette from the left and right edges of the supplied dashed red
  // cutline. Interpolation bridges the dash gaps without treating the large
  // instruction circle as printable artwork. The Collar and every 3D renderer
  // remain untouched.
  if((product.id==='long-sleeve-tshirt'||poloSleeve2d)&&['Left Sleeve','Right Sleeve'].includes(zone)){
    const left=new Int32Array(h),right=new Int32Array(h);
    left.fill(-1);right.fill(-1);
    const middle=w/2;
    let yMin=h,yMax=-1;

    for(let y=0;y<h;y++){
      let lx=w,rx=-1;
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        const redInk=a>15&&r>170&&g<145&&b<145&&r>g*1.35;
        if(!redInk)continue;
        if(x<middle)lx=Math.min(lx,x);
        if(x>middle)rx=Math.max(rx,x);
      }
      if(lx<w)left[y]=lx;
      if(rx>=0)right[y]=rx;
      if(left[y]>=0||right[y]>=0){yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}
    }

    const interpolate=arr=>{
      const nextIndex=new Int32Array(h);let next=-1;
      for(let y=h-1;y>=0;y--){if(arr[y]>=0)next=y;nextIndex[y]=next;}
      let previous=-1;
      for(let y=0;y<h;y++){
        if(arr[y]>=0){previous=y;continue;}
        const following=nextIndex[y];
        if(previous>=0&&following>=0){
          const amount=(y-previous)/(following-previous);
          arr[y]=Math.round(arr[previous]+(arr[following]-arr[previous])*amount);
        }else if(previous>=0)arr[y]=arr[previous];
        else if(following>=0)arr[y]=arr[following];
      }
    };
    interpolate(left);interpolate(right);

    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.fillStyle='#fff';
    let minX=w,maxX=-1;
    for(let y=yMin;y<=yMax;y++){
      const lx=left[y],rx=right[y];
      if(lx<0||rx<0||rx<=lx)continue;
      mx.fillRect(lx,y,rx-lx+1,1);
      minX=Math.min(minX,lx);maxX=Math.max(maxX,rx);
    }
    if(maxX>=minX){
      return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:yMin,w:maxX-minX+1,h:yMax-yMin+1}};
    }
    console.warn('Long Sleeve T-Shirt sleeve cutline mask fallback used for',zone);
  }

  // All-Over Print T-Shirt sleeves 2D only: build the printable fill
  // from the supplied TRUE RED production cutline instead of helper artwork.
  // This prevents the instruction circle/text from becoming the customer fill mask.
  // The locked T-shirt 3D split/UV renderer is intentionally untouched.
  if(product.id==='tshirt'&&['Left Sleeve','Right Sleeve'].includes(zone)){
    let redBarrier=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a>15&&r>170&&g<145&&b<145&&r>g*1.35)redBarrier[y*w+x]=1;
    }
    // Close the dashed cutline just enough to make one sealed production silhouette.
    const passes=Math.max(7,Math.min(20,Math.round(Math.min(w,h)*.0065)));
    for(let pass=0;pass<passes;pass++){
      const next=redBarrier.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const idx=y*w+x;if(redBarrier[idx])continue;
        if(redBarrier[idx-1]||redBarrier[idx+1]||redBarrier[idx-w]||redBarrier[idx+w]||
           redBarrier[idx-w-1]||redBarrier[idx-w+1]||redBarrier[idx+w-1]||redBarrier[idx+w+1])next[idx]=1;
      }
      redBarrier=next;
    }

    // Flood from the canvas edge. Anything sealed by the red cutline is a candidate.
    const ext=new Uint8Array(w*h),q=new Int32Array(w*h);let qh=0,qt=0;
    const pushOutside=idx=>{if(idx<0||idx>=ext.length||ext[idx]||redBarrier[idx])return;ext[idx]=1;q[qt++]=idx;};
    for(let x=0;x<w;x++){pushOutside(x);pushOutside((h-1)*w+x);}
    for(let y=0;y<h;y++){pushOutside(y*w);pushOutside(y*w+w-1);}
    while(qh<qt){
      const idx=q[qh++],x=idx%w,y=(idx/w)|0;
      if(x>0)pushOutside(idx-1);if(x<w-1)pushOutside(idx+1);
      if(y>0)pushOutside(idx-w);if(y<h-1)pushOutside(idx+w);
    }

    // Keep only the largest enclosed region so small closed helper letters/icons
    // can never become printable areas.
    const seenInside=new Uint8Array(w*h),cq=new Int32Array(w*h);let best=[];
    for(let start=0;start<ext.length;start++){
      if(ext[start]||redBarrier[start]||seenInside[start])continue;
      let hq=0,tq=0;const pts=[];seenInside[start]=1;cq[tq++]=start;
      while(hq<tq){
        const idx=cq[hq++];pts.push(idx);const x=idx%w,y=(idx/w)|0;
        const add=n=>{if(n<0||n>=ext.length||ext[n]||redBarrier[n]||seenInside[n])return;seenInside[n]=1;cq[tq++]=n;};
        if(x>0)add(idx-1);if(x<w-1)add(idx+1);if(y>0)add(idx-w);if(y<h-1)add(idx+w);
      }
      if(pts.length>best.length)best=pts;
    }

    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d'),out=mx.createImageData(w,h);
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(const idx of best){
      const x=idx%w,y=(idx/w)|0,o=idx*4;
      out.data[o]=255;out.data[o+1]=255;out.data[o+2]=255;out.data[o+3]=255;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    if(best.length){
      mx.putImageData(out,0,0);
      // Include the cutline itself in the printable fill so the customer color
      // reaches cleanly all the way to the bleed/cut boundary.
      mx.save();mx.globalCompositeOperation='source-over';mx.drawImage(cut,0,0);mx.restore();
      return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
    }
    console.warn('T-shirt 2D cutline mask fallback used for',zone);
  }

  // Fleece Hoodie Back: use the actual red production cutline as the authority.
  // For each template row, find the left/right red cutline edges, interpolate
  // across dashed gaps, then fill the full interior between them. This avoids
  // the old circular/blob mask and follows the supplied cutline shape.
  if(product.id==='fleece-hoodie'&&zone==='Back'){
    const left=new Int32Array(h),right=new Int32Array(h);
    left.fill(-1);right.fill(-1);
    let yMin=h,yMax=-1;

    for(let y=0;y<h;y++){
      let lx=w,rx=-1;
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        const redInk=a>15&&r>170&&g<145&&b<145&&r>g*1.35;
        if(!redInk)continue;
        if(x<w*.52)lx=Math.min(lx,x);
        if(x>w*.48)rx=Math.max(rx,x);
      }
      if(lx<w)left[y]=lx;
      if(rx>=0)right[y]=rx;
      if(left[y]>=0||right[y]>=0){
        yMin=Math.min(yMin,y);
        yMax=Math.max(yMax,y);
      }
    }

    const interpolate=arr=>{
      const nextIndex=new Int32Array(h);
      let next=-1;
      for(let y=h-1;y>=0;y--){
        if(arr[y]>=0)next=y;
        nextIndex[y]=next;
      }
      let prev=-1;
      for(let y=0;y<h;y++){
        if(arr[y]>=0){prev=y;continue;}
        const n=nextIndex[y];
        if(prev>=0&&n>=0){
          const t=(y-prev)/(n-prev);
          arr[y]=Math.round(arr[prev]+(arr[n]-arr[prev])*t);
        }else if(prev>=0)arr[y]=arr[prev];
        else if(n>=0)arr[y]=arr[n];
      }
    };
    interpolate(left);interpolate(right);

    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');
    mx.fillStyle='#fff';

    let minX=w,maxX=-1;
    if(yMax<yMin){yMin=0;yMax=h-1;}
    for(let y=yMin;y<=yMax;y++){
      const lx=left[y],rx=right[y];
      if(lx<0||rx<0||rx<=lx)continue;
      mx.fillRect(lx,y,rx-lx+1,1);
      minX=Math.min(minX,lx);maxX=Math.max(maxX,rx);
    }

    if(maxX<minX){
      minX=Math.round(w*.095);maxX=Math.round(w*.905);
      yMin=Math.round(h*.12);yMax=Math.round(h*.925);
      mx.beginPath();
      mx.moveTo(w*.095,h*.925);
      mx.lineTo(w*.105,h*.455);
      mx.bezierCurveTo(w*.110,h*.355,w*.170,h*.290,w*.395,h*.120);
      mx.lineTo(w*.605,h*.120);
      mx.bezierCurveTo(w*.830,h*.290,w*.890,h*.355,w*.895,h*.455);
      mx.lineTo(w*.905,h*.925);
      mx.closePath();
      mx.fill();
    }

    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{
      x:minX,y:yMin,w:maxX-minX+1,h:yMax-yMin+1
    }};
  }

  // Long Sleeve Polo Back: derive the fill only from the true red production
  // outline. Dilate the dashed cutline just enough to close dash gaps, then
  // flood-fill from the outside. This prevents helper text/graphics from becoming
  // the mask while preserving the neckline opening and full back silhouette.
  if(product.id==='long-sleeve-polo'&&zone==='Back'){
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
// @mapping-end buildTemplateMask

// @mapping-begin scaleBounds
function scaleBounds(b,sw,sh,dw,dh){return{x:b.x/sw*dw,y:b.y/sh*dh,w:b.w/sw*dw,h:b.h/sh*dh};}
// @mapping-end scaleBounds

// @mapping-begin isFullLockedLibraryBackground
function isFullLockedLibraryBackground(l){return !!(l?.type==='image'&&l.libraryAssetId&&l.libraryLocked&&l.libraryPreset==='full');}
// @mapping-end isFullLockedLibraryBackground

// @mapping-begin measureVisibleImageBounds
function measureVisibleImageBounds(img){
  if(!img)return{left:0,top:0,right:1,bottom:1};
  const fullW=Math.max(1,img.naturalWidth||img.width),fullH=Math.max(1,img.naturalHeight||img.height),maxSide=512,ratio=Math.min(1,maxSide/Math.max(fullW,fullH));
  const w=Math.max(1,Math.round(fullW*ratio)),h=Math.max(1,Math.round(fullH*ratio)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  try{
    const x=canvas.getContext('2d',{willReadFrequently:true});x.clearRect(0,0,w,h);x.drawImage(img,0,0,w,h);
    const data=x.getImageData(0,0,w,h).data;let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){if(data[(py*w+px)*4+3]<=12)continue;minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}
    if(maxX<minX||maxY<minY)return{left:0,top:0,right:1,bottom:1};
    const pad=1;return{left:Math.max(0,(minX-pad)/w),top:Math.max(0,(minY-pad)/h),right:Math.min(1,(maxX+pad+1)/w),bottom:Math.min(1,(maxY+pad+1)/h)};
  }catch(error){console.warn('Library background padding could not be measured',error);return{left:0,top:0,right:1,bottom:1};}
}
// @mapping-end measureVisibleImageBounds

// @mapping-begin normalizedLibraryContentBounds
function normalizedLibraryContentBounds(l){
  if(!isFullLockedLibraryBackground(l))return null;
  const measured=l.libraryContentBounds||measureVisibleImageBounds(l.image),left=Math.max(0,Math.min(.98,Number(measured?.left)||0)),top=Math.max(0,Math.min(.98,Number(measured?.top)||0)),right=Math.max(.02,Math.min(1,Number(measured?.right)||1)),bottom=Math.max(.02,Math.min(1,Number(measured?.bottom)||1));
  const bounds=right>left&&bottom>top?{left,top,right,bottom}:{left:0,top:0,right:1,bottom:1};l.libraryContentBounds=bounds;return bounds;
}
// @mapping-end normalizedLibraryContentBounds

// @mapping-begin drawTextLayer
function drawTextLayer(c,l,b,zone=activeZone){
  // Keep the minimum glyph size in production units across editor and preview resolutions.
  const rec=product.id==='tshirt'?ensureTemplateImage(zone):null;
  const t=product.templates?.[zone];
  const printWidth=rec?.bounds&&t?.width?t.width*rec.bounds.w/(rec.img.naturalWidth||rec.img.width):0;
  const minimum=product.id==='tshirt'&&printWidth?18*b.w/printWidth:18;
  const fs=Math.max(minimum,b.w*.10*(l.scale||1));
  const font=l.font||'Inter',weight=l.bold===false?400:(l.weight||800),style=l.italic?'italic':'normal';
  c.font=`${style} ${weight} ${fs}px ${textFontFamily(font)}`;
  c.textAlign=l.align||'center';c.textBaseline='middle';
  if('letterSpacing' in c)c.letterSpacing=`${fs*((Number(l.letterSpacing)||0)/100)}px`;
  const text=l.text||'Text',maxWidth=b.w*.85,stroke=Math.max(0,Number(l.strokeWidth)||0);
  if(stroke>0){c.strokeStyle=l.strokeColor||'#FFFFFF';c.lineWidth=Math.max(1,fs*(stroke/100));c.lineJoin='round';c.strokeText(text,0,0,maxWidth);}
  c.fillStyle=l.color||'#111111';c.fillText(text,0,0,maxWidth);
}
// @mapping-end drawTextLayer

// @mapping-begin editorDesignBounds
function editorDesignBounds(zone,r,rec=ensureTemplateImage(zone)){
  let b={...r};
  if(rec?.img&&rec?.bounds){
    const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,sb=scaleBounds(rec.bounds,sw,sh,r.w,r.h);
    b={x:r.x+sb.x,y:r.y+sb.y,w:sb.w,h:sb.h};
  }
  return b;
}
// @mapping-end editorDesignBounds

// @mapping-begin drawEditorTextOverlay
function drawEditorTextOverlay(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec),z=zoneState(zone);
  (z.layers||[]).forEach(l=>{if(l.visible===false||l.type!=='text')return;c.save();const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);drawTextLayer(c,l,b,zone);c.restore();});
}
// @mapping-end drawEditorTextOverlay

// @mapping-begin drawSafeAreaGuide
function drawSafeAreaGuide(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec);
  // All-Over Print T-Shirt sleeve editor only: use a much larger safe-area frame.
  // This changes the 2D guide only; production cutlines and the locked 3D mapping stay untouched.
  const tshirtSleeve=product.id==='tshirt'&&(zone==='Left Sleeve'||zone==='Right Sleeve');
  const tshirtBody=product.id==='tshirt'&&(zone==='Front'||zone==='Back');
  const inset=tshirtSleeve?.025:tshirtBody?.045:.075,ix=Math.max((tshirtSleeve||tshirtBody)?4:9,b.w*inset),iy=Math.max((tshirtSleeve||tshirtBody)?4:9,b.h*inset),x=b.x+ix,y=b.y+iy,w=Math.max(10,b.w-ix*2),h=Math.max(10,b.h-iy*2);
  c.save();c.strokeStyle='#FF8A00';c.lineWidth=2;c.setLineDash([9,7]);c.strokeRect(x,y,w,h);c.setLineDash([]);c.fillStyle='#B85F00';c.font='700 10px Inter, sans-serif';c.textAlign='left';c.textBaseline='top';c.fillText('SAFE AREA',x+5,y+5);c.restore();
}
// @mapping-end drawSafeAreaGuide



// @mapping-begin zoneQuality
function zoneQuality(zone=activeZone){
  const z=zoneState(zone),images=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='image'&&l.image),texts=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='text');
  if(!images.length){if(texts.length)return{tone:'good',label:'Text quality ✓',note:'Text is rendered at the production template resolution.'};return{tone:'neutral',label:'No image to check',note:'Add an image to see estimated print resolution.'};}
  const values=images.map(l=>imageLayerEstimatedDpi(l,zone)).filter(Number.isFinite);if(!values.length)return{tone:'neutral',label:'Resolution unavailable',note:'Source pixel dimensions could not be read.'};
  const dpi=Math.round(Math.min(...values));if(dpi>=240)return{tone:'good',label:`≈ ${dpi} DPI ✓`,note:'Good print resolution at the current design size.'};if(dpi>=150)return{tone:'warn',label:`≈ ${dpi} DPI`,note:'Usable, but increasing the image size further may soften the print.'};return{tone:'bad',label:`≈ ${dpi} DPI ⚠`,note:'Low resolution — this image may print blurry at the current size.'};
}
// @mapping-end zoneQuality

// @mapping-begin activeLayerSafeAreaStatus
function activeLayerSafeAreaStatus(){
  const l=activeLayer();
  if(!l)return{tone:'neutral',label:'No artwork selected',note:'Select a logo, image, or text layer to check its safe-area placement.'};
  if(l.visible===false)return{tone:'neutral',label:'Selected layer is hidden',note:'Show the layer to check its safe-area placement.'};
  if(isFullLockedLibraryBackground(l)||isCutlineBottomArtwork(l)||l.chatBackground)return{tone:'good',label:'Background placement ✓',note:'Full backgrounds are allowed to extend through the safe area to the cut line.'};
  const q=activeLayerScreenRect(l);
  if(!q?.b)return{tone:'neutral',label:'Placement check unavailable',note:'The selected artwork position could not be measured yet.'};
  const b=q.b;
  const tshirtSleeve=product.id==='tshirt'&&(activeZone==='Left Sleeve'||activeZone==='Right Sleeve');
  const tshirtBody=product.id==='tshirt'&&(activeZone==='Front'||activeZone==='Back');
  const inset=tshirtSleeve?.025:tshirtBody?.045:.075;
  const ix=Math.max((tshirtSleeve||tshirtBody)?4:9,b.w*inset),iy=Math.max((tshirtSleeve||tshirtBody)?4:9,b.h*inset);
  const safe={left:b.x+ix,top:b.y+iy,right:b.x+b.w-ix,bottom:b.y+b.h-iy};
  const g=selectionGeometry(l,q);
  const outside=g.corners.some(p=>p.x<safe.left||p.x>safe.right||p.y<safe.top||p.y>safe.bottom);
  return outside
    ?{tone:'warn',label:'Artwork crosses the safe area ⚠',note:'Keep important logos and text inside the orange safe-area guide. Decorative backgrounds may extend to the red cut line.'}
    :{tone:'good',label:'Inside safe area ✓',note:'The selected artwork is inside the recommended safe area.'};
}
// @mapping-end activeLayerSafeAreaStatus

// @mapping-begin waterSplashCut
function waterSplashCut(zone,rec){
  const shirt=shirtSplashCutFrame(product.id,zone);if(shirt)return shirt;
  // These masks already use the full printable frame; ignore template annotations.
  if(['shorts','sweat-pants','mask'].includes(product.id))return {left:0,top:0,right:1,bottom:1};
  if(!rec?.bounds||!rec?.cutlineCanvas)return {left:0,top:0,right:1,bottom:1};
  if(rec.waterSplashCut)return rec.waterSplashCut;
  const cut=rec.cutlineCanvas,data=cut.getContext('2d').getImageData(0,0,cut.width,cut.height).data;
  let left=cut.width,right=-1,top=cut.height,bottom=-1;
  for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(data[(y*cut.width+x)*4+3]>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const r=rec.bounds;
  return rec.waterSplashCut=right>=left?{left:(left-r.x)/r.w,right:(right+1-r.x)/r.w,top:(top-r.y)/r.h,bottom:(bottom+1-r.y)/r.h}:{left:0,top:0,right:1,bottom:1};
}
// @mapping-end waterSplashCut

// @mapping-begin drawWaterSplash2
function drawWaterSplash2(c,zone,l,b,preview=false){
  if(!l.image)return;
  const rec=ensureTemplateImage(zone),t=product.templates?.[zone];
  const flatAspect=rec?.bounds&&rec.img&&t?.width?(t.width/t.height)*(rec.bounds.w/(rec.img.naturalWidth||rec.img.width))/(rec.bounds.h/(rec.img.naturalHeight||rec.img.height)):b.w/b.h;
  const content=l.waterSplashContentBounds||(l.waterSplashContentBounds=measureVisibleImageBounds(l.image));
  // Long-sleeve torso UVs already follow the flat pattern, not a projected frame.
  const patternUv=product.id==='long-sleeve-tshirt'&&['Front','Back'].includes(zone);
  drawFittedSplash(c,l.image,content,waterSplashCut(zone,rec),b,flatAspect,preview&&!patternUv,!!l.flipX,!!l.flipY);
}
// @mapping-end drawWaterSplash2

// @mapping-begin drawJacketSplash5Layer
function drawJacketSplash5Layer(c,zone,l,b,preview){
  const rec=ensureTemplateImage(zone),t=product.templates?.[zone];
  if(!l.image||rec?.status!=='ready')return;
  const flatAspect=(t.width/t.height)*(rec.bounds.w/(rec.img.naturalWidth||rec.img.width))/(rec.bounds.h/(rec.img.naturalHeight||rec.img.height));
  const content=l.waterSplashContentBounds||(l.waterSplashContentBounds=measureVisibleImageBounds(l.image));
  drawJacketSplash5(c,l,content,waterSplashCut(zone,rec),b,flatAspect,preview);
}
// @mapping-end drawJacketSplash5Layer

// @mapping-begin drawLayerStack
function drawLayerStack(c,zone,b,preview=false){
  const z=zoneState(zone);c.fillStyle=z.background||'#FFFFFF';c.fillRect(b.x,b.y,b.w,b.h);
  (z.layers||[]).forEach(l=>{if(l.visible===false)return;if(isJacketSplash5(product.id,zone,l)){drawJacketSplash5Layer(c,zone,l,b,preview);return;}if(isCutlineBottomArtwork(l)){drawWaterSplash2(c,zone,l,b,preview);return;}c.save();clipShirtSplash(c,product.id,zone,l,b);const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);
    if(l.type==='image'&&l.image){drawImageLayer(c,l,b);}
    else if(l.type==='text'){drawTextLayer(c,l,b,zone);}c.restore();});
}
// @mapping-end drawLayerStack

// @mapping-begin renderMaskedZoneCanvas
function renderMaskedZoneCanvas(zone,w,h,includeGuide=false){
  const out=document.createElement('canvas');out.width=w;out.height=h;const ox=out.getContext('2d'),rec=ensureTemplateImage(zone),t=product.templates?.[zone];
  if(product.id==='long-sleeve-tshirt'&&rec?.img&&rec?.maskCanvas&&rec?.bounds){
    const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height;
    const b=scaleBounds(rec.bounds,sw,sh,w,h);
    ox.fillStyle=zoneState(zone).background||'#FFFFFF';ox.fillRect(b.x,b.y,b.w,b.h);
    // Use exactly the same artwork frame as the 3D texture, then apply the
    // production silhouette only to this flat panel preview/export.
    ox.drawImage(makeLongSleeveTshirtArtworkCanvas(zone,Math.max(w,h,1600)),b.x,b.y,b.w,b.h);
    ox.globalCompositeOperation='destination-in';ox.drawImage(rec.maskCanvas,0,0,w,h);
    ox.globalCompositeOperation='source-over';
    if(includeGuide){ox.save();ox.globalAlpha=.72;ox.globalCompositeOperation='multiply';ox.drawImage(rec.img,0,0,w,h);ox.restore();}
    return out;
  }
  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,b=scaleBounds(rec.bounds,sw,sh,w,h);drawLayerStack(ox,zone,b);ox.globalCompositeOperation='destination-in';ox.drawImage(rec.maskCanvas,0,0,w,h);ox.globalCompositeOperation='source-over';if(includeGuide){ox.save();ox.globalAlpha=.72;ox.globalCompositeOperation='multiply';ox.drawImage(rec.img,0,0,w,h);ox.restore();}return out;}
  if(t?.shape==='rectangle'||!t?.path){drawLayerStack(ox,zone,{x:0,y:0,w,h});return out;}
  ox.save();traceZonePath(ox,zone,w,h);ox.clip();drawLayerStack(ox,zone,{x:0,y:0,w,h});ox.restore();return out;
}
// @mapping-end renderMaskedZoneCanvas

// @mapping-begin zoneDesignAspect
function zoneDesignAspect(zone){const rec=ensureTemplateImage(zone),t=product.templates?.[zone];if(rec?.artworkAspect)return rec.artworkAspect;if(rec?.bounds)return rec.bounds.w/Math.max(1,rec.bounds.h);if(t?.width&&t?.height)return t.width/t.height;return 1;}
// @mapping-end zoneDesignAspect

// @mapping-begin makeCleanZoneDesignCanvas
function makeCleanZoneDesignCanvas(zone,maxSide=1600){const ratio=zoneDesignAspect(zone);let w,h;if(ratio>=1){w=maxSide;h=Math.max(256,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(256,Math.round(maxSide*ratio));}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';drawLayerStack(x,zone,{x:0,y:0,w,h},true);return c;}
// @mapping-end makeCleanZoneDesignCanvas

// @mapping-begin makeCleanZoneArtworkCanvas
function makeCleanZoneArtworkCanvas(zone,maxSide=1600,textMap={}){const minimum=product.id==='tshirt'&&zone==='Collar'?32:256;const ratio=zoneDesignAspect(zone);let w,h;if(ratio>=1){w=maxSide;h=Math.max(minimum,Math.round(maxSide/ratio));}else{h=maxSide;w=Math.max(minimum,Math.round(maxSide*ratio));}const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';const z=zoneState(zone),b={x:0,y:0,w,h};(z.layers||[]).forEach(l=>{if(l.visible===false||textMap.layerFilter&&!textMap.layerFilter(l))return;if(isJacketSplash5(product.id,zone,l)){drawJacketSplash5Layer(x,zone,l,b,textMap.flat!==true);return;}if(isCutlineBottomArtwork(l)){drawWaterSplash2(x,zone,l,b,textMap.flat!==true);return;}x.save();const imageFrame=l.type==='image'?textMap.imageFrame?.(l,b):null;if(imageFrame){x.translate(imageFrame.offsetX*b.w,imageFrame.offsetY*b.h);x.scale(imageFrame.scaleX,1);}else{clipShirtSplash(x,product.id,zone,l,b);}const imageOffset=typeof textMap.imageOffsetY==='function'?Number(textMap.imageOffsetY(l)):Number(textMap.imageOffsetY),layerY=(l.type==='text'?Number(textMap.offsetY):l.type==='image'?imageOffset:0)||0,cx=b.w/2+(l.x||0)*b.w/200,cy=b.h/2+(l.y||0)*b.h/200+layerY*b.h;x.translate(cx,cy);if(l.type==='text'&&textMap.flipX)x.scale(-1,1);x.rotate((l.rotation||0)*Math.PI/180);if(l.type==='text'&&textMap.textScaleY)x.scale(1,textMap.textScaleY);if(l.type==='image'&&l.image)drawImageLayer(x,l,b);else if(l.type==='text')drawTextLayer(x,textMap.textStyle?textMap.textStyle(l):l,b,zone);x.restore();});return c;}
// @mapping-end makeCleanZoneArtworkCanvas

// @mapping-begin makeLongSleeveTshirtArtworkCanvas
function makeLongSleeveTshirtArtworkCanvas(zone,maxSide=1600,preview=false){
  // No per-type shifts or second text pass: preserve layer order, spacing,
  // rotation and scale identically in every zone, including the Collar.
  // Avoid the generic 256px minimum stretching narrow collar textures.
  const ratio=zoneDesignAspect(zone);
  const size=Math.max(maxSide,Math.ceil(256*Math.max(ratio,1/ratio)));
  const artwork=makeCleanZoneArtworkCanvas(zone,size,preview?{imageFrame:(layer,b)=>shirtSplashPreviewFrame(product.id,zone,layer,b)}:{flat:true});
  const c=artwork.getContext('2d');
  // A transparent one-pixel border prevents texture-edge smearing. The same
  // border is present in the 2D artwork; geometry provides the 3D boundaries.
  c.clearRect(0,0,artwork.width,1);c.clearRect(0,artwork.height-1,artwork.width,1);
  c.clearRect(0,0,1,artwork.height);c.clearRect(artwork.width-1,0,1,artwork.height);
  return artwork;
}
// @mapping-end makeLongSleeveTshirtArtworkCanvas

// @mapping-begin editorRect
function editorRect(zone=activeZone,w=editorCanvas.width,h=editorCanvas.height){
  const t=product.templates?.[zone],padX=82,padY=68,maxW=Math.max(120,w-padX*2),maxH=Math.max(120,h-padY*2);
  const tw=t?.width||1000,th=t?.height||1000,scale=Math.min(maxW/tw,maxH/th),dw=Math.round(tw*scale),dh=Math.round(th*scale);
  return{x:Math.round((w-dw)/2),y:Math.round((h-dh)/2),w:dw,h:dh};
}
// @mapping-end editorRect

// @mapping-begin drawGridLines
function drawGridLines(c,r){
  const step=Math.max(24,Math.round(Math.min(r.w,r.h)/14));c.save();c.strokeStyle='rgba(0,0,0,.075)';c.lineWidth=1;
  for(let x=r.x;x<=r.x+r.w;x+=step){c.beginPath();c.moveTo(x,r.y);c.lineTo(x,r.y+r.h);c.stroke();}
  for(let y=r.y;y<=r.y+r.h;y+=step){c.beginPath();c.moveTo(r.x,y);c.lineTo(r.x+r.w,y);c.stroke();}c.restore();
}
// @mapping-end drawGridLines

// @mapping-begin drawTemplateGuide
function drawTemplateGuide(c,zone,r,alpha=.46){
  const img=templateImageFor(zone);if(!img)return;c.save();c.globalAlpha=alpha;c.globalCompositeOperation='multiply';c.drawImage(img,r.x,r.y,r.w,r.h);c.restore();
}
// @mapping-end drawTemplateGuide

// @mapping-begin drawZoneLayersRect
function drawZoneLayersRect(c,zone,r){
  const z=stateFor().zones[zone]||{background:'#FFFFFF',layers:[]};c.fillStyle=z.background||'#FFFFFF';c.fillRect(r.x,r.y,r.w,r.h);
  (z.layers||[]).forEach(l=>{if(l.visible===false)return;c.save();const cx=r.x+r.w/2+(l.x||0)*r.w/200,cy=r.y+r.h/2+(l.y||0)*r.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);
    if(l.type==='image'&&l.image){drawImageLayer(c,l,r);}
    else if(l.type==='text'){drawTextLayer(c,l,r);}c.restore();});
}
// @mapping-end drawZoneLayersRect

// @mapping-begin drawProductionZone
function drawProductionZone(c,zone,w,h){c.clearRect(0,0,w,h);const masked=renderMaskedZoneCanvas(zone,w,h,false);c.drawImage(masked,0,0,w,h);}
// @mapping-end drawProductionZone

// @mapping-begin traceZonePath
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
  }else if(zone==='Entire Mask'){
    c.rect(0,0,w,h);
  }else if(zone==='Built-In Mask'){
    c.roundRect(w*.10,h*.20,w*.80,h*.60,w*.12);
  }else if(zone==='Front Panel'){
    c.moveTo(w*.24,h*.88);c.lineTo(w*.15,h*.18);c.quadraticCurveTo(w*.50,h*.02,w*.85,h*.18);c.lineTo(w*.76,h*.88);c.closePath();
  }else if(zone==='Top of Bill'){
    c.ellipse(w*.50,h*.52,w*.41,h*.28,0,0,Math.PI*2);
  }else{
    c.roundRect(w*.12,h*.10,w*.76,h*.80,w*.05);
  }
}
// @mapping-end traceZonePath

// @mapping-begin fitRect
function fitRect(){const pad=58;const w=editorCanvas.width-pad*2,h=editorCanvas.height-pad*2;return{x:pad,y:pad,w,h};}
// @mapping-end fitRect

// @mapping-begin drawLongSleeveWhiteGrid
function drawLongSleeveWhiteGrid(c,zone,r,rec){
  if(product.id!=='long-sleeve-tshirt'||!showGrid||(zoneState(zone).background||'#FFFFFF').toUpperCase()!=='#FFFFFF')return;
  const grid=document.createElement('canvas');grid.width=r.w;grid.height=r.h;
  const g=grid.getContext('2d');drawGridLines(g,{x:0,y:0,w:r.w,h:r.h});
  g.globalCompositeOperation='destination-in';g.drawImage(rec.maskCanvas,0,0,r.w,r.h);
  // Keep the grid over white fill only, not across customer text or pictures.
  const b=scaleBounds(rec.bounds,rec.img.naturalWidth||rec.img.width,rec.img.naturalHeight||rec.img.height,r.w,r.h);
  g.globalCompositeOperation='destination-out';
  g.drawImage(makeLongSleeveTshirtArtworkCanvas(zone),b.x,b.y,b.w,b.h);
  c.drawImage(grid,r.x,r.y);
}
// @mapping-end drawLongSleeveWhiteGrid

// @mapping-begin drawZoneComposite
function drawZoneComposite(targetCtx,w,h,includeGuides=false){
  const r=editorRect(activeZone,w,h),rec=ensureTemplateImage(activeZone);
  targetCtx.save();
  targetCtx.clearRect(0,0,w,h);
  targetCtx.translate(w/2,h/2);
  targetCtx.scale(editorZoom,editorZoom);
  targetCtx.translate(-w/2,-h/2);
  if(showGrid&&includeGuides)drawGridLines(targetCtx,r);

  if(rec?.img&&rec?.maskCanvas&&rec?.bounds){
    // Render the T-shirt editor at the same aspect as its print export.
    const t=product.templates?.[activeZone];
    const tshirtEditorScale=product.id==='tshirt'?Math.min(1,1600/Math.max(t.width,t.height)):null;
    const source=renderMaskedZoneCanvas(activeZone,tshirtEditorScale?Math.round(t.width*tshirtEditorScale):rec.img.naturalWidth||rec.img.width,tshirtEditorScale?Math.round(t.height*tshirtEditorScale):rec.img.naturalHeight||rec.img.height,false);
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
    // Lightweight Jacket 2D editor only: render text once. The masked source
    // already contains the customer text, so the generic helper overlay would
    // draw a second copy on top. Other products keep their approved behavior.
    const hoodMaskSleeve=product.id==='hood-mask-shirt'&&activeZone.includes('Sleeve');
    const longPoloCollar=product.id==='long-sleeve-polo'&&activeZone==='Collar';
    // T-shirt text is already rendered inside the exact masked design frame above.
    // Do not paint a second editor-only copy; keeping one rendering path makes
    // Front/Back/Sleeves/Collar placement correspond to the same normalized
    // coordinates consumed by the locked 3D UV textures.
    if(product.id!=='sweat-pants'&&product.id!=='tshirt'&&product.id!=='long-sleeve-tshirt'&&product.id!=='lightweight-jacket'&&product.id!=='shorts'&&product.id!=='hooded-long-sleeve'&&!hoodMaskSleeve&&!longPoloCollar)drawEditorTextOverlay(targetCtx,activeZone,r,rec);
    if(includeGuides)drawLongSleeveWhiteGrid(targetCtx,activeZone,r,rec);
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
// @mapping-end drawZoneComposite



// @mapping-begin rotateSelectionPoint
function rotateSelectionPoint(x,y,cx,cy,a){const dx=x-cx,dy=y-cy,co=Math.cos(a),si=Math.sin(a);return{x:cx+dx*co-dy*si,y:cy+dx*si+dy*co};}
// @mapping-end rotateSelectionPoint

// @mapping-begin selectionGeometry
function selectionGeometry(l,q){
  const a=(Number(l.rotation)||0)*Math.PI/180,cx=q.cx,cy=q.cy;
  const raw=[[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]];
  const corners=raw.map(([x,y])=>rotateSelectionPoint(x,y,cx,cy,a));
  const top=rotateSelectionPoint(q.x+q.w/2,q.y,cx,cy,a),rotateHandle=rotateSelectionPoint(q.x+q.w/2,q.y-34,cx,cy,a);
  const edgeRaw=[
    [q.x,q.y+q.h/2,'l'],
    [q.x+q.w,q.y+q.h/2,'r'],
    [q.x+q.w/2,q.y,'t'],
    [q.x+q.w/2,q.y+q.h,'b']
  ];
  const cropHandles=[
    {...corners[0],id:'tl'},{...corners[1],id:'tr'},{...corners[2],id:'br'},{...corners[3],id:'bl'},
    ...edgeRaw.map(([x,y,id])=>({...rotateSelectionPoint(x,y,cx,cy,a),id}))
  ];
  return{corners,top,rotateHandle,resizeHandles:corners,cropHandles};
}
// @mapping-end selectionGeometry

// @mapping-begin drawSelectionOverlay
function drawSelectionOverlay(){
  const l=activeLayer(),q=activeLayerScreenRect();if(!l||!q)return;ctx.save();
  if(mobileEditorView()){ctx.translate(editorCanvas.width/2,editorCanvas.height/2);ctx.scale(editorZoom,editorZoom);ctx.translate(-editorCanvas.width/2,-editorCanvas.height/2);}
  ctx.lineWidth=2;
  if(isLockedLibraryLayer(l)){
    const g=selectionGeometry(l,q);ctx.strokeStyle='#ff6b00';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(g.corners[0].x,g.corners[0].y);for(let i=1;i<4;i++)ctx.lineTo(g.corners[i].x,g.corners[i].y);ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    const memberRule=designs[product.id]?.teamMaster&&l.type==='text'?window.MQDTeamMaster?.rules.find(r=>r.zone===activeZone&&r.layerId===l.templateLayerId&&r.role==='text'):null;
    ctx.fillStyle='#ff6b00';ctx.font='700 13px Inter, sans-serif';ctx.fillText(memberRule?.allowMove?'Drag to move name':memberRule?'Edit name using its field':'Locked',g.corners[0].x,g.corners[0].y-9);
  }else if(cropMode&&l.type==='image'){
    const g=selectionGeometry(l,q);
    ctx.strokeStyle='#ff6b00';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(g.corners[0].x,g.corners[0].y);for(let i=1;i<4;i++)ctx.lineTo(g.corners[i].x,g.corners[i].y);ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    for(const handle of g.cropHandles){
      const side=handle.id.length===1,size=side?10:12;
      ctx.fillStyle='#fff';ctx.strokeStyle='#ff6b00';ctx.beginPath();ctx.rect(handle.x-size/2,handle.y-size/2,size,size);ctx.fill();ctx.stroke();
    }
  }else{
    const g=selectionGeometry(l,q);ctx.strokeStyle='#1b78ff';ctx.setLineDash([7,5]);ctx.beginPath();ctx.moveTo(g.corners[0].x,g.corners[0].y);for(let i=1;i<4;i++)ctx.lineTo(g.corners[i].x,g.corners[i].y);ctx.closePath();ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(g.top.x,g.top.y);ctx.lineTo(g.rotateHandle.x,g.rotateHandle.y);ctx.stroke();
    ctx.fillStyle='#fff';ctx.strokeStyle='#1b78ff';
    for(const handle of g.resizeHandles){ctx.beginPath();ctx.rect(handle.x-6,handle.y-6,12,12);ctx.fill();ctx.stroke();}
    ctx.beginPath();ctx.arc(g.rotateHandle.x,g.rotateHandle.y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}
// @mapping-end drawSelectionOverlay

// @mapping-begin drawEditor
function drawEditor(){ctx.clearRect(0,0,editorCanvas.width,editorCanvas.height);drawZoneComposite(ctx,editorCanvas.width,editorCanvas.height,true);drawSelectionOverlay();flatMockup?.update();}
// @mapping-end drawEditor

// @mapping-begin makeZoneTextureCanvas
function makeZoneTextureCanvas(zone){return makeCleanZoneDesignCanvas(zone,1600);}
// @mapping-end makeZoneTextureCanvas

// @mapping-begin zoneHasContent
function zoneHasContent(zone){const z=stateFor().zones[zone];return z&&((z.background||'#FFFFFF').toUpperCase()!=='#FFFFFF'||(z.layers||[]).length);}
// @mapping-end zoneHasContent

// @mapping-begin maxLayerScale
function maxLayerScale(layer=activeLayer()){
  // Text can be scaled to twice its previous maximum without changing
  // image sizing limits or any garment mapping/calibration.
  if(layer?.type==='text'){
    if(product.id==='lightweight-jacket')return 5.2;
    if(product.id==='sweat-pants'&&(activeZone==='Front'||activeZone==='Back'))return 8;
    return 4.4;
  }
  if(product.id==='lightweight-jacket')return 2.6;
  return 2.2;
}
// @mapping-end maxLayerScale

// @mapping-begin garmentCopyFamily
function garmentCopyFamily(id){
  if(['shorts','sweat-pants'].includes(id))return 'bottoms';
  if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie','lightweight-jacket','hood-mask-shirt','hooded-long-sleeve'].includes(id))return 'tops';
  return null;
}
// @mapping-end garmentCopyFamily

// @mapping-begin fitGarment
function fitGarment(){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),m=Math.max(size.x,size.y,size.z);garment.position.sub(center);camera.position.set(0,m*.45,m*2.15);camera.near=m/100;camera.far=m*20;camera.updateProjectionMatrix();controls.target.set(0,0,0);controls.update();}
// @mapping-end fitGarment

// @mapping-begin clearDecals
function clearDecals(){while(decalGroup.children.length){const o=decalGroup.children[0];decalGroup.remove(o);o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map?.dispose();m.dispose();});}}
// @mapping-end clearDecals

// @mapping-begin zonePlacement
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
// @mapping-end zonePlacement

// @mapping-begin findPrimaryMesh
function findPrimaryMesh(root=garment){let best=null,score=-1;root?.traverse(o=>{if(!o.isMesh||!o.geometry?.getAttribute('position'))return;const count=o.geometry.index?o.geometry.index.count:o.geometry.getAttribute('position').count;if(count>score){score=count;best=o;}});return best;}
// @mapping-end findPrimaryMesh

// @mapping-begin splitTshirtGeometry
function splitTshirtGeometry(sourceMesh){
 const longSleeve=product.id==='long-sleeve-tshirt';
 const longSleevePolo=product.id==='long-sleeve-polo';
 const shortPolo=product.id==='short-sleeve-polo';
 const geometry=sourceMesh.geometry;if(!geometry?.getAttribute('position')||!sourceMesh.parent)return false;
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index;
 const buffers=panelNames.map(()=>({P:[],N:[],UV:[],min:{x:Infinity,y:Infinity,z:Infinity},max:{x:-Infinity,y:-Infinity,z:-Infinity}}));
 const sleeveInteriors=new Map();
 const count=index?index.count:pos.count,faceCount=(count/3)|0,useExactCollar=product.id==='tshirt'&&faceCount===TSHIRT_FACE_COUNT,useExactPoloCollar=shortPolo&&faceCount===POLO_FACE_COUNT;
 if(product.id==='tshirt'&&!useExactCollar)console.warn('MQD T-shirt collar topology mask disabled: expected',TSHIRT_FACE_COUNT,'faces but found',faceCount);
 if(shortPolo&&!useExactPoloCollar)console.warn('MQD Short Sleeve Polo collar topology mask disabled: expected',POLO_FACE_COUNT,'faces but found',faceCount);
 for(let t=0;t<count;t+=3){
  const faceIndex=(t/3)|0;
  const triangle=[0,1,2].map(k=>{const i=index?index.getX(t+k):t+k;return[pos.getX(i),pos.getY(i),pos.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i)];});
  const parts=longSleevePolo?partitionLongSleevePoloTriangle(triangle):longSleeve?partitionLongSleeveTriangle(triangle):useExactPoloCollar?(isPoloCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):useExactCollar?(isTshirtCollarFace(faceIndex)?[[4,triangle]]:partitionTshirtBodyTriangle(triangle)):partitionTriangle(triangle);
  for(const [zi,poly] of parts){
   const out=buffers[zi];
   for(let k=1;k<poly.length-1;k++){
    const face=[poly[0],poly[k],poly[k+1]],interior=useExactCollar&&(isTshirtSleeveInterior(panelNames[zi],face)||zi===4&&isTshirtCollarInterior(face));
    if(interior&&!sleeveInteriors.has(zi))sleeveInteriors.set(zi,{P:[],N:[]});
    const target=interior?sleeveInteriors.get(zi):out;
    for(const v of face){
     target.P.push(...v.slice(0,3));const length=Math.hypot(...v.slice(3))||1;target.N.push(...v.slice(3).map(n=>n/length));
     // Retain full panel bounds so the sleeve artwork keeps its approved frame.
     ['x','y','z'].forEach((axis,j)=>{out.min[axis]=Math.min(out.min[axis],v[j]);out.max[axis]=Math.max(out.max[axis],v[j]);});
    }
   }
  }
 }
 if(buffers.some(b=>!b.P.length))return false;
 const group=new THREE.Group();group.name='MQD_Tshirt_Zones';group.position.copy(sourceMesh.position);group.quaternion.copy(sourceMesh.quaternion);group.scale.copy(sourceMesh.scale);
 const base=Array.isArray(sourceMesh.material)?sourceMesh.material[0]:sourceMesh.material;
 buffers.forEach((b,zi)=>{
  const uvBounds=product.id==='tshirt'&&tshirtSleeveArtworkBounds[panelNames[zi]]||b;
  for(let i=0;i<b.P.length;i+=3)b.UV.push(...((longSleeve||longSleevePolo)?longSleevePanelUv:product.id==='tshirt'?tshirtSideWrapUv:panelUv)(panelNames[zi],...b.P.slice(i,i+3),uvBounds));
  // Unwrap triangles across the angular seam without stretching across the entire texture.
  if(zi>=2)for(let i=0;i<b.UV.length;i+=6){const us=[b.UV[i],b.UV[i+2],b.UV[i+4]];if(Math.max(...us)-Math.min(...us)>.5)for(let k=0;k<6;k+=2)if(b.UV[i+k]<.5)b.UV[i+k]+=1;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.N,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.UV,2));g.computeBoundingBox();g.computeBoundingSphere();
  if(product.id==='tshirt'&&(zi<2||zi===4))applyTshirtSurfaceUv(panelNames[zi],g);
  if(product.id==='tshirt'&&zi===0){const inner=createTshirtNeckInterior(g,THREE,zoneState('Front').background||'#FFFFFF');group.add(inner);tshirtInteriorMeshes.set('Front',inner);}
  const m=base?.clone?base.clone():new THREE.MeshStandardMaterial();m.color.set('#fff');m.vertexColors=false;
  for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in m)m[key]=null;
  m.roughness=.88;m.metalness=0;m.needsUpdate=true;
  if(product.id==='tshirt'){m.side=THREE.FrontSide;m.depthTest=true;m.depthWrite=true;m.transparent=false;m.opacity=1;}
  const mesh=new THREE.Mesh(g,m);mesh.name='MQD_'+panelNames[zi].replace(/\s+/g,'_');group.add(mesh);tshirtZoneMeshes.set(panelNames[zi],mesh);
 });
 for(const [zi,interior] of sleeveInteriors){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(interior.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(interior.N,3));
  const zone=panelNames[zi],m=new THREE.MeshStandardMaterial({color:zoneState(zone).background||'#FFFFFF',roughness:1,metalness:0,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.name='MQD_Tshirt_'+zone.replace(/\s+/g,'_')+'_Interior';group.add(mesh);tshirtInteriorMeshes.set(zone,mesh);
 }
 if(product.id==='tshirt'){tshirtInteriorMeshes.set('Collar',refineTshirtCollar(tshirtZoneMeshes.get('Collar'),tshirtInteriorMeshes.get('Collar'),THREE,zoneState('Collar').background||'#FFFFFF',[tshirtZoneMeshes.get('Front'),tshirtZoneMeshes.get('Back')]));const oldNeck=tshirtInteriorMeshes.get('Front');if(oldNeck)oldNeck.visible=false;}
 sourceMesh.parent.add(group);tshirtZoneGroup=group;sourceMesh.visible=false;return true;
}
// @mapping-end splitTshirtGeometry

// @mapping-begin splitFleeceHoodieGeometry
function splitFleeceHoodieGeometry(sourceMesh){
 const geometry=sourceMesh.geometry;if(!geometry?.getAttribute('position')||!sourceMesh.parent)return false;
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index;
 const buffers=hoodiePanelNames.map(()=>({P:[],N:[]}));
 const count=index?index.count:pos.count;
 for(let t=0;t<count;t+=3){
  const triangle=[0,1,2].map(k=>{const i=index?index.getX(t+k):t+k;return[pos.getX(i),pos.getY(i),pos.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i)];});
  const parts=partitionFleeceHoodieTriangle(triangle);
  for(const [zi,poly] of parts){
   const out=buffers[zi];
   for(let k=1;k<poly.length-1;k++)for(const v of[poly[0],poly[k],poly[k+1]]){
    out.P.push(v[0],v[1],v[2]);
    const length=Math.hypot(v[3],v[4],v[5])||1;out.N.push(v[3]/length,v[4]/length,v[5]/length);
   }
  }
 }
 if(buffers.some(b=>!b.P.length))return false;
 const group=new THREE.Group();group.name='MQD_Fleece_Hoodie_Zones';group.position.copy(sourceMesh.position);group.quaternion.copy(sourceMesh.quaternion);group.scale.copy(sourceMesh.scale);
 const base=Array.isArray(sourceMesh.material)?sourceMesh.material[0]:sourceMesh.material;
 buffers.forEach((b,zi)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.N,3));g.computeBoundingBox();g.computeBoundingSphere();
  const m=base?.clone?base.clone():new THREE.MeshStandardMaterial();
  for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in m)m[key]=null;
  if(m.color)m.color.set(zoneState(hoodiePanelNames[zi]).background||'#FFFFFF');m.roughness=.88;m.metalness=0;m.transparent=false;m.opacity=1;m.needsUpdate=true;
  const mesh=new THREE.Mesh(g,m);mesh.name='MQD_Hoodie_'+hoodiePanelNames[zi].replace(/\s+/g,'_');group.add(mesh);fleeceHoodieZoneMeshes.set(hoodiePanelNames[zi],mesh);
 });
 sourceMesh.parent.add(group);fleeceHoodieZoneGroup=group;sourceMesh.visible=false;garment.updateMatrixWorld(true);return true;
}
// @mapping-end splitFleeceHoodieGeometry

// @mapping-begin updateFleeceHoodieZoneColors
function updateFleeceHoodieZoneColors(){
 if(product.id!=='fleece-hoodie'||!fleeceHoodieZoneMeshes.size)return false;
 product.zones.forEach(zone=>{const mesh=fleeceHoodieZoneMeshes.get(zone);if(!mesh)return;if(mesh.material?.color)mesh.material.color.set(zoneState(zone).background||'#FFFFFF');mesh.material.needsUpdate=true;});
 return true;
}
// @mapping-end updateFleeceHoodieZoneColors

// @mapping-begin rebuildFleeceHoodiePreview
function rebuildFleeceHoodiePreview(){
 if(product.id!=='fleece-hoodie'||!fleeceHoodieZoneMeshes.size)return false;
 clearDecals();updateFleeceHoodieZoneColors();garment.updateMatrixWorld(true);
 product.zones.forEach(zone=>{
  const z=stateFor().zones[zone];if(!z?.layers?.some(l=>l.visible!==false))return;
  const target=fleeceHoodieZoneMeshes.get(zone);if(!target)return;
  for(const [batchIndex,batch] of hoodieArtworkBatches(zone,z.layers).entries()){
  const canvas=makeCleanZoneArtworkCanvas(zone,1600,{layerFilter:layer=>batch.layers.includes(layer),imageFrame:layer=>hoodieSplashPreviewFrame(zone,layer)}),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  // Hoodie sleeve zones use opposite X signs from the generic projector.
  // Size the projector from the actual sleeve so lower-arm artwork is included.
  const q=zonePlacement(zone);
  if(zone==='Left Sleeve'||zone==='Right Sleeve'){
    const sleeveBox=new THREE.Box3().setFromObject(target),sleeveSize=sleeveBox.getSize(new THREE.Vector3()),center=sleeveBox.getCenter(new THREE.Vector3());
    const side=zone==='Left Sleeve'?1:-1;
    q.p.copy(center);
    q.r.set(0,side*Math.PI/2,0);
    q.d.set(sleeveSize.z*1.02,sleeveSize.y*1.02,sleeveSize.x*1.02);
  }
  // The flat Front frame runs from the front shoulder edge to its waistband.
  // The whole-garment box includes the hood and compresses that vertical frame,
  // leaving high chest artwork too low. Keep horizontal placement and every
  // other zone unchanged; special full-panel backgrounds retain their own fit.
  if(zone==='Front'&&!batch.splash){
    const frontBox=new THREE.Box3().setFromObject(target);
    q.p.y=(frontBox.min.y+frontBox.max.y)/2;
    q.d.y=Math.max(.001,frontBox.max.y-frontBox.min.y);
  }
  if(batch.splash){
    const box=new THREE.Box3().setFromObject(target),size=box.getSize(new THREE.Vector3());
    q.p.copy(box.getCenter(new THREE.Vector3()));
    q.r.set(0,zone==='Left Sleeve'?Math.PI/2:zone==='Right Sleeve'?-Math.PI/2:zone==='Back'||zone==='Hood'?Math.PI:0,0);
    q.d.set(zone.includes('Sleeve')?size.z:size.x,size.y,zone.includes('Sleeve')?size.x*2:size.z*2);
    q.d.max(new THREE.Vector3(.001,.001,.001));
  }
  try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10+batchIndex;decalGroup.add(mesh);}catch(e){tex.dispose();console.warn('Fleece Hoodie decal failed',zone,e);}
  }
 });
 return true;
}
// @mapping-end rebuildFleeceHoodiePreview

// @mapping-begin disposeZoneTexture
function disposeZoneTexture(mesh){const map=mesh?.material?.map;if(map){mesh.material.map=null;map.dispose();}}
// @mapping-end disposeZoneTexture

// @mapping-begin hasOpaqueImageEdges
function hasOpaqueImageEdges(image){
 if(!image?.complete||!(image.naturalWidth||image.width)||!(image.naturalHeight||image.height))return false;
 if(opaqueImageEdgeCache.has(image))return opaqueImageEdgeCache.get(image);
 let opaque=false;
 try{
  const canvas=document.createElement('canvas');canvas.width=2;canvas.height=2;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
   const sx=Math.min(width-1,Math.floor(width*(col?.98:.02))),sy=Math.min(height-1,Math.floor(height*(row?.98:.02)));
   ctx.drawImage(image,sx,sy,1,1,col,row,1,1);
  }
  const pixels=ctx.getImageData(0,0,2,2).data;
  opaque=[3,7,11,15].every(index=>pixels[index]>=250);
 }catch(error){console.warn('Background coverage could not be checked',error);}
 opaqueImageEdgeCache.set(image,opaque);return opaque;
}
// @mapping-end hasOpaqueImageEdges

// @mapping-begin makeShirtPreviewArtwork
function makeShirtPreviewArtwork(zone,maxSide,options={}){
 // Correct the folded long-polo collar reading direction for text only.
 const longPoloCollar=product.id==='long-sleeve-polo'&&zone==='Collar';
 // The angular collar UV wraps a long circumference onto a narrow vertical band.
 // Restore glyph height without stretching images or moving the text anchor.
 const settings={...options,flipX:longPoloCollar?true:options.flipX,textScaleY:longPoloCollar?4:options.textScaleY,
  textStyle:longPoloCollar?layer=>({...layer,scale:(layer.scale||1)*1.5,bold:true,weight:layer.bold===false?700:900,
   ...(!Number(layer.strokeWidth)?{strokeWidth:layer.bold===false?.45:.8,strokeColor:layer.color||'#111111'}:{})}):options.textStyle,
  imageFrame:(layer,b)=>shirtSplashPreviewFrame(product.id,zone,layer,b)};
 const shiftedBack=product.id==='short-sleeve-polo'&&zone==='Back'&&zoneState(zone).layers.some(layer=>layer.visible!==false&&(isShirtSplash(product.id,zone,layer)||isCutlineBottomArtwork(layer)));
 if(!shiftedBack)return makeCleanZoneArtworkCanvas(zone,maxSide,settings);
 // Preserve the approved back shift for every other layer. The water alone
 // reaches the hem, and is composited in its original stacking position.
 const layers=zoneState(zone).layers||[];
 const out=makeCleanZoneArtworkCanvas(zone,maxSide,{layerFilter:()=>false});
 const ctx=out.getContext('2d');
 const batches=[];
 for(const layer of layers){
  if(layer.visible===false)continue;
  const splash=(isShirtSplash(product.id,zone,layer)||isCutlineBottomArtwork(layer)),last=batches.at(-1);
  if(last&&last.splash===splash)last.layers.push(layer);else batches.push({splash,layers:[layer]});
 }
 for(const batch of batches){
  const artwork=makeCleanZoneArtworkCanvas(zone,maxSide,{...settings,layerFilter:layer=>batch.layers.includes(layer)});
  ctx.drawImage(artwork,0,batch.splash?0:-out.height*.08);
 }
 return out;
}
// @mapping-end makeShirtPreviewArtwork

// @mapping-begin updateTshirtZoneTextures
function updateTshirtZoneTextures(){
 if(!['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)||!tshirtZoneMeshes.size)return false;
 for(const [zone,mesh] of tshirtInteriorMeshes)mesh.material.color.set(zoneState(zone).background||'#FFFFFF');
 const textureMax=previewTextureMax();
 product.zones.forEach(zone=>{
  const mesh=tshirtZoneMeshes.get(zone);if(!mesh)return;
  const state=zoneState(zone),hasArtwork=(state.layers||[]).some(layer=>layer.visible!==false);
  if(!hasArtwork){
    disposeZoneTexture(mesh);
    if(mesh.material?.color)mesh.material.color.set(state.background||'#FFFFFF');
    mesh.material.transparent=false;mesh.material.opacity=1;mesh.material.needsUpdate=true;
    return;
  }
  const accurateTshirtBody=product.id==='tshirt'&&(zone==='Front'||zone==='Back');
  if(accurateTshirtBody||product.id==='long-sleeve-tshirt'&&(zone==='Front'||zone==='Back')){
    const rec=ensureTemplateImage(zone);
    if(rec?.maskCanvas&&rec.bounds&&mesh.userData.patternMask!==rec.maskCanvas){
      const mask=rec.maskCanvas.getContext('2d').getImageData(0,0,rec.maskCanvas.width,rec.maskCanvas.height);
      const mapped=bodyPatternUv(mesh.geometry.getAttribute('position').array,zone,mask,rec.bounds);
      const uv=mesh.geometry.getAttribute('uv').array;
      if(accurateTshirtBody){
        // Match the actual 2D neckline and hem without changing the side wrap.
        for(let i=1;i<uv.length;i+=2)uv[i]=mapped[i];
      }else uv.set(mapped);
      mesh.geometry.getAttribute('uv').needsUpdate=true;
      mesh.userData.patternMask=rec.maskCanvas;
    }
  }
  disposeZoneTexture(mesh);
  // Both T-shirt body panels now use the pattern neckline/hem frame.
  // All layers share that geometry mapping, without foreground-only offsets.
  const artwork=product.id==='long-sleeve-tshirt'
    ?makeLongSleeveTshirtArtworkCanvas(zone,textureMax,true)
    :makeShirtPreviewArtwork(zone,textureMax),canvas=document.createElement('canvas');
  canvas.width=artwork.width;canvas.height=artwork.height;
  const paint=canvas.getContext('2d');paint.fillStyle=zoneState(zone).background||'#FFFFFF';paint.fillRect(0,0,canvas.width,canvas.height);
  const artworkY=product.id==='short-sleeve-polo'&&zone==='Back'?-canvas.height*.08:0;
  const splashBack=product.id==='short-sleeve-polo'&&zone==='Back'&&state.layers.some(layer=>layer.visible!==false&&(isShirtSplash(product.id,zone,layer)||isCutlineBottomArtwork(layer)));
  paint.drawImage(artwork,0,splashBack?0:artworkY);
  const interior=tshirtInteriorMeshes.get(zone);
  if(interior&&!interior.userData.neutralNeckInterior){
    const samplePoints=[[.08,.08],[.92,.08],[.08,.92],[.92,.92]],rgb=[0,0,0];
    for(const [u,v] of samplePoints){
      const pixel=paint.getImageData(Math.floor(u*(canvas.width-1)),Math.floor(v*(canvas.height-1)),1,1).data;
      for(let channel=0;channel<3;channel++)rgb[channel]+=pixel[channel]/samplePoints.length;
    }
    interior.material.color.set(`rgb(${rgb.map(Math.round).join(',')})`);
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=true;if(zone.includes('Sleeve')||zone==='Collar')tex.wrapS=THREE.RepeatWrapping;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  mesh.material.map=tex;mesh.material.transparent=false;mesh.material.opacity=1;if(mesh.material.color)mesh.material.color.set('#fff');mesh.material.needsUpdate=true;
 });
 return true;
}
// @mapping-end updateTshirtZoneTextures

// @mapping-begin findLargestMesh
function findLargestMesh(){let best=null,score=-1;garment?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const b=new THREE.Box3().setFromObject(o),s=b.getSize(new THREE.Vector3()),v=s.x*s.y*s.z;if(v>score){score=v;best=o;}});return best;}
// @mapping-end findLargestMesh

// @mapping-begin rebuildDecals
function rebuildDecals(){if(!garment||!decalGroup)return;clearDecals();const target=findLargestMesh();if(!target)return;product.zones.forEach(zone=>{if(!zoneHasContent(zone))return;const canvas=makeZoneTextureCanvas(zone),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();const q=zonePlacement(zone);try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;decalGroup.add(mesh);}catch(e){console.warn('Decal failed',zone,e);}});}
// @mapping-end rebuildDecals

// @mapping-begin rebuildJacketPreview
function rebuildJacketPreview(){
 clearDecals();garment.updateMatrixWorld(true);
 for(const [zone,target] of lightweightJacketZones){
  // Keep the approved direct-surface Front mapping. The Back stays on the
  // established projector so the splash does not shear across the folded side
  // seam; render that projected artwork double-sided so folded rear faces do
  // not disappear and expose a white wedge through the water.
  if(zone==='Front'){
   const state=zoneState(zone),artwork=makeCleanZoneArtworkCanvas(zone,1600,{imageFrame:layer=>jacketSplashPreviewFrame(zone,layer)});
   const canvas=document.createElement('canvas');canvas.width=artwork.width;canvas.height=artwork.height;
   const ctx=canvas.getContext('2d');ctx.fillStyle=state.background||'#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(artwork,0,0);
   if(!target.geometry.getAttribute('uv'))setJacketPanelUvs(target,zone);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
   target.material.map?.dispose();target.material.map=texture;target.material.color.set('#FFFFFF');target.material.needsUpdate=true;
   continue;
  }
  const state=zoneState(zone);
  if(target.material.map){target.material.map.dispose();target.material.map=null;}
  target.material.color.set(state.background||'#FFFFFF');target.material.needsUpdate=true;
  if(!state.layers.some(l=>l.visible!==false))continue;
  const canvas=makeCleanZoneArtworkCanvas(zone,1600,{imageFrame:layer=>jacketSplashPreviewFrame(zone,layer)}),tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  const q=jacketProjection(target,zone);
  try{
   const geometry=new DecalGeometry(target,q.p,q.r,q.d);
   const material=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,side:zone==='Back'?THREE.DoubleSide:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});
   const artwork=new THREE.Mesh(geometry,material);artwork.renderOrder=10;decalGroup.add(artwork);
  }catch(e){tex.dispose();console.error('Lightweight Jacket artwork projection failed',zone,e);}
 }
}
// @mapping-end rebuildJacketPreview

// @mapping-begin rebuildHoodMaskPreview
function rebuildHoodMaskPreview(){
 clearDecals();
 for(const [zone,mesh] of hoodMaskPanels){
  const textMap={flipX:zone.includes('Sleeve'),offsetY:zone==='Front'||zone==='Back'?-.13:0,imageFrame:(layer,b)=>shirtSplashPreviewFrame(product.id,zone,layer,b)};
  const artwork=makeCleanZoneArtworkCanvas(zone,1600,textMap),canvas=document.createElement('canvas');
  canvas.width=artwork.width;canvas.height=artwork.height;const ctx=canvas.getContext('2d');
  ctx.fillStyle=zoneState(zone).background||'#FFFFFF';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(artwork,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
  if(zone.includes('Sleeve')||zone==='Hood')texture.wrapS=THREE.RepeatWrapping;
  mesh.material.map?.dispose();mesh.material.map=texture;mesh.material.color.set('#FFFFFF');mesh.material.needsUpdate=true;
 }
}
// @mapping-end rebuildHoodMaskPreview

// @mapping-begin rebuildHoodedLongSleevePreview
function rebuildHoodedLongSleevePreview(){
 clearDecals();
 for(const [zone,mesh] of hoodedLongSleevePanels){
  disposeZoneTexture(mesh);
  // The supplied sleeve geometry reverses its outside-facing U direction;
  // mirror text only so the 2D reading direction is preserved on the garment.
  const transform=hoodedLongSleeveArtworkTransform(zone);
  const artwork=makeCleanZoneArtworkCanvas(zone,1600,{...transform,imageFrame:(layer,b)=>shirtSplashPreviewFrame(product.id,zone,layer,b),layerFilter:layer=>zone!=='Front'||layer.type!=='text'}),canvas=document.createElement('canvas');
  canvas.width=artwork.width;canvas.height=artwork.height;
  const paint=canvas.getContext('2d');paint.fillStyle=zoneState(zone).background||'#FFFFFF';paint.fillRect(0,0,canvas.width,canvas.height);paint.drawImage(artwork,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;
  if(zone.includes('Sleeve')||zone==='Hood')texture.wrapS=THREE.RepeatWrapping;
  texture.needsUpdate=true;mesh.material.map=texture;mesh.material.color.set('#ffffff');mesh.material.transparent=false;mesh.material.opacity=1;mesh.material.needsUpdate=true;
 }

 // Front text is its own conforming pass: it remains above the hood edge but
 // below the garment's untouched physical drawstrings.
 const front=hoodedLongSleevePanels.get('Front');
 const frontText=zoneState('Front').layers.some(layer=>layer.visible!==false&&layer.type==='text');
 if(front&&frontText){
  garment.updateMatrixWorld(true);front.updateMatrixWorld(true);
  const canvas=makeCleanZoneArtworkCanvas('Front',1600,{...hoodedLongSleeveArtworkTransform('Front'),layerFilter:layer=>layer.type==='text'});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  const geometry=front.geometry.clone();
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,alphaTest:.01,depthTest:false,depthWrite:false,side:THREE.FrontSide,toneMapped:false});
  const overlay=new THREE.Mesh(geometry,material);overlay.name='MQD_Hooded_Long_Front_Text';overlay.matrix.copy(front.matrixWorld);overlay.matrixAutoUpdate=false;overlay.renderOrder=20;decalGroup.add(overlay);
 }
 const strings=garment.getObjectByName('MQD_Hooded_Long_Drawstrings');
 if(strings){strings.material.transparent=true;strings.material.opacity=1;strings.material.depthTest=true;strings.material.depthWrite=false;strings.material.needsUpdate=true;strings.renderOrder=30;}
 return true;
}
// @mapping-end rebuildHoodedLongSleevePreview

// @mapping-begin rebuildHatPreview
function rebuildHatPreview(){
 if(product.id!=='hat'||!hatZoneMeshes)return false;
 clearDecals();garment.updateMatrixWorld(true);
 for(const [zone,target] of hatZoneMeshes){
  const state=zoneState(zone);
  if(target.material?.color)target.material.color.set(state.background||'#FFFFFF');
  target.material.needsUpdate=true;
  if(!state.layers.some(l=>l.visible!==false))continue;
  const canvas=makeCleanZoneArtworkCanvas(zone,1600),tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  const q=hatProjection(target,zone);
  try{
   const geometry=new DecalGeometry(target,q.p,q.r,q.d);
   const material=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});
   const artwork=new THREE.Mesh(geometry,material);artwork.renderOrder=10;decalGroup.add(artwork);
  }catch(e){tex.dispose();console.error('Hat artwork projection failed',zone,e);}
 }
 return true;
}
// @mapping-end rebuildHatPreview

// @mapping-begin rebuildShortsPreview
function rebuildShortsPreview(){
 if(product.id!=='shorts'||!shortsPanelMeshes?.size)return false;
 clearDecals();
 for(const [zone,mesh] of shortsPanelMeshes){
  disposeZoneTexture(mesh);
  const artwork=makeCleanZoneArtworkCanvas(zone,1600),canvas=document.createElement('canvas');canvas.width=artwork.width;canvas.height=artwork.height;
  const paint=canvas.getContext('2d');paint.fillStyle=zoneState(zone).background||'#FFFFFF';paint.fillRect(0,0,canvas.width,canvas.height);paint.drawImage(artwork,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  mesh.material.map=texture;mesh.material.color.set('#ffffff');mesh.material.transparent=false;mesh.material.opacity=1;mesh.material.needsUpdate=true;
 }
 return true;
}
// @mapping-end rebuildShortsPreview

// @mapping-begin rebuildMaskPreview
function rebuildMaskPreview(){
 if(product.id!=='mask'||!maskSurface)return false;
 clearDecals();
 const canvas=makeCleanZoneArtworkCanvas('Entire Mask',1600);
 const texture=new THREE.CanvasTexture(canvas);
 texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
 return applyMaskTexture(maskSurface,texture,zoneState('Entire Mask').background,THREE);
}
// @mapping-end rebuildMaskPreview

// @mapping-begin rebuildGarmentPreview
function rebuildGarmentPreview(){
 if(!previewPaneVisible()){mobilePreviewDirty=true;return;}
 mobilePreviewDirty=false;
 if(product.id==='sweat-pants'&&sweatPanels){clearDecals();for(const [zone,mesh] of sweatPanels.panels){disposeZoneTexture(mesh);const canvas=makeCleanZoneDesignCanvas(zone,1600),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();mesh.material.map=tex;mesh.material.needsUpdate=true;}return;}if(product.id==='mask'&&maskSurface){rebuildMaskPreview();return;}if(product.id==='hood-mask-shirt'&&hoodMaskPanels){rebuildHoodMaskPreview();return;}if(product.id==='hooded-long-sleeve'&&hoodedLongSleevePanels){rebuildHoodedLongSleevePreview();return;}if(product.id==='lightweight-jacket'&&lightweightJacketZones){rebuildJacketPreview();return;}if(product.id==='hat'&&hatZoneMeshes){rebuildHatPreview();return;}if(product.id==='shorts'&&shortsPanelMeshes?.size){rebuildShortsPreview();return;}if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)&&tshirtZoneMeshes.size){clearDecals();updateTshirtZoneTextures();return;}if(product.id==='fleece-hoodie'&&fleeceHoodieZoneMeshes.size){rebuildFleeceHoodiePreview();return;}rebuildDecals();}
// @mapping-end rebuildGarmentPreview

// @mapping-begin loadGarment
function loadGarment(){const loadVersion=++garmentLoadVersion;window.dispatchEvent(new CustomEvent('mqd:garment-loading',{detail:{productId:product.id,loadVersion}}));if(!renderer)init3D();if(garment){scene.remove(garment);garment.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose?.();m.dispose?.();});});garment=null;}lightweightJacketZones=null;hoodMaskPanels=null;hoodedLongSleevePanels=null;hatZoneMeshes=null;shortsPanelMeshes=null;sweatPanels=null;maskSurface=null;tshirtZoneMeshes.clear();tshirtInteriorMeshes.clear();tshirtZoneGroup=null;fleeceHoodieZoneMeshes.clear();fleeceHoodieZoneGroup=null;clearDecals();preloadTemplates();new GLTFLoader().load(product.model,async g=>{if(product.id==='tshirt'&&loadVersion===garmentLoadVersion){try{await loadTshirtSurfaceUv();}catch(error){g.scene.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.filter(Boolean).forEach(m=>m.dispose?.());});if(loadVersion===garmentLoadVersion){console.error(error);window.dispatchEvent(new CustomEvent('mqd:garment-error',{detail:{productId:'tshirt',loadVersion,message:error.message}}));}return;}}if(loadVersion!==garmentLoadVersion){g.scene.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.filter(Boolean).forEach(m=>{m.map?.dispose?.();m.dispose?.();});});return;}garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)){const source=findPrimaryMesh(garment);if(source)try{splitTshirtGeometry(source);}catch(error){
 for(const mesh of [...tshirtZoneMeshes.values(),...tshirtInteriorMeshes.values()]){mesh.geometry?.dispose();mesh.material?.dispose();}
 tshirtZoneMeshes.clear();tshirtInteriorMeshes.clear();tshirtZoneGroup=null;
 scene.remove(garment);garment.traverse(o=>{o.geometry?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.filter(Boolean).forEach(m=>m.dispose?.());});garment=null;
 console.error(error);window.dispatchEvent(new CustomEvent('mqd:garment-error',{detail:{productId:product.id,loadVersion,message:error.message}}));return;
}}if(product.id==='fleece-hoodie'){const source=findPrimaryMesh(garment);if(source)splitFleeceHoodieGeometry(source);}if(product.id==='mask'){const source=findPrimaryMesh(garment);if(source)maskSurface=createMaskSurface(source,THREE);}if(product.id==='hood-mask-shirt'){const source=findPrimaryMesh(garment);if(source)hoodMaskPanels=createHoodMaskPanels(source);}if(product.id==='hooded-long-sleeve'){const source=findPrimaryMesh(garment);if(source)hoodedLongSleevePanels=createHoodedLongSleevePanels(source);}if(product.id==='lightweight-jacket'){const source=findPrimaryMesh(garment);if(source)lightweightJacketZones=createJacketZones(source);}if(product.id==='hat'){const source=findPrimaryMesh(garment);if(source)hatZoneMeshes=createHatZones(source);}if(product.id==='sweat-pants'){const source=findPrimaryMesh(garment);if(source){sweatPanels=createSweatPanels(source,THREE);for(const [zone,mesh] of sweatPanels.panels)sweatTemplates.set(zone,sweatTemplate(mesh,sweatPanels.bounds));drawEditor();}}if(product.id==='shorts'){const source=findPrimaryMesh(garment);if(source)shortsPanelMeshes=createShortsPanels(source);}rebuildGarmentPreview();window.dispatchEvent(new CustomEvent('mqd:garment-ready',{detail:{productId:product.id,loadVersion}}));},undefined,error=>{console.error(error);window.dispatchEvent(new CustomEvent('mqd:garment-error',{detail:{productId:product.id,loadVersion,message:error?.message||String(error)}}));});}
// @mapping-end loadGarment

// @mapping-begin duplicateLayerIntoZone
function duplicateLayerIntoZone(source,zone,{offset=false}={}){
  const target=zoneState(zone);
  if(target.layers.length>=maxZoneLayers(product,zone))return false;
  const copy={...source,id:'layer-'+layerSeq++,label:'Layer '+(target.layers.length+1),crop:source.crop?{...source.crop}:undefined};
  if(product.id==='tshirt'&&activeZone!==zone&&['Front','Back'].includes(activeZone)&&['Front','Back'].includes(zone)&&!source.libraryLocked&&!source.chatBackground){
    const frame=z=>{
      const rec=ensureTemplateImage(z),mesh=tshirtZoneMeshes.get(z);
      if(!rec?.maskCanvas||!mesh)return null;
      const mask=rec.maskCanvas.getContext('2d').getImageData(0,0,rec.maskCanvas.width,rec.maskCanvas.height);
      return tshirtBodyPlacementFrame(mesh.geometry.getAttribute('position').array,z,mask,rec.bounds,zoneDesignAspect(z));
    };
    const from=frame(activeZone),to=frame(zone);
    if(from&&to)Object.assign(copy,matchTshirtDuplicatePlacement(source,from,to));
  }
  if(offset){copy.x=(source.x||0)+6;copy.y=(source.y||0)+6;}
  target.layers.push(copy);
  return copy;
}
// @mapping-end duplicateLayerIntoZone

// @mapping-begin calibration
const MQD_TSHIRT_ZONE_CALIBRATION='v26-surface-uv-collar-strip';
// @mapping-end calibration

// @mapping-begin drawMappedImageLayer
function drawMappedImageLayer(c,l,b){
  if(!l.image)return;
  const fullW=Math.max(1,l.image.naturalWidth||l.image.width),fullH=Math.max(1,l.image.naturalHeight||l.image.height),content=normalizedLibraryContentBounds(l);
  if(content){
    const sx=fullW*content.left,sy=fullH*content.top,sw=Math.max(1,fullW*(content.right-content.left)),sh=Math.max(1,fullH*(content.bottom-content.top));
    const base=Math.max(b.w/sw,b.h/sh),scale=base*(l.scale||1),dw=sw*scale,dh=sh*scale;
    c.scale(l.flipX?-1:1,l.flipY?-1:1);c.drawImage(l.image,sx,sy,sw,sh,-dw/2,-dh/2,dw,dh);return;
  }
  const crop=l.crop||{left:0,top:0,right:0,bottom:0};
  const left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
  const sx=fullW*left,sy=fullH*top,sw=Math.max(1,fullW*(1-left-right)),sh=Math.max(1,fullH*(1-top-bottom));
  const base=Math.max(b.w/fullW,b.h/fullH),scale=base*(l.scale||1),iw=fullW*scale,ih=fullH*scale;
  const dx=-iw/2+iw*left,dy=-ih/2+ih*top,dw=iw*(1-left-right),dh=ih*(1-top-bottom);
  c.scale(l.flipX?-1:1,l.flipY?-1:1);c.drawImage(l.image,sx,sy,sw,sh,dx,dy,dw,dh);
}
// @mapping-end drawMappedImageLayer
