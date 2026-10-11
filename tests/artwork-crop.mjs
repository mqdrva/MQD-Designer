import assert from 'node:assert/strict';
const {createCanvas,loadImage}=await import(process.env.EVERYDAY_CANVAS_MODULE || '@napi-rs/canvas');
import {pinchPlacement} from '../v20/artwork-pinch.js';
import {constrainImagePlacement,orderSheet} from '../v20/everyday-contract.js';
import {printArtwork,printMetadata} from '../v20/everyday-layers.js';
import {buildEverydaySubmission,submissionFingerprint} from '../v20/everyday-checkout.js';
import {validateEverydayFiles} from '../supabase/functions/_shared/mqd-everyday-submit.js';
import {validateEveryday,everydayPricing} from '../supabase/functions/_shared/mqd-everyday.js';
import fs from 'node:fs';
const makeCanvas=()=>{const c=createCanvas(1,1);c.toBlob=fn=>fn(new Blob([c.toBuffer('image/png')],{type:'image/png'}));return c;};
globalThis.document={createElement:makeCanvas};
globalThis.createImageBitmap=async file=>loadImage(Buffer.from(await file.arrayBuffer()));
const source=createCanvas(300,100),ctx=source.getContext('2d');
for(const [x,color] of [[0,'#ff0000'],[100,'#00ff00'],[200,'#0000ff']]){ctx.fillStyle=color;ctx.fillRect(x,0,100,100);}
const bytes=source.toBuffer('image/png'),file=new File([bytes],'original.png',{type:'image/png'});
const zone={width:3,height:3},p={x:-3,y:0,width:9,height:3};
const art={file,name:file.name,placement:p};
const metadata=printMetadata(art,'left',zone);
assert.deepEqual(metadata,{filename:'left-print.png',x:0,y:0,width:3,height:3,clipped:true,printRasterDpi:300,sourceFilename:'original.png'});
const print=await printArtwork(art,'left',{makeCanvas,zone});
const image=await loadImage(Buffer.from(await print.arrayBuffer()));
assert.equal(image.width,900);assert.equal(image.height,900);
const actual=createCanvas(900,900);actual.getContext('2d').drawImage(image,0,0);
assert.deepEqual([...actual.getContext('2d').getImageData(450,450,1,1).data],[0,255,0,255],'Only the center green strip is printed');
assert.deepEqual([...actual.getContext('2d').getImageData(50,450,1,1).data],[0,255,0,255]);
assert.deepEqual([...actual.getContext('2d').getImageData(850,450,1,1).data],[0,255,0,255]);
assert.deepEqual(Buffer.from(await file.arrayBuffer()),bytes,'Original is untouched');
assert.deepEqual(art.placement,p,'Export does not alter editing placement');
assert(pinchPlacement({x:0,y:.75,width:3,height:1.5},2,zone,true).width>3);
assert.equal(pinchPlacement({x:0,y:.75,width:3,height:1.5},2,zone).width,3,'Text remains bounded');
assert(constrainImagePlacement({...p,x:-1000},zone).x+p.width>0);
const pricing=everydayPricing(fs.readFileSync(new URL('../config/everyday-pricing.example.json',import.meta.url),'utf8'));
for(const product of ['everyday-tshirt','everyday-long-sleeve','everyday-hoodie','everyday-polo']){
 const draft={product,color:'White',size:'L',quantity:1,photos:{},artwork:{}};
 for(const view of ['front','back','left','right']){
  const body=['front','back'].includes(view)&&!(product==='everyday-polo'&&view==='front');
  const z=body?{width:12,height:15}:zone;
  draft.artwork[view]={file,name:file.name,placement:{x:-z.width,y:0,width:z.width*3,height:z.height}};
 }
 const sheet=orderSheet(draft);
 for(const view of ['front','back','left','right'])assert(sheet.locations[view].clipped);
 const {form,payload}=await buildEverydaySubmission(draft,pricing,{makeCanvas,render:async canvas=>{canvas.getContext('2d').fillRect(0,0,1,1);}});
 validateEveryday(payload);await validateEverydayFiles(form,sheet);
 const firstFingerprint=await submissionFingerprint(draft,pricing);
 draft.artwork.front.placement.x-=.1;
 assert.notEqual(await submissionFingerprint(draft,pricing),firstFingerprint,'Changing a full-zone crop creates a different cart submission');
 draft.artwork.front.placement.x+=.1;
 assert.equal(form.getAll('asset').length,12,'Four previews, four cropped prints and four untouched uploads');
 const broken=structuredClone(sheet);delete broken.locations.front.sourceFilename;
 await assert.rejects(validateEverydayFiles(form,broken),/match|incomplete/);
 const beyond=structuredClone(payload);beyond.everyday.locations.left.width=4;
 assert.throws(()=>validateEveryday(beyond),'Server still rejects print files outside physical limits');
}
console.log('PASS: image pinch overflow, exact crop pixels, 300-DPI print export, unchanged originals, every garment/zone, checkout acceptance and invalid crop rejection.');
