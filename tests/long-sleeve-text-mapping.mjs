import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {longSleevePanelUv as uv} from '../v20/long-sleeve-panels.js';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const extract=(a,b)=>editor.slice(editor.indexOf('function '+a+'('),editor.indexOf('function '+b+'('));
let layers=[];
const image=createCanvas(100,100);image.getContext('2d').fillRect(0,0,100,100);
const ratios={'Front':.75,'Back':.75,'Left Sleeve':.6,'Right Sleeve':.6,'Collar':8};
const context={document:{createElement:()=>createCanvas(1,1)},
  zoneDesignAspect:zone=>ratios[zone],zoneState:()=>({layers})};
context.product={id:'long-sleeve-tshirt'};
context.scaleBounds=(b)=>b;
vm.createContext(context);
vm.runInContext(extract('drawImageLayer','drawTextLayer')+
  extract('drawTextLayer','editorDesignBounds')+
  extract('makeCleanZoneArtworkCanvas','editorRect'),context);
vm.runInContext(extract('renderMaskedZoneCanvas','zoneDesignAspect'),context);
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
for(const zone of Object.keys(ratios)){
  layers=[{type:'text',text:'TOP',x:0,y:-45,scale:.3,color:'#FF0000'},
    {type:'image',image,x:0,y:0,scale:.2},
    {type:'image',image,x:0,y:80,scale:.2}];
  const actual=context.makeLongSleeveTshirtArtworkCanvas(zone,1600);
  const expected=context.makeCleanZoneArtworkCanvas(zone,Math.max(1600,Math.ceil(256*Math.max(ratios[zone],1/ratios[zone]))));
  const a=pixels(actual),b=pixels(expected);
  for(let y=1;y<actual.height-1;y++)for(let x=1;x<actual.width-1;x++){
    const i=(y*actual.width+x)*4;
    for(let k=0;k<4;k++)assert.equal(a[i+k],b[i+k],zone+' placement mismatch');
  }
  assert(Math.abs(actual.width/actual.height-ratios[zone])<.005,zone+' aspect stretched');
  const mask=createCanvas(actual.width,actual.height);
  mask.getContext('2d').fillRect(0,0,mask.width,mask.height);
  context.ensureTemplateImage=()=>({img:mask,maskCanvas:mask,
    bounds:{x:0,y:0,w:mask.width,h:mask.height}});
  const flat=context.renderMaskedZoneCanvas(zone,mask.width,mask.height);
  const texture=createCanvas(mask.width,mask.height),paint=texture.getContext('2d');
  paint.fillStyle='#FFFFFF';paint.fillRect(0,0,mask.width,mask.height);paint.drawImage(actual,0,0);
  assert.deepEqual(pixels(flat),pixels(texture),zone+' 2D and 3D artwork differ');
  layers=[{type:'text',text:'TOP',x:0,y:0,scale:.3,color:'#FF0000'},
    {type:'image',image,x:0,y:0,scale:.5}];
  const imageOnTop=pixels(context.makeLongSleeveTshirtArtworkCanvas(zone));
  layers.reverse();
  const textOnTop=pixels(context.makeLongSleeveTshirtArtworkCanvas(zone));
  assert.notDeepEqual(imageOnTop,textOnTop,zone+' layer order ignored');
}
const bounds={min:{x:-.75,y:-.85,z:-.35},max:{x:.75,y:.78,z:.35}};
for(const zone of ['Front','Back']){
  assert.equal(uv(zone,0,bounds.min.y,0,bounds)[1],0,'hem must map to texture bottom');
  assert.equal(uv(zone,0,bounds.max.y,0,bounds)[1],1,'shoulder must map to texture top');
}
console.log('PASS all five zones: unshifted text/images, layer order, collar aspect; body hem endpoints.');
