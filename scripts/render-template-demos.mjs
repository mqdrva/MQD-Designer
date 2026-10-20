// Actual editor layer and silhouette renderer, used only to build unpublished demo card images.
import fs from 'node:fs';import vm from 'node:vm';import {createCanvas,loadImage} from '@napi-rs/canvas';
import {demoVersions} from '../v20/template-demo.js';
import {clipShirtSplash} from '../v20/shirt-splash-preview.js';
import {isCutlineBottomArtwork} from '../v20/water-splash-fit.js';
import {isJacketSplash5} from '../v20/jacket-splash-5.js';
const source=fs.readFileSync('v20/editor.js','utf8');
function section(name){const expression=new RegExp('// @mapping-begin '+name+'\\n([\\s\\S]*?)\\n// @mapping-end '+name);const result=source.match(expression);if(!result)throw new Error('Missing renderer section '+name);return result[1];}
for(const version of demoVersions){
 const payload=structuredClone(version.payload),records={};
 const context={console,product:payload.product,document:{createElement:()=>createCanvas(1,1)},zoneState:zone=>payload.design.zones[zone],ensureTemplateImage:zone=>records[zone],clipShirtSplash,isCutlineBottomArtwork,isJacketSplash5,textFontFamily:font=>'"'+font+'", sans-serif'};
 context.product.templates=payload.templates;vm.createContext(context);
 vm.runInContext(['buildTemplateMask','scaleBounds','isFullLockedLibraryBackground','normalizedLibraryContentBounds','measureVisibleImageBounds','drawMappedImageLayer','drawTextLayer','drawLayerStack','renderMaskedZoneCanvas'].map(section).join('\n')+'\n'+source.match(/function drawImageLayer\(c,l,b\)\{[^\n]+/)[0],context);
 for(const side of ['Front','Back']){
   const img=await loadImage(payload.templates[side].path.slice(1));context.templateImage=img;
   records[side]={img,...vm.runInContext(`buildTemplateMask(templateImage,${JSON.stringify(side)})`,context)};
   for(const layer of payload.design.zones[side].layers)if(layer.type==='image')layer.image=await loadImage(layer.src.slice(1));
   const panel=vm.runInContext(`renderMaskedZoneCanvas(${JSON.stringify(side)},600,800)`,context),canvas=createCanvas(600,800),c=canvas.getContext('2d');c.fillStyle='#f2f2f2';c.fillRect(0,0,600,800);c.drawImage(panel,0,0);c.fillStyle='#555';c.font='bold 11px Arial';c.textAlign='center';c.fillText('ACTUAL EDITABLE PANEL · UNPUBLISHED DEMO',300,788);
   fs.writeFileSync(version.previews[side].slice(1),canvas.toBuffer('image/png'));
 }
}
console.log('Rendered 10 demo previews with the actual editor layer/silhouette functions.');
