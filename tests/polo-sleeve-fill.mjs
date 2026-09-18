import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCanvas,loadImage} from '@napi-rs/canvas';

const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const extract=name=>{const start=source.indexOf(`function ${name}(`),end=source.indexOf('\nfunction ',start+1);return source.slice(start,end);};
const img=await loadImage(new URL('../assets/templates/long-sleeve/sleeve.png',import.meta.url).pathname);
const context=vm.createContext({console,document:{createElement:()=>createCanvas(1,1)},product:{id:'long-sleeve-polo'},templateCache:new Map(),mobileDesignerMode:()=>false,drawEditor:()=>{},activeZone:'Left Sleeve'});
vm.runInContext(extract('buildTemplateMask')+'\n'+extract('ensureTemplateImage'),context);
context.product.templates=Object.fromEntries(['Left Sleeve','Right Sleeve'].map(zone=>[zone,{path:'sleeve.png',width:2690,height:4120}]));
context.Image=class{set src(value){this.width=img.width;this.height=img.height;this.onload();}};
// Feed the decoded production template through the actual loading pipeline.
const build=context.buildTemplateMask;
context.buildTemplateMask=(_image,...args)=>build(img,...args);
for(const zone of ['Left Sleeve','Right Sleeve']){
  const previous=build(img,zone),rec=context.ensureTemplateImage(zone);
  assert.equal(rec.status,'ready');
  assert.equal(rec.artworkAspect,previous.bounds.w/previous.bounds.h,'3D artwork aspect must remain unchanged');
  assert.ok(rec.bounds.h>previous.bounds.h*1.5,'Fill must extend beyond the instruction graphic');
  const {x,y,w,h}=rec.bounds,ctx=rec.maskCanvas.getContext('2d');
  for(const fraction of [.1,.25,.5,.75,.95]){
    assert.equal(ctx.getImageData(Math.round(x+w/2),Math.round(y+h*fraction),1,1).data[3],255,`${zone} must be filled from sleeve cap to cuff`);
  }
  assert.equal(ctx.getImageData(0,0,1,1).data[3],0,'Outside the cutline must stay transparent');
  assert.deepEqual(rec.cutlineCanvas.toBuffer('image/png'),previous.cutlineCanvas.toBuffer('image/png'),'Production cut lines remain unchanged');
}
assert.equal(context.templateCache.size,2,'Each polo sleeve has a separate cache record');
console.log('PASS: both polo sleeves fill cap to cuff; cut lines and 3D artwork aspect preserved.');
