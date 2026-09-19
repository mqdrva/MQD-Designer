import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {shirtSplashPreviewFrame,clipShirtSplash,isShirtSplash} from '../v20/shirt-splash-preview.js';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf('function '+name+'('),source.indexOf('function '+next+'('));
let textTransforms=[],imageTransforms=[];
const text={type:'text',text:'LNO',x:20.5768,y:17.8047,scale:.72};
const image={type:'image',image:{width:100,height:100},x:0,y:0,scale:1};
const ctx={document:{createElement:()=>createCanvas(1,1)},product:{id:'long-sleeve-polo'},
 zoneDesignAspect:()=>3180/1130,zoneState:()=>({layers:[text,image]}),
 shirtSplashPreviewFrame,clipShirtSplash,isShirtSplash,
 drawTextLayer(c){textTransforms.push(c.getTransform());},drawImageLayer(c){imageTransforms.push(c.getTransform());}};
vm.createContext(ctx);
vm.runInContext(extract('makeCleanZoneArtworkCanvas','makeLongSleeveTshirtArtworkCanvas')+extract('makeShirtPreviewArtwork','updateTshirtZoneTextures'),ctx);
const output=ctx.makeShirtPreviewArtwork('Collar',1000);
assert.equal(textTransforms.length,1);
assert.equal(textTransforms[0].a,-1,'collar text compensates the reversed 3D direction');
assert.ok(Math.abs(textTransforms[0].e-(output.width/2+text.x*output.width/200))<.01,'text anchor is preserved');
assert.equal(imageTransforms[0].a,1,'image orientation is unchanged');
for(const [product,zone] of [['long-sleeve-polo','Front'],['short-sleeve-polo','Collar'],['tshirt','Collar']]){
 ctx.product.id=product;textTransforms=[];ctx.makeShirtPreviewArtwork(zone,1000);assert.equal(textTransforms[0].a,1,product+'/'+zone+' unchanged');
}
let basePasses=0,overlayPasses=0;
const canvas=createCanvas(700,250);
Object.assign(ctx,{product:{id:'long-sleeve-polo'},activeZone:'Collar',editorZoom:1,showGrid:false,
 editorRect:()=>({x:0,y:0,w:700,h:250}),ensureTemplateImage:()=>({img:canvas,maskCanvas:canvas,bounds:{x:0,y:0,w:700,h:250}}),
 renderMaskedZoneCanvas:()=>{basePasses++;return canvas;},zoneHasContent:()=>true,
 drawEditorTextOverlay:()=>{overlayPasses++;},drawSafeAreaGuide:()=>{}});
vm.runInContext(extract('drawZoneComposite','drawEditor'),ctx);
ctx.drawZoneComposite(createCanvas(700,250).getContext('2d'),700,250);
assert.equal(basePasses,1,'2D text is included once in the base canvas');
assert.equal(overlayPasses,0,'no duplicate 2D text overlay');
console.log('PASS: LNO gets one 2D pass; 3D collar text direction is corrected at the same anchor; images and other zones unchanged.');
