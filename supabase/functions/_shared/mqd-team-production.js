import {garmentLogo,garmentLogoPath} from '../mqd-print-shop-pilot/contract.js';
import {TEAM_RESTORED_PATHS} from './mqd-team-image-refs.js';
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
 const sourceCache=new Map(),fileHashes=new Map();
 const manifest={schema:'mqd-team-production-v1',productId:payload.product.id,zones:[],originals:[],text:[],resolutionNote:'Source pixel dimensions are measured from original image headers. Output pixel dimensions follow the approved garment templates. Output dimensions do not increase source detail; no source DPI is inferred.'};
 for(const [i,zone] of mapping.zones.entries()){
  const expected=mapping.templates[zone],path='production-zones/'+String(i+1).padStart(2,'0')+'-'+zone.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.png',file=zip.file(path);
  if(!file)throw new Error('Missing production zone: '+zone);const bytes=await file.async('uint8array'),size=imageDimensions(Buffer.from(bytes),'png');zip.file(path,bytes);
  if(size.width!==expected.width||size.height!==expected.height)throw new Error('Incorrect output dimensions for '+zone);
  manifest.zones.push({zone,path,...size,sha256:await hash(bytes),template:expected});
  for(const [index,layer] of (payload.design.zones[zone]?.layers||[]).entries()){
   if(layer.type==='text'){manifest.text.push({zone,...layer});continue;}
   if(layer.type!=='image')continue;const match=layer.src?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!match)throw new Error('Original source required.');
   let source=sourceCache.get(layer.src);if(!source){const bytes=Buffer.from(match[2],'base64'),dimensions=imageDimensions(bytes,match[1]);if(dimensions.width<1||dimensions.height<1)throw new Error('Invalid source dimensions.');source={dimensions,digest:await hash(bytes)};sourceCache.set(layer.src,source);}const {dimensions,digest}=source;
   const sharedLogo=!payload.design.teamMaster&&shop?.garmentLogo===layer.src&&garmentLogo(shop,payload.product.id).mode!=='none';
   const path=design[TEAM_RESTORED_PATHS]?.[zone]?.[index]||(sharedLogo?garmentLogoPath(shop):'originals/'+safe(zone)+'-'+index+'-'+safe(layer.filename||'artwork.png')),original=zip.file(path);if(!original)throw new Error('Original source artwork does not match the saved member design.');let fileHash=fileHashes.get(path);if(!fileHash){const bytes=await original.async('uint8array');zip.file(path,bytes);fileHash=await hash(bytes);fileHashes.set(path,fileHash);}if(fileHash!==digest)throw new Error('Original source artwork does not match the saved member design.');
   manifest.originals.push({zone,layerId:layer.id,templateLayerId:layer.templateLayerId,path,...dimensions,sha256:digest,placement:{x:layer.x,y:layer.y,scale:layer.scale,rotation:layer.rotation,crop:layer.crop},...(layer.teamLogo?{logoTreatment:layer.teamLogo}:{})});
  }
 }
 const background=payload.design.teamBackground;
 if(background){const match=background.src?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);if(!match)throw new Error('Original background source required.');const bytes=Buffer.from(match[2],'base64');if(bytes.length>15*1024*1024)throw new Error('Background original is too large.');const dimensions=imageDimensions(bytes,match[1]),digest=await hash(bytes),path=design[TEAM_RESTORED_PATHS]?.background||'originals/member-background.'+match[1],file=zip.file(path);if(!file||await hash(await file.async('uint8array'))!==digest)throw new Error('Original background does not match the purchased design.');manifest.background={path,...dimensions,sha256:digest,filename:background.filename,placement:'Centered cover inside each approved garment zone, behind all master layers'};}
 if(manifest.originals.some(item=>item.logoTreatment))manifest.logoRendering='Keep original source bytes. Render the selected solid RGB at original pixel dimensions. alpha-v1 preserves source alpha; dark-on-white-v1 multiplies source alpha by clamp((255-max(R,G,B))/217,0,1), making white transparent. Apply the saved crop and placement. Purchased production-zone PNGs are the final rendered reference.';
 if(manifest.text.length){const cssFile=zip.file('fonts/fonts.css');if(!cssFile)throw new Error('Reproduction fonts are missing.');const css=await cssFile.async('string');
  for(const text of manifest.text)if(!css.includes("font-family: '"+(text.font||'Inter')+"'")&&!css.includes('font-family: "'+(text.font||'Inter')+'"'))throw new Error('Reproduction font missing: '+text.font);
  for(const match of css.matchAll(/url\(([^)]+)\)/g)){if(!/^font-\d+\.woff2$/.test(match[1])||!zip.file('fonts/'+match[1]))throw new Error('Reproduction font resource missing.');}
 }
 return manifest;
}

// Reuse verified originals instead of repeating their base64 bytes inside the
// purchased master. The source map can restore the exact historical JSON.
export async function packageTeamMaster(zip,master,production){
 const snapshot=structuredClone(master),sources=[],sourceHashes=new Map();
 for(const [zone,state] of Object.entries(snapshot.payload.design.zones)){
  for(const layer of state.layers||[]){
   if(layer.type!=='image')continue;
   const match=layer.src?.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
   if(!match)throw new Error('Purchased master original source is missing.');
   let digest=sourceHashes.get(layer.src);if(!digest){digest=await hash(Buffer.from(match[2],'base64'));sourceHashes.set(layer.src,digest);}
   const original=production.originals.find(item=>item.zone===zone&&(item.templateLayerId||item.layerId)===layer.id&&item.sha256===digest);
   if(!original||!zip.file(original.path))throw new Error('Purchased master original does not match the verified member artwork.');
   sources.push({zone,layerId:layer.id,path:original.path,mime:'image/'+match[1],sha256:digest});layer.src='zip:'+original.path;
  }
 }
 zip.file('purchased-team-master.json',JSON.stringify(snapshot));
 zip.file('purchased-team-master-sources.json',JSON.stringify({schema:'mqd-team-master-sources-v1',versionId:master.id,originalJsonSha256:await hash(new TextEncoder().encode(JSON.stringify(master))),sources},null,2));
 zip.file('purchased-team-master-README.txt','The purchased master retains its exact version, layers, placements and permissions. Image src values beginning zip: reference unchanged originals in this ZIP. The source map records their MIME types and SHA-256 hashes. To reconstruct the exact saved master JSON, replace each mapped layer src with data:<mime>;base64,<original file bytes encoded as base64>. No artwork was resized or recompressed. design.json remains the independently personalized garment design.');
}
export async function restorePackagedTeamMaster(zip){
 const master=JSON.parse(await zip.file('purchased-team-master.json').async('string')),map=JSON.parse(await zip.file('purchased-team-master-sources.json').async('string'));
 if(map.schema!=='mqd-team-master-sources-v1'||map.versionId!==master.id)throw new Error('Purchased master identity mismatch.');
 for(const item of map.sources){const source=zip.file(item.path),layer=master.payload.design.zones[item.zone]?.layers.find(l=>l.id===item.layerId);if(!source||!layer||layer.src!=='zip:'+item.path)throw new Error('Purchased master source missing.');const bytes=await source.async('uint8array');if(await hash(bytes)!==item.sha256)throw new Error('Purchased master source changed.');layer.src='data:'+item.mime+';base64,'+Buffer.from(bytes).toString('base64');}
 if(await hash(new TextEncoder().encode(JSON.stringify(master)))!==map.originalJsonSha256)throw new Error('Purchased master snapshot changed.');return master;
}
