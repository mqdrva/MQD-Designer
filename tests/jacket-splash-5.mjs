import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {shortsTemplatePolygons} from '../v20/shorts-panels.js';
import {shirtSplashCutFrame} from '../v20/shirt-splash-preview.js';
import {drawFittedSplash,splashFit} from '../v20/water-splash-fit.js';
import {isJacketSplash5,drawJacketSplash5} from '../v20/jacket-splash-5.js';
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const products=vm.runInNewContext(section('const seed=','const $=')+'seed');
const image=await loadImage(process.argv[2]);
const ctx={isJacketSplash5,drawJacketSplash5,document:{createElement:()=>createCanvas(1,1)},shortsTemplatePolygons,shirtSplashCutFrame,drawFittedSplash,console};
vm.createContext(ctx);
vm.runInContext(section('function buildTemplateMask(','function scaleBounds(')+section('function measureVisibleImageBounds(','function normalizedLibraryContentBounds(')+section('function waterSplashCut(','function drawLayerStack('),ctx);
ctx.image=image;
const content=vm.runInContext('measureVisibleImageBounds(image)',ctx);

function alphaBounds(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let l=canvas.width,r=-1,b=-1;for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]>12){l=Math.min(l,x);r=Math.max(r,x);b=Math.max(b,y);}return{l,r,b};}
for(const product of products.filter(p=>p.id==='lightweight-jacket')){
 ctx.product=product;
 for(const zone of ['Front','Back']){
  const t=product.templates[zone];let rec=null;
  if(t.path&&product.id!=='sweat-pants'){
   const img=await loadImage(new URL('..'+t.path,import.meta.url));
   ctx.img=img;ctx.zone=zone;
   const jacket=product.id==='lightweight-jacket',solid=['hood-mask-shirt','hooded-long-sleeve'].includes(product.id)&&['Front','Back','Left Sleeve','Right Sleeve'].includes(zone);
   rec=vm.runInContext(`buildTemplateMask(img,zone,${jacket&&zone.includes('Sleeve')},${jacket&&zone==='Back'},${solid},${product.id==='long-sleeve-polo'&&zone.includes('Sleeve')})`,ctx);
   rec.img=img;rec.status='ready';
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
  ctx.layer={type:'image',libraryAssetId:'3599008d-9fe7-4c04-b65b-b65494f71aa7',libraryLocked:true,image};ctx.b=b;ctx.canvas=flat;
  vm.runInContext('drawJacketSplash5Layer(canvas.getContext("2d"),zone,layer,b,false)',ctx);
  ctx.canvas=preview;
  vm.runInContext('drawJacketSplash5Layer(canvas.getContext("2d"),zone,layer,b,true)',ctx);
  const fb=alphaBounds(flat),pb=alphaBounds(preview);
  assert.ok(Math.abs((fb.b/h-cut.top)/(cut.bottom-cut.top)-pb.b/h)<.02,'hem matches across frames');
  assert.ok(Math.abs(fb.l/w-cut.left)<.02&&Math.abs((fb.r+1)/w-cut.right)<.02,'flat artwork reaches both cut lines');
  assert.ok(fb.r>fb.l&&fb.b>0,product.id+'/'+zone+' flat visible');
  assert.ok(pb.r>pb.l&&pb.b>0,product.id+'/'+zone+' preview visible');
  assert.ok(pb.l<=5&&pb.r>=w-6&&pb.b>=h-6,product.id+'/'+zone+' reaches preview sides and hem '+JSON.stringify(pb));
  console.log('PASS',product.id,zone);
 }
}

assert.equal(isJacketSplash5('tshirt','Front',ctx.layer),false);
assert.equal(isJacketSplash5('lightweight-jacket','Back',ctx.layer),true);
assert.equal(isJacketSplash5('lightweight-jacket','Front',{...ctx.layer,libraryLocked:false}),false);
console.log('Jacket Splash 5 actual-image fit and isolation passed');
