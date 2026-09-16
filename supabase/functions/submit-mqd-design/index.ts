import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const safe=(v:string)=>v.replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,120);
const mimeFor=(blob:Blob,path:string)=>blob.type&&blob.type!=='application/octet-stream'?blob.type:path.toLowerCase().endsWith('.jpg')||path.toLowerCase().endsWith('.jpeg')?'image/jpeg':path.toLowerCase().endsWith('.webp')?'image/webp':'image/png';
function serviceKey(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();
 if(req.method==='GET')return json({ok:true,service:'submit-mqd-design',version:5});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  if(!url||!key)return json({error:'Backend service credentials are not configured'},500);
  const authorization=req.headers.get('authorization')||'',token=authorization.replace(/^Bearer\s+/i,'');
  if(!token)return json({error:'Sign in is required'},401);
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userError}=await supabase.auth.getUser(token);
  if(userError||!user)return json({error:'Your sign-in session is invalid or expired'},401);
  const form=await req.formData(),raw=String(form.get('payload')||'');
  if(!raw||raw.length>2_000_000)return json({error:'Invalid design payload'},400);
  const payload=JSON.parse(raw),p=payload?.product,designId=String(payload?.designId||'');
  if(!p?.id||!p?.name||!payload?.design?.zones||!designId)return json({error:'Incomplete design'},400);
  const libraryJobs:Array<{zone:string;layer:any;asset:any;placement:any}>=[];
  for(const [zone,state] of Object.entries<any>(payload.design.zones||{}))for(const layer of state?.layers||[]){
   if(layer?.type!=='image'||!layer?.libraryAssetId)continue;
   const {data:asset,error:assetLookupError}=await supabase.from('mqd_library_assets').select('id,name,slug,category,master_path,placement_mode,active').eq('id',String(layer.libraryAssetId)).eq('active',true).maybeSingle();
   if(assetLookupError)return json({error:assetLookupError.message,stage:'library_asset_lookup'},500);
   if(!asset)return json({error:`MQD library artwork is unavailable for ${zone}`,stage:'library_asset_lookup'},400);
   const {data:placement,error:placementError}=await supabase.from('mqd_library_asset_placements').select('x,y,scale,rotation,flip_x,flip_y,crop').eq('asset_id',asset.id).eq('product_id',String(p.id)).eq('zone_name',zone).maybeSingle();
   if(placementError)return json({error:placementError.message,stage:'library_placement_lookup'},500);
   if(!placement)return json({error:`MQD library artwork is not approved for ${p.name} · ${zone}`,stage:'library_placement_lookup'},400);
   if(asset.placement_mode==='locked')Object.assign(layer,{x:Number(placement.x),y:Number(placement.y),scale:Number(placement.scale),rotation:Number(placement.rotation),flipX:!!placement.flip_x,flipY:!!placement.flip_y,crop:placement.crop,libraryLocked:true});
   else layer.libraryLocked=false;
   delete layer.src;delete layer.storagePath;libraryJobs.push({zone,layer,asset,placement});
  }
  const {data:design,error:designError}=await supabase.from('customer_designs').select('id').eq('id',designId).eq('user_id',user.id).maybeSingle();
  if(designError)return json({error:designError.message,stage:'design_lookup'},500);
  if(!design)return json({error:'The saved design does not belong to this account'},403);
  const backgrounds:Record<string,string>={};
  for(const [zone,state] of Object.entries<any>(payload.design.zones||{}))backgrounds[zone]=String(state?.background||'#FFFFFF').toUpperCase();
  const {data:order,error:orderErr}=await supabase.from('mqd_orders').insert({user_id:user.id,design_id:designId,status:'submitted',customer_email:user.email||null,product_id:String(p.id),product_name:String(p.name),product_price:Number(p.price)||null,engine_calibration:String(payload?.engine?.calibration||''),design_json:payload,background_colors:backgrounds}).select('id,order_number').single();
  if(orderErr)return json({error:orderErr.message,details:orderErr.details||null,code:orderErr.code||null,stage:'order_insert'},500);
  const orderOptions=Array.isArray(payload.orderOptions)?payload.orderOptions:[];
  const quantity=Math.max(1,Number(payload.totalQuantity)||orderOptions.reduce((n:number,x:any)=>n+(Number(x?.quantity)||0),0)||1);
  const {error:itemErr}=await supabase.from('mqd_order_items').insert({order_id:order.id,design_id:designId,product_id:String(p.id),product_name:String(p.name),unit_price:Number(p.price)||null,quantity,order_options:orderOptions});
  if(itemErr)return json({error:itemErr.message,stage:'order_item_insert'},500);
  let mockupPath:string|null=null;const mockup=form.get('mockup');
  if(mockup instanceof File&&mockup.size){
   if(mockup.size>12*1024*1024)return json({error:'Mockup image is too large',stage:'mockup'},400);
   mockupPath=`${order.id}/mockup.png`;
   const {error}=await supabase.storage.from('mqd-production').upload(mockupPath,mockup,{contentType:'image/png',upsert:true});
   if(error)return json({error:error.message,stage:'mockup_upload'},500);
   const {error:updateErr}=await supabase.from('mqd_orders').update({mockup_path:mockupPath}).eq('id',order.id);
   if(updateErr)return json({error:updateErr.message,stage:'order_update'},500);
  }
  const files=form.getAll('asset').filter(v=>v instanceof File) as File[],metaRaw=form.getAll('assetMeta').map(String);
  for(let i=0;i<files.length;i++){
   const file=files[i],meta=JSON.parse(metaRaw[i]||'{}');
   if(file.size>20*1024*1024)return json({error:'Artwork file is too large',stage:'asset_validation'},400);
   if(!['image/png','image/jpeg','image/webp'].includes(file.type))return json({error:`Unsupported artwork type: ${file.type||'unknown'}`,stage:'asset_validation'},400);
   const path=`${order.id}/${safe(String(meta.zone||'zone'))}/${String(i+1).padStart(2,'0')}-${safe(file.name||'artwork')}`;
   const {error:upErr}=await supabase.storage.from('mqd-production').upload(path,file,{contentType:file.type,upsert:true});
   if(upErr)return json({error:upErr.message,stage:'asset_upload'},500);
   const {error:assetErr}=await supabase.from('mqd_order_assets').insert({order_id:order.id,zone_name:String(meta.zone||''),layer_id:String(meta.layerId||''),layer_type:'image',original_filename:file.name,storage_path:path,mime_type:file.type,background_hex:backgrounds[String(meta.zone||'')]||null,metadata:meta});
   if(assetErr)return json({error:assetErr.message,stage:'asset_insert'},500);
  }
  for(let i=0;i<libraryJobs.length;i++){
   const job=libraryJobs[i],{data:master,error:downloadError}=await supabase.storage.from('mqd-library-assets').download(job.asset.master_path);
   if(downloadError||!master)return json({error:downloadError?.message||'MQD library master is unavailable',stage:'library_master_download'},500);
   if(master.size>50*1024*1024)return json({error:'MQD library master is too large',stage:'library_master_validation'},500);
   const filename=safe(job.asset.master_path.split('/').pop()||`${job.asset.slug}.png`),path=`${order.id}/${safe(job.zone)}/library-${String(i+1).padStart(2,'0')}-${filename}`,contentType=mimeFor(master,job.asset.master_path);
   const {error:uploadError}=await supabase.storage.from('mqd-production').upload(path,master,{contentType,upsert:true});
   if(uploadError)return json({error:uploadError.message,stage:'library_master_upload'},500);
   const metadata={...job.layer,libraryAssetId:job.asset.id,libraryAssetName:job.asset.name,libraryCategory:job.asset.category,source:'mqd-library'};delete metadata.src;delete metadata.image;
   const {error:recordError}=await supabase.from('mqd_order_assets').insert({order_id:order.id,zone_name:job.zone,layer_id:String(job.layer.id||''),layer_type:'image',original_filename:filename,storage_path:path,mime_type:contentType,background_hex:backgrounds[job.zone]||null,metadata});
   if(recordError)return json({error:recordError.message,stage:'library_asset_insert'},500);
  }
  for(const [zone,state] of Object.entries<any>(payload.design.zones||{}))for(const layer of state?.layers||[]){
   if(layer?.type!=='text')continue;
   const {error}=await supabase.from('mqd_order_assets').insert({order_id:order.id,zone_name:zone,layer_id:String(layer.id||''),layer_type:'text',background_hex:backgrounds[zone]||null,metadata:layer});
   if(error)return json({error:error.message,stage:'text_asset_insert'},500);
  }
  return json({ok:true,designId,orderId:order.id,orderNumber:order.order_number,mockupPath});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e),stage:'unexpected'},500);}
});
