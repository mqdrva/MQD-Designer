import {AI_PRODUCTS,sanitizePlan} from './ai-design-contract.js';

export function validateArtworkFile(file){
  if(!file||typeof file.file_id!=='string'||!file.file_id||typeof file.download_url!=='string'||file.download_url.length>16000)throw new Error('ChatGPT did not attach the generated background file. Pass the actual image as backgroundFile; do not invent a URL.');
  const url=new URL(file.download_url);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!(url.hostname==='oaiusercontent.com'||url.hostname.endsWith('.oaiusercontent.com')))throw new Error('The background must be a ChatGPT file download.');
  if(file.mime_type&&!['image/png','image/jpeg','image/webp'].includes(file.mime_type))throw new Error('The background must be PNG, JPG, or WebP.');
  return {download_url:url.href,file_id:file.file_id.slice(0,300),file_name:String(file.file_name||'ChatGPT-background.png').replace(/[\\/\x00-\x1f]/g,'_').slice(0,160)};
}
export function validateTransferPlan(raw){
  const product=AI_PRODUCTS.find(p=>p.id===raw?.productId);
  if(!product||!/^([a-f0-9]{32})$/.test(raw?.contextId||'')||!Array.isArray(raw.zones)||raw.zones.length!==product.zones.length||new Set(raw.zones.map(z=>z?.zone)).size!==product.zones.length)throw new Error('Use the original contextId and include every garment zone exactly once.');
  for(const zone of raw.zones){
    if(!product.zones.includes(zone.zone)||!Array.isArray(zone.elements)||zone.elements.length>6||zone.elements.some(el=>!['logo','text','artwork'].includes(el?.kind)))throw new Error('The layout contains unsupported zones or layers.');
  }
  return sanitizePlan(raw);
}
export function encodeTransfer(plan,artwork,needsBackgroundUpload=false){
  if(needsBackgroundUpload&&artwork)throw new Error('Choose file transfer or background upload, not both.');
  const bytes=new TextEncoder().encode(JSON.stringify({version:1,plan:validateTransferPlan(plan),artwork:artwork?validateArtworkFile(artwork):null,needsBackgroundUpload:!!needsBackgroundUpload}));
  let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeTransfer(token){
  if(typeof token!=='string'||token.length>60000||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('The design return link is incomplete.');
  const raw=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-token.length%4)%4)),c=>c.charCodeAt(0))));
  if(raw.version!==1)throw new Error('Unsupported design return link.');
  if(raw.needsBackgroundUpload&&raw.artwork)throw new Error('The design return link has conflicting background instructions.');
  return {plan:validateTransferPlan(raw.plan),artwork:raw.artwork?validateArtworkFile(raw.artwork):null,needsBackgroundUpload:raw.needsBackgroundUpload===true};
}
