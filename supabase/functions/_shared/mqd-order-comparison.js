const stable=value=>JSON.stringify(normalize(value));
function normalize(value){if(Array.isArray(value))return value.map(normalize);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])]));return value;}
const email=value=>String(value||'').trim().toLowerCase();
const ignored=new Set(['id','label','filename','originalFilename','backgroundRemovedFilename','storagePath','originalStoragePath','src','image','libraryContentBounds']);
const placementKeys=['x','y','scale','rotation','flipX','flipY','crop','visible','locked'];
export function sameOrderCustomer(a,b){
 if(a.user_id&&b.user_id)return a.user_id===b.user_id;
 return !!email(a.customer_email)&&email(a.customer_email)===email(b.customer_email);
}
export function orderSizes(items=[]){const sizes={};for(const item of items){const rows=Array.isArray(item.order_options)&&item.order_options.length?item.order_options:[{size:'Unspecified',quantity:item.quantity||1}];for(const row of rows){const size=String(row.size||'Unspecified');sizes[size]=(sizes[size]||0)+(Number(row.quantity)||0);}}return sizes;}
export function purchasedDescriptor(order,assets=[]){
 const payload=order.design_json,raw=payload?.design?.zones;
 if(!raw||payload.schema!=='mqd-design-v1'||payload.range)return{complete:false,zones:{},reason:'This order does not have a supported purchased 3D design snapshot.'};
 let complete=true;const zones={};
 for(const [zone,state] of Object.entries(raw)){
  const layers=(state.layers||[]).map(layer=>{
   const settings=Object.fromEntries(Object.entries(layer).filter(([k])=>!ignored.has(k)));
   let content=[];
   if(layer.type==='image'){
    const files=assets.filter(a=>a.zone_name===zone&&String(a.layer_id)===String(layer.id)&&a.layer_type==='image');
    const renders=files.filter(a=>a.metadata?.kind!=='original-source');
    if(renders.length!==1||files.some(a=>!a.content_sha256))complete=false;
    content=files.map(a=>({kind:a.metadata?.kind==='original-source'?'original':'render',sha256:a.content_sha256||null})).sort((a,b)=>stable(a).localeCompare(stable(b)));
   }else if(layer.type!=='text'){complete=false;}
   const placement=Object.fromEntries(placementKeys.filter(k=>k in settings).map(k=>[k,settings[k]]));
   const artwork=Object.fromEntries(Object.entries(settings).filter(([k])=>!placementKeys.includes(k)));
   // Library IDs/settings are conservatively retained; they never prove matching content.
   return {placement,artwork,content};
  });
  zones[zone]={background:order.background_colors?.[zone]||state.background||'#FFFFFF',layers};
 }
 const garment={id:order.product_id||payload.product?.id,model:payload.product?.model||null};
 if(!garment.id||!garment.model||(payload.product?.id&&payload.product.id!==garment.id))complete=false;
 return {complete,zones,garment,templates:payload.templates||{},engine:payload.engine||{}};
}
const priorRef=order=>({id:order.id,orderNumber:order.order_number,paidAt:order.paid_at});
export function comparePurchasedOrders(current,previous,currentAssets=[],previousAssets=[],currentItems=[],previousItems=[]){
 if(!sameOrderCustomer(current,previous))return {status:'unknown',label:'Review needed',changes:[],orderChanges:[],guidance:'Customer identity could not be matched reliably.'};
 const a=purchasedDescriptor(current,currentAssets),b=purchasedDescriptor(previous,previousAssets),changes=[],orderChanges=[];
 if(a.reason||b.reason)return {status:'unknown',label:'Review needed',previousOrder:priorRef(previous),changes:[],orderChanges:[],guidance:a.reason||b.reason};
 if(stable(a.garment)!==stable(b.garment))changes.push('Garment or model changed.');
 if(stable(a.templates)!==stable(b.templates))changes.push('Print templates or dimensions changed.');
 if(stable(a.engine)!==stable(b.engine))changes.push('Design calibration changed.');
 for(const zone of new Set([...Object.keys(a.zones),...Object.keys(b.zones)])){
  const now=a.zones[zone],before=b.zones[zone];
  if(!now||!before){changes.push(`${zone}: print zone ${now?'added':'removed'}.`);continue;}
  if(String(now.background).toUpperCase()!==String(before.background).toUpperCase())changes.push(`${zone}: background color changed (${before.background} → ${now.background}).`);
  if(now.layers.length!==before.layers.length)changes.push(`${zone}: layer count changed (${before.layers.length} → ${now.layers.length}).`);
  if(stable(now.layers.map(l=>l.placement))!==stable(before.layers.map(l=>l.placement)))changes.push(`${zone}: placement, scale, rotation, visibility or layer order changed.`);
  if(stable(now.layers.map(l=>l.artwork))!==stable(before.layers.map(l=>l.artwork)))changes.push(`${zone}: artwork, text or layer settings changed.`);
  if(a.complete&&b.complete&&stable(now.layers.map(l=>l.content))!==stable(before.layers.map(l=>l.content)))changes.push(`${zone}: artwork file contents changed.`);
 }
 const nowSizes=orderSizes(currentItems),beforeSizes=orderSizes(previousItems);
 if(stable(nowSizes)!==stable(beforeSizes)){
  const format=sizes=>Object.entries(sizes).sort().map(([size,n])=>`${size} × ${n}`).join(', ')||'Not recorded';
  orderChanges.push(`Size / quantity: ${format(beforeSizes)} → ${format(nowSizes)}.`);
 }
 const complete=a.complete&&b.complete;
 let status=changes.length?'revised':complete?'same':'unknown';
 if(status==='revised'&&current.design_id!==previous.design_id&&a.garment?.id!==b.garment?.id)status='returning';
 const label={same:'Same design',revised:'Revised design',returning:'New design · returning customer',unknown:'Review needed'}[status];
 return {status,label,previousOrder:priorRef(previous),changes,orderChanges,contentVerified:complete,
  guidance:status==='same'?(orderChanges.length?'Artwork matches. Check size and print dimensions before reusing your prior production files.':'Artwork and placements match. You may reuse your prior production files after checking print dimensions.'):'Download this order and review its production files before printing.',
  warning:complete?null:'Some saved artwork could not be verified. Do not treat this as an exact repeat.'};
}
