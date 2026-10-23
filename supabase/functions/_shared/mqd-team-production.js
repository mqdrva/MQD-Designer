import {Buffer} from 'node:buffer';
import {imageDimensions} from './shirt-games/image-info.mjs';
import {GARMENT_MAPPING} from './shirt-games/mapping.js';
const safe=name=>String(name).replace(/[^a-zA-Z0-9._-]/g,'_').replace(/\.{2,}/g,'_').slice(0,120)||'artwork';
const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function verifyTeamProduction(zip,design,shop){
 if(design.engine==='2d'){
  const result={schema:'mqd-team-production-v1',productId:design.draft.product,zones:[],originals:[],text:[],resolutionNote:'Output PNGs use 300 pixels per inch of the approved print area. Original image pixel dimensions are measured separately; no source resolution is invented.'};
  for(const view of ['front','back','left','right']){
   const art=design.draft.artwork?.[view],ref=design.files?.[view],path='production-zones/'+view+'.png',file=zip.file(path);
   if(!file){if(ref||art?.texts?.length)throw new Error('Missing production output for '+view);continue;}
   const zone=shop?.garments?.[design.draft.product]?.printZones?.[view];if(!zone)throw new Error('Unapproved print zone.');
   const bytes=await file.async('uint8array'),size=imageDimensions(Buffer.from(bytes),'png');if(size.width!==Math.round(zone.width*300)||size.height!==Math.round(zone.height*300))throw new Error('Incorrect output dimensions for '+view);
   result.zones.push({zone:view,path,...size,physicalInches:zone,sha256:await hash(bytes)});
   if(ref){const original=zip.file(ref.path);if(!original)throw new Error('Missing original source.');const data=await original.async('uint8array'),dimensions=imageDimensions(Buffer.from(data),ref.type.replace('image/',''));result.originals.push({zone:view,path:ref.path,...dimensions,sha256:await hash(data),placement:art.placement});}
   result.text.push(...(art?.texts||[]).map(t=>({zone:view,...t})));
  }
  if(result.text.length&&!zip.file('fonts/fonts.css'))throw new Error('Reproduction fonts are missing.');
  return result;
 }
 if(design.engine!=='3d')throw new Error('Unsupported production engine.');
 const payload=design.design,mapping=GARMENT_MAPPING[payload.product.id];if(!mapping)throw new Error('Unsupported production garment.');
 const manifest={schema:'mqd-team-production-v1',productId:payload.product.id,zones:[],originals:[],text:[],resolutionNote:'Source pixel dimensions are measured from original image headers. Output pixel dimensions follow the approved garment templates. Output dimensions do not increase source detail; no source DPI is inferred.'};
 for(const [i,zone] of mapping.zones.entries()){
  const expected=mapping.templates[zone],path='production-zones/'+String(i+1).padStart(2,'0')+'-'+zone.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',file=zip.file(path);
  if(!file)throw new Error('Missing production zone: '+zone);const bytes=await file.async('uint8array'),size=imageDimensions(Buffer.from(bytes),'png');
  if(size.width!==expected.width||size.height!==expected.height)throw new Error('Incorrect output dimensions for '+zone);
  manifest.zones.push({zone,path,...size,sha256:await hash(bytes),template:expected});
  for(const [index,layer] of (payload.design.zones[zone]?.layers||[]).entries()){
   if(layer.type==='text'){manifest.text.push({zone,...layer});continue;}
   if(layer.type!=='image')continue;const match=layer.src?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!match)throw new Error('Original source required.');
   const bytes=Buffer.from(match[2],'base64'),dimensions=imageDimensions(bytes,match[1]);if(dimensions.width<1||dimensions.height<1)throw new Error('Invalid source dimensions.');
   const path='originals/'+safe(zone)+'-'+index+'-'+safe(layer.filename||'artwork.png'),original=zip.file(path);if(!original||await hash(await original.async('uint8array'))!==await hash(bytes))throw new Error('Original source artwork does not match the saved member design.');
   manifest.originals.push({zone,layerId:layer.id,path,...dimensions,sha256:await hash(bytes),placement:{x:layer.x,y:layer.y,scale:layer.scale,rotation:layer.rotation,crop:layer.crop}});
  }
 }
 if(manifest.text.length){const cssFile=zip.file('fonts/fonts.css');if(!cssFile)throw new Error('Reproduction fonts are missing.');const css=await cssFile.async('string');
  for(const text of manifest.text)if(!css.includes("font-family: '"+(text.font||'Inter')+"'")&&!css.includes('font-family: "'+(text.font||'Inter')+'"'))throw new Error('Reproduction font missing: '+text.font);
  for(const match of css.matchAll(/url\(([^)]+)\)/g)){if(!/^font-\d+\.woff2$/.test(match[1])||!zip.file('fonts/'+match[1]))throw new Error('Reproduction font resource missing.');}
 }
 return manifest;
}
