// Actual editor layer and silhouette renderer, used only to build unpublished demo card images.
import fs from 'node:fs';import vm from 'node:vm';import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
import {demoVersions} from '../v20/template-demo.js';
import {clipShirtSplash} from '../v20/shirt-splash-preview.js';
import {isCutlineBottomArtwork} from '../v20/water-splash-fit.js';
import {isJacketSplash5} from '../v20/jacket-splash-5.js';
const source=fs.readFileSync('v20/editor.js','utf8');
const impactPath='/System/Library/Fonts/Supplemental/Impact.ttf';
if(fs.existsSync(impactPath))GlobalFonts.registerFromPath(impactPath,'Impact');
const fontHelper=source.match(/function textFontFamily\([^]*?\n\}/)?.[0];
if(!fontHelper)throw new Error('Missing editor font-family helper');
function section(name){const expression=new RegExp('// @mapping-begin '+name+'\\n([\\s\\S]*?)\\n// @mapping-end '+name);const result=source.match(expression);if(!result)throw new Error('Missing renderer section '+name);return result[1];}
for(const version of demoVersions){
 const payload=structuredClone(version.payload),records={};
 const context={console,product:payload.product,document:{createElement:()=>createCanvas(1,1)},zoneState:zone=>payload.design.zones[zone],ensureTemplateImage:zone=>records[zone],clipShirtSplash,isCutlineBottomArtwork,isJacketSplash5};
 context.product.templates=payload.templates;vm.createContext(context);
 vm.runInContext(fontHelper+'\n'+['buildTemplateMask','scaleBounds','isFullLockedLibraryBackground','normalizedLibraryContentBounds','measureVisibleImageBounds','drawMappedImageLayer','drawTextLayer','drawLayerStack','renderMaskedZoneCanvas'].map(section).join('\n')+'\n'+source.match(/function drawImageLayer\(c,l,b\)\{[^\n]+/)[0],context);
 for(const side of ['Front','Back','Left Sleeve','Right Sleeve']){
   const img=await loadImage(payload.templates[side].path.slice(1));context.templateImage=img;
   records[side]={img,...vm.runInContext(`buildTemplateMask(templateImage,${JSON.stringify(side)})`,context)};
   for(const layer of payload.design.zones[side].layers)if(layer.type==='image')layer.image=await loadImage(layer.src.slice(1));
   const sleeve=side.includes('Sleeve'),width=600,height=sleeve?Math.round(width*payload.templates[side].height/payload.templates[side].width):800;
   if(sleeve){
    // Verify the new locked backgrounds against the editor's real print frame.
    const b=records[side].bounds,t=payload.templates[side],aspect=(t.width/t.height)*(b.w/img.width)/(b.h/img.height);
    const expected=100*(1-1.5*aspect);
    if(Math.abs(payload.design.zones[side].layers[0].y-expected)>.001)throw new Error('Sleeve hem anchor no longer matches the unchanged print frame');
   }
   const panel=vm.runInContext(`renderMaskedZoneCanvas(${JSON.stringify(side)},${width},${height})`,context),canvas=createCanvas(width,height),c=canvas.getContext('2d');c.fillStyle='#f2f2f2';c.fillRect(0,0,width,height);c.drawImage(panel,0,0);c.fillStyle='#555';c.font='bold 11px Arial';c.textAlign='center';c.fillText('ACTUAL EDITABLE PANEL · UNPUBLISHED DEMO',300,height-12);
   fs.writeFileSync(version.previews[side].slice(1),canvas.toBuffer('image/png'));
 }
}
console.log('Rendered 20 body/sleeve demo previews with the actual editor layer/silhouette functions.');
