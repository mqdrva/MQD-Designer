import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {shortsTemplatePolygons} from '../v20/shorts-panels.js';
import {shirtSplashCutFrame} from '../v20/shirt-splash-preview.js';
import {WATER_SPLASH_2,GRASS_BOTTOM,isWaterSplash2,isCutlineBottomArtwork,drawFittedSplash,splashFit} from '../v20/water-splash-fit.js';
import {hoodieArtworkBatches} from '../v20/hoodie-splash-preview.js';
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const products=vm.runInNewContext(section('const seed=','const $=')+'seed');
const image=await loadImage(process.argv[2]);
const assetId=process.argv[3]==='grass'?GRASS_BOTTOM:WATER_SPLASH_2;
const ctx={document:{createElement:()=>createCanvas(1,1)},shortsTemplatePolygons,shirtSplashCutFrame,drawFittedSplash,console};
vm.createContext(ctx);
vm.runInContext(section('function buildTemplateMask(','function scaleBounds(')+section('function measureVisibleImageBounds(','function normalizedLibraryContentBounds(')+section('function waterSplashCut(','function drawLayerStack('),ctx);
ctx.image=image;
const content=vm.runInContext('measureVisibleImageBounds(image)',ctx);
assert.ok(content.left>0&&content.right<1,'source padding is measured');
function alphaBounds(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let l=canvas.width,r=-1,b=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]>12){l=Math.min(l,x);r=Math.max(r,x);b=Math.max(b,y);}return{l,r,b};}
let count=0;
for(const product of products){
 ctx.product=product;
 for(const zone of product.zones){
  const t=product.templates[zone];let rec=null;
  if(t.path&&product.id!=='sweat-pants'){
   const img=await loadImage(new URL('..'+t.path,import.meta.url));
   ctx.img=img;ctx.zone=zone;
   const jacket=product.id==='lightweight-jacket',solid=['hood-mask-shirt','hooded-long-sleeve'].includes(product.id)&&['Front','Back','Left Sleeve','Right Sleeve'].includes(zone);
   rec=vm.runInContext(`buildTemplateMask(img,zone,${jacket&&zone.includes('Sleeve')},${jacket&&zone==='Back'},${solid},${product.id==='long-sleeve-polo'&&zone.includes('Sleeve')})`,ctx);
   rec.img=img;
  }
  ctx.ensureTemplateImage=()=>rec;ctx.rec=rec;ctx.zone=zone;
  const cut=vm.runInContext('waterSplashCut(zone,rec)',ctx);
  const ratio=rec?(t.width/t.height)*(rec.bounds.w/rec.img.width)/(rec.bounds.h/rec.img.height):t.width/t.height;
  const fit=splashFit(content,cut,ratio);
  assert.ok(Math.abs(fit.left+fit.width-cut.right)<1e-9);
  assert.ok(Math.abs(fit.top+fit.height-cut.bottom)<1e-9);
  assert.ok(fit.width>0&&fit.height>0&&Number.isFinite(fit.height));
  const w=600,h=Math.max(100,Math.round(w/ratio)),b={x:0,y:0,w,h};
  const flat=createCanvas(w,h),preview=createCanvas(w,h);
  ctx.layer={type:'image',libraryAssetId:assetId,libraryLocked:true,image};ctx.b=b;ctx.canvas=flat;
  vm.runInContext('drawWaterSplash2(canvas.getContext("2d"),zone,layer,b,false)',ctx);
  ctx.canvas=preview;
  vm.runInContext('drawWaterSplash2(canvas.getContext("2d"),zone,layer,b,true)',ctx);
  const fb=alphaBounds(flat),pb=alphaBounds(preview);
  assert.ok(fb.r>fb.l&&fb.b>0,product.id+'/'+zone+' flat visible');
  assert.ok(pb.r>pb.l&&pb.b>0,product.id+'/'+zone+' preview visible');
  const pattern=product.id==='long-sleeve-tshirt'&&['Front','Back'].includes(zone);
  if(pattern)assert.deepEqual(flat.toBuffer('image/png'),preview.toBuffer('image/png'));
  else assert.ok(pb.l<=5&&pb.r>=w-6&&pb.b>=h-6,product.id+'/'+zone+' reaches preview sides and hem '+JSON.stringify(pb));
  console.log('PASS',product.id,zone);count++;
 }
}
assert.equal(count,48);
assert.equal(isWaterSplash2({type:'image',libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'}),false);
assert.equal(isWaterSplash2({type:'image',libraryLocked:false,libraryAssetId:WATER_SPLASH_2}),false);
assert.equal(isWaterSplash2({type:'image',libraryLocked:true,libraryAssetId:GRASS_BOTTOM}),false);
assert.equal(isCutlineBottomArtwork({type:'image',libraryLocked:true,libraryAssetId:assetId}),true);
assert.equal(isCutlineBottomArtwork({type:'image',libraryLocked:false,libraryAssetId:assetId}),false);
assert.equal(isCutlineBottomArtwork({type:'image',libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'}),false);
assert.deepEqual(hoodieArtworkBatches('Front',[{type:'text'},{type:'image',libraryLocked:true,libraryAssetId:assetId},{type:'text'}]).map(b=>b.splash),[false,true,false]);
assert.deepEqual(hoodieArtworkBatches('Front',[{type:'text'},{type:'image',libraryLocked:true,libraryAssetId:WATER_SPLASH_2},{type:'text'}]).map(b=>b.splash),[false,true,false]);
console.log('PASS: all 12 products / 48 zones, alpha-aware width/hem fit, pattern-UV parity, and asset isolation');
