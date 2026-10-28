// Lossless checkout transport: original files remain in the ZIP. Avoid repeating
// their base64 bytes in design.json and once per zone in the multipart request.
export const TEAM_IMAGE_REFS='mqd-team-image-refs-v1';
export const TEAM_RESTORED_PATHS=Symbol('verified original ZIP paths');
// Shared with the browser. Servers inject their native encoder; the browser
// fallback stays bounded and has no Node-only module dependency.
function originalBase64(bytes){const parts=[];for(let at=0;at<bytes.length;at+=24576)parts.push(btoa(String.fromCharCode(...bytes.subarray(at,at+24576))));return parts.join('');}
export async function hydrateCheckoutMaster(master,payload){
 if(!master)return null;const checked=new Map();
 for(const [zone,state]of Object.entries(master.payload?.design?.zones||{}))for(const layer of state.layers||[]){
  if(layer.type!=='image')continue;
  if(!/^sha256:[a-f0-9]{64}$/.test(layer.src||''))throw new Error('Master source fingerprint unavailable.');
  const member=payload?.design?.zones?.[zone]?.layers?.find(l=>l.templateLayerId===layer.id),source=member?.src;
  if(typeof source!=='string'||!/^data:image\/(png|jpeg|webp);base64,/.test(source))throw new Error('Original source artwork is missing.');
  let digest=checked.get(source);if(!digest){digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source))),b=>b.toString(16).padStart(2,'0')).join('');checked.set(source,digest);}
  if(layer.src!=='sha256:'+digest)throw new Error('Original source artwork does not match the purchased master.');
  layer.src=source;
 }
 return master;
}
export async function restoreTeamImages(saved,zip,encode=originalBase64){
 if(saved.imageSourceFormat===undefined)return saved;
 if(saved.imageSourceFormat!==TEAM_IMAGE_REFS||saved.engine!=='3d')throw new Error('Unsupported original-artwork references.');
 let expanded=0;const cache=new Map(),paths={};
 for(const [zone,state] of Object.entries(saved.design?.design?.zones||{}))for(const [index,layer] of (state.layers||[]).entries()){
  if(layer.type!=='image')continue;
  const match=layer.src?.match(/^zip:(originals\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp))$/i);
  if(!match||match[1].includes('..'))throw new Error('Original artwork reference is invalid.');
  let source=cache.get(match[1]);
  if(!source){const file=zip.file(match[1]),mime=saved.imageSourceTypes?.[match[1]];if(!file||(file._data?.uncompressedSize||0)>50*1024*1024||!/^image\/(png|jpeg|webp)$/.test(mime||''))throw new Error('Original artwork file is missing or invalid.');const bytes=await file.async('uint8array');zip.file(match[1],bytes);source='data:'+mime+';base64,'+encode(bytes);cache.set(match[1],source);}
  expanded+=source.length;if(expanded>48*1024*1024)throw new Error('Expanded design exceeds the supported artwork limit.');layer.src=source;(paths[zone]||=[])[index]=match[1];
 }
 const background=saved.design?.design?.teamBackground;
 if(background){const match=background.src?.match(/^zip:(originals\/member-background\.(png|jpeg|webp))$/);if(!match)throw new Error('Background original reference is invalid.');const file=zip.file(match[1]),mime=saved.imageSourceTypes?.[match[1]];if(!file||!/^image\/(png|jpeg|webp)$/.test(mime||'')||(file._data?.uncompressedSize||0)>15*1024*1024)throw new Error('Background original is missing or too large.');const bytes=await file.async('uint8array');if(bytes.length>15*1024*1024)throw new Error('Background original is too large.');zip.file(match[1],bytes);background.src='data:'+mime+';base64,'+encode(bytes);paths.background=match[1];expanded+=background.src.length;if(expanded>48*1024*1024)throw new Error('Expanded design exceeds the supported artwork limit.');}
 Object.defineProperty(saved,TEAM_RESTORED_PATHS,{value:paths});
 return saved;
}
