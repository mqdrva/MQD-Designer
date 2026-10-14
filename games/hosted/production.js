import {PRINT_LAYOUT_VERSION} from './layout-contract.js';
import {renderArtwork} from '../public/render.js';
import {cropGeometry} from '../public/crop.js';
import {makeZip} from '../../v20/everyday-zip.js';
const safe=s=>String(s).replace(/[^a-zA-Z0-9._-]/g,'_');
const blobOf=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not create production PNG')),'image/png'));
const hex=bytes=>Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
const sourceCache=new Map();let productionBusy=false;
async function sourceImage(photo){const url=photo.source?.url||photo.url;if(sourceCache.has(url))return sourceCache.get(url);const response=await fetch(url);if(!response.ok)throw Error('Original image access expired. Refresh the paid order.');const blob=await response.blob();const decoded=await createImageBitmap(blob);let bitmap=decoded;if(Math.max(decoded.width,decoded.height)>3000){const scale=3000/Math.max(decoded.width,decoded.height);const reduced=await createImageBitmap(decoded,{resizeWidth:Math.round(decoded.width*scale),resizeHeight:Math.round(decoded.height*scale),resizeQuality:'high'});decoded.close();bitmap=reduced}const result={blob,bitmap};sourceCache.set(url,result);return result}
export async function renderApprovedGamePhoto(photo){
 const {bitmap}=await sourceImage(photo);let source=bitmap;
 const recipe=photo.outlineRecipe;
 if(recipe){
  const masked=document.createElement('canvas');masked.width=bitmap.width;masked.height=bitmap.height;const ctx=masked.getContext('2d');ctx.beginPath();recipe.points.forEach((p,i)=>i?ctx.lineTo(p.x*masked.width,p.y*masked.height):ctx.moveTo(p.x*masked.width,p.y*masked.height));ctx.closePath();ctx.clip();ctx.drawImage(bitmap,0,0);
  const factor=Math.min(4,Math.max(1,Math.max(bitmap.width,bitmap.height)/500)),first=document.createElement('canvas');first.width=Math.round(500*factor);first.height=first.width;const g=cropGeometry(bitmap.width,bitmap.height,recipe.preserveEdges===true,recipe.frame),x=first.getContext('2d');x.scale(factor,factor);x.drawImage(masked,g.x,g.y,g.w,g.h);source=first;
 }
 const factor=Math.min(4,Math.max(1,Math.max(source.width,source.height)/500)),canvas=document.createElement('canvas');canvas.width=Math.round(500*factor);canvas.height=canvas.width;const g=cropGeometry(source.width,source.height,photo.cutout,photo.crop||{zoom:1,panX:0,panY:0}),ctx=canvas.getContext('2d');ctx.scale(factor,factor);ctx.drawImage(source,g.x,g.y,g.w,g.h);
 return {url:canvas.toDataURL('image/png'),width:canvas.width,height:canvas.height,cutout:photo.cutout};
}
export async function makeGameProductionPackage(detail,{proof=false}={}){
 const record=detail.record;if(!record?.templateManifest||(!proof&&(detail.order?.stripe_payment_status!=='paid'||detail.manufacturingReady!==true)))throw Error('Verified paid game order required');
 if(productionBusy)throw Error('Finish the current production package first.');productionBusy=true;try{
 const game=structuredClone(record.snapshot);game.color=record.color;game.status='revealed';
 const entries=[],manifest={schema:'mqd-shirt-game-production-v1',layoutVersion:PRINT_LAYOUT_VERSION,status:proof?'owner-test-proof':'paid-order',snapshotHash:detail.snapshotHash,templateHash:detail.templateHash,orderNumber:detail.order?.order_number||record.reference,game:record.gameType,product:record.product,color:record.color,size:record.size,quantity:record.quantity,saying:record.saying||null,zones:[],sources:[]};
 for(const item of record.productionContributions||[]){const photo=item.contribution?.photo;if(!photo)continue;const seat=game.participants.find(p=>p.index===item.seat);if(!seat||seat.removed)continue;const original=await sourceImage(photo);entries.push({name:`originals/participant-${item.seat}.${original.blob.type.split('/')[1]||'png'}`,data:original.blob});manifest.sources.push({seat:item.seat,width:photo.source?.width||photo.width,height:photo.source?.height||photo.height,outline:photo.outlineRecipe||null,crop:photo.crop||null});seat.contribution.photo=await renderApprovedGamePhoto(photo);}
 const ownIndex=Math.max(0,game.results?.findIndex(r=>r.seat===record.buyer));
 for(const [zone,template] of Object.entries(record.templateManifest)){
  if(!Number.isInteger(template.width)||!Number.isInteger(template.height)||template.width<1||template.height<1||template.width*template.height>40000000)throw Error('Production template dimensions are invalid');
  const canvas=document.createElement('canvas');canvas.width=template.width;canvas.height=template.height;
  if(zone==='Front'||zone==='Back'||(record.gameType==='faces'&&zone!=='Collar'))await renderArtwork(canvas,game,{side:zone==='Back'?'back':'front',color:record.color,resultIndex:ownIndex,resultText:record.saying});else{canvas.getContext('2d').fillStyle=record.color;canvas.getContext('2d').fillRect(0,0,canvas.width,canvas.height)}
  const blob=await blobOf(canvas),sha256=hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));entries.push({name:`prints/${safe(zone)}.png`,data:blob});manifest.zones.push({name:zone,width:canvas.width,height:canvas.height,sha256,template:template.path||null});canvas.width=1;canvas.height=1;
 }
 entries.push({name:'order-summary.json',data:JSON.stringify({reference:detail.order?.order_number||record.reference,paidAt:detail.order?.paid_at||null,paymentStatus:detail.order?.stripe_payment_status||'unpaid',customer:{name:detail.order?.customer_name||record.buyerName,email:detail.order?.customer_email||null},shipping:{name:detail.order?.shipping_name||null,address:detail.order?.shipping_address||null},product:record.product,size:record.size,quantity:record.quantity,color:record.color},null,2)});
 const metadata={...record};delete metadata.productionContributions;entries.push({name:'manifest.json',data:JSON.stringify(manifest,null,2)},{name:'order.json',data:JSON.stringify(metadata,null,2)},{name:'READ-ME.txt',data:`${proof?'OWNER TEST PROOF — DO NOT SEND TO PRODUCTION':'PAID GAME ORDER'}\nPrint PNGs use the existing garment template pixel dimensions. Review panel placement, seams, bleed and source-photo quality before manufacturing. Original photos and crop/outline settings are included for authorized production staff. Garment background color: ${record.color}. No customer manufacturing download is provided.\n`});
 return {blob:await makeZip(entries),manifest};
 }finally{for(const source of sourceCache.values())source.bitmap.close?.();sourceCache.clear();productionBusy=false}
}
