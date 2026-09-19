import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {shirtSplashPreviewFrame,clipShirtSplash,isShirtSplash} from '../v20/shirt-splash-preview.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const image=await loadImage(process.argv[2]);
const rows=JSON.parse(fs.readFileSync(new URL('../v20/shirt-splash-placement.json',import.meta.url)));
const measurements=rows;
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const document={createElement:()=>createCanvas(1,1)};
let product,layer,ratio;
const zoneState=()=>({background:'#ffffff',layers:[layer]}),zoneDesignAspect=()=>ratio;
const isFullLockedLibraryBackground=()=>false,normalizedLibraryContentBounds=()=>null;
const imageFn=source.slice(source.indexOf('function drawImageLayer('),source.indexOf('function drawTextLayer('));
const start=source.indexOf('function makeCleanZoneArtworkCanvas('),cleanFn=source.slice(start,source.indexOf('\n',start));
const make=eval(imageFn+'\n'+cleanFn+'\nmakeCleanZoneArtworkCanvas');
function alphaBounds(c){const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let left=c.width,right=-1,top=c.height,bottom=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}return{left,right,top,bottom};}
for(const row of rows){
 product={id:row.product};const m=measurements.find(x=>x.product===row.product&&x.zone===row.zone);
 ratio=row.flatRatio;
 layer={...row,type:'image',image,libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'};
 let size=Math.max(700,Math.ceil(256*Math.max(ratio,1/ratio)));
 const flatCanvas=make(row.zone,size),flatBounds=alphaBounds(flatCanvas),cut=row.normalizedCut;
 assert.ok(flatBounds.right>flatBounds.left,row.product+'/'+row.zone+' flat artwork visible');
 assert.ok(flatBounds.bottom<=Math.ceil(Math.min(1,cut.bottom)*flatCanvas.height),row.product+'/'+row.zone+' stays above flat cutline');
 assert.ok(flatBounds.left>=Math.floor(Math.max(0,cut.left)*flatCanvas.width)-1,row.product+'/'+row.zone+' flat left cutline');
 assert.ok(flatBounds.right<=Math.ceil(Math.min(1,cut.right)*flatCanvas.width),row.product+'/'+row.zone+' flat right cutline');
 ratio=m.ratio;size=Math.max(700,Math.ceil(256*Math.max(ratio,1/ratio)));
 const c=make(row.zone,size,{imageFrame:(l,b)=>shirtSplashPreviewFrame(product.id,row.zone,l,b)}),bounds=alphaBounds(c);
 assert.ok(bounds.right>bounds.left&&bounds.bottom>bounds.top,row.product+'/'+row.zone+' visible');
 if(row.product==='long-sleeve-tshirt'&&['Front','Back'].includes(row.zone)){
  const flat=make(row.zone,size);
  assert.deepEqual(c.toBuffer('image/png'),flat.toBuffer('image/png'),'pattern UV body remains identical to flat artwork');
 }else{
  assert.ok(bounds.left<=2&&bounds.right>=c.width-3,row.product+'/'+row.zone+' reaches both sides');
  assert.ok(bounds.bottom>=c.height-3,row.product+'/'+row.zone+' reaches hem');
 }
 assert.equal(isShirtSplash(row.product,row.zone,{...layer,libraryAssetId:'other'}),false);
 assert.equal(isShirtSplash(row.product,row.zone,{...layer,type:'text'}),false);
}
for(const id of ['fleece-hoodie','lightweight-jacket','shorts','sweat-pants','hat','mask']){
 assert.equal(isShirtSplash(id,'Front',layer),false);
 assert.equal(shirtSplashPreviewFrame(id,'Front',layer,{w:600,h:800}),null);
}
console.log('PASS: 31 shirt zones render visible water; texture edges/hem, pattern-mapped body parity, and excluded products verified.');
