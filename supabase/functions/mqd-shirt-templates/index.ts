import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {hasAdminMfa} from '../_shared/mqd-admin-security.js';
import {UUID,assertTemplateDraft,cloneTemplate,templateLayers} from '../_shared/mqd-template-contract.js';
const MAX_BYTES=20*1024*1024;
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});}
const checked=(r:any)=>{if(r.error)throw new Error(r.error.message);return r.data;};
function cleanPayload(payload:any){
 const copy=structuredClone(payload);delete copy.designId;delete copy.orderOptions;delete copy.totalQuantity;delete copy.design.template;
 // Export only the renderer's explicit public design shape, not customer/account metadata.
 const allowed=new Set('id type label filename x y scale rotation flipX flipY crop visible text font strokeColor weight fontFamily fontSize fontWeight fontStyle color align stroke strokeWidth letterSpacing lineHeight bold italic curved curveAmount textAlign textColor outlineColor outlineWidth libraryAssetId libraryLocked libraryPreset libraryStackOrder libraryPlacements libraryContentBounds libraryCategory chatBackground templateAssetPath src'.split(' '));
 copy.design={zones:Object.fromEntries(Object.entries<any>(copy.design.zones).map(([zone,state])=>[zone,{background:state.background,layers:state.layers.map((l:any)=>Object.fromEntries(Object.entries(l).filter(([key])=>allowed.has(key))))}]))};
 return {schema:copy.schema,engine:copy.engine,product:{id:copy.product.id,name:copy.product.name,category:copy.product.category,model:copy.product.model},templates:copy.templates,activeZone:copy.activeZone,design:copy.design};
}
async function publishAsset(db:any,version:string,blob:Blob,name:string){
 if(blob.size<1||blob.size>MAX_BYTES||!['image/png','image/jpeg','image/webp'].includes(blob.type))throw new Error('Approved assets must be PNG, JPEG or WebP, up to 20 MB.');
 const path=`${version}/${crypto.randomUUID()}-${name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80)}`;
 checked(await db.storage.from('mqd-template-published').upload(path,blob,{contentType:blob.type,upsert:false}));return path;
}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return json({ok:true});if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
 const url=Deno.env.get('SUPABASE_URL')||'',db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'',{auth:{persistSession:false}});
 const raw=await req.text();if(raw.length>3_000_000)return json({error:'Request too large'},413);const body=JSON.parse(raw),action=body.action;
 if(action==='gallery'){
   const templates=checked(await db.from('mqd_shirt_templates').select('id,published_version_id').not('published_version_id','is',null))||[];
   if(!templates.length)return json({designs:[]});
   const versions=checked(await db.from('mqd_shirt_template_versions').select('snapshot').in('id',templates.map((r:any)=>r.published_version_id)))||[];
   return json({designs:versions.map(({snapshot:v}:any)=>({id:v.template_id,versionId:v.id,name:v.name,categories:v.categories,garment:v.payload.product.name,range:v.range,previews:v.previews}))});
 }
 if(action==='select'){
   if(!UUID.test(body.id)||!UUID.test(body.versionId))return json({error:'Invalid template identifier'},400);
   const template=checked(await db.from('mqd_shirt_templates').select('published_version_id').eq('id',body.id).maybeSingle());
   if(template?.published_version_id!==body.versionId)return json({error:'This look is no longer available for new selections.'},404);
   const row=checked(await db.from('mqd_shirt_template_versions').select('snapshot').eq('id',body.versionId).eq('template_id',body.id).single());return json({payload:cloneTemplate(row.snapshot)});
 }
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sign in required'},401);
 const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return json({error:'Sign in required'},401);
 if(user.app_metadata?.role!=='admin'||!await hasAdminMfa(db,token))return json({error:'Owner account and authenticator verification required'},403);
 if(action==='owner-list')return json({templates:checked(await db.from('mqd_shirt_templates').select('*').eq('owner_id',user.id).order('updated_at',{ascending:false})),designs:checked(await db.from('customer_designs').select('id,name,product_name').eq('user_id',user.id).eq('status','draft'))});
 if(action==='create'){
   if(!UUID.test(body.designId))return json({error:'Select an owner design'},400);
   const source=checked(await db.from('customer_designs').select('design_json').eq('id',body.designId).eq('user_id',user.id).single());
   if(!['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie','lightweight-jacket','hood-mask-shirt','hooded-long-sleeve'].includes(source.design_json?.product?.id))throw new Error('Choose a supported 3D shirt or hoodie design.');
   const draft={name:'New shirt design',categories:['General Business'],range:'All-over print',payload:source.design_json,rules:templateLayers(source.design_json).map(({zone,layer}:any)=>({zone,layerId:layer.id,role:'locked',label:layer.label||zone})),previews:{}};
   return json({template:checked(await db.from('mqd_shirt_templates').insert({owner_id:user.id,draft}).select('*').single())});
 }
 if(!UUID.test(body.id))return json({error:'Invalid template identifier'},400);
 const record=checked(await db.from('mqd_shirt_templates').select('*').eq('id',body.id).eq('owner_id',user.id).single());
 if(action==='save'){
   assertTemplateDraft(body.draft);
   // The source payload is server-owned: settings may change rules, categories, names, not substitute a customer design.
   const draft={...record.draft,name:body.draft.name,categories:[...new Set(body.draft.categories)],range:String(body.draft.range||'All-over print').slice(0,80),rules:body.draft.rules};
   assertTemplateDraft(draft);checked(await db.from('mqd_shirt_templates').update({draft,updated_at:new Date().toISOString()}).eq('id',record.id));return json({ok:true});
 }
 if(action==='preview-upload'){
   if(!['Front','Back'].includes(body.side)||!/^data:image\/(png|jpeg|webp);base64,/.test(body.data))throw new Error('Choose a Front or Back preview image.');
   const blob=await(await fetch(body.data)).blob();if(blob.size>2*1024*1024)throw new Error('Preview must be under 2 MB.');
   const path=`${record.id}/${crypto.randomUUID()}.png`;checked(await db.storage.from('mqd-template-drafts').upload(path,blob,{contentType:blob.type,upsert:false}));record.draft.previews[body.side]=path;
   checked(await db.from('mqd_shirt_templates').update({draft:record.draft}).eq('id',record.id));return json({ok:true});
 }
 if(action==='preview'){
   const payload=structuredClone(record.draft.payload);
   for(const {layer} of templateLayers(payload))if(layer.type==='image'){
     if(layer.libraryAssetId){const asset=checked(await db.from('mqd_library_assets').select('master_path').eq('id',layer.libraryAssetId).single());layer.src=checked(await db.storage.from('mqd-library-assets').createSignedUrl(asset.master_path,600)).signedUrl;}
     else if(layer.storagePath?.startsWith(user.id+'/'))layer.src=checked(await db.storage.from('customer-artwork').createSignedUrl(layer.storagePath,600)).signedUrl;
   }
   const preview=cloneTemplate({id:crypto.randomUUID(),template_id:record.id,name:record.draft.name,payload,rules:record.draft.rules});preview.design.template.demo=true;return json({payload:preview});
 }
 if(action==='unpublish'){checked(await db.from('mqd_shirt_templates').update({published_version_id:null}).eq('id',record.id));return json({ok:true});}
 if(action==='publish'){
   const draft=assertTemplateDraft(record.draft),versionId=crypto.randomUUID();
   if(!draft.previews?.Front||!draft.previews?.Back)throw new Error('Upload actual Front and Back previews before publishing.');
   const payload=cleanPayload(draft.payload),originals=templateLayers(draft.payload);
   for(const {zone,layer} of templateLayers(payload))if(layer.type==='image'){
     const source=originals.find((x:any)=>x.zone===zone&&x.layer.id===layer.id)!.layer;let bucket='',path='';
     if(source.libraryAssetId){bucket='mqd-library-assets';path=checked(await db.from('mqd_library_assets').select('master_path').eq('id',source.libraryAssetId).single()).master_path;}
     else if(source.storagePath?.startsWith(user.id+'/')&&!source.storagePath.includes('..')){bucket='customer-artwork';path=source.storagePath;}
     else throw new Error('Save every artwork asset to the owner account before publishing.');
     let blob=checked(await db.storage.from(bucket).download(path));if(blob.type==='application/octet-stream'||!blob.type)blob=new Blob([blob],{type:/\.jpe?g$/i.test(path)?'image/jpeg':/\.webp$/i.test(path)?'image/webp':'image/png'});layer.templateAssetPath=await publishAsset(db,versionId,blob,source.filename||'artwork.png');
     layer.templateAssetHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
     layer.src=db.storage.from('mqd-template-published').getPublicUrl(layer.templateAssetPath).data.publicUrl;
   }
   const previews:any={};for(const side of ['Front','Back']){
     const path=draft.previews[side];if(!path.startsWith(record.id+'/')||path.includes('..'))throw new Error('Invalid preview asset.');
     const published=await publishAsset(db,versionId,checked(await db.storage.from('mqd-template-drafts').download(path)),side+'.png');previews[side]=db.storage.from('mqd-template-published').getPublicUrl(published).data.publicUrl;
   }
   const snapshot={id:versionId,template_id:record.id,name:draft.name,categories:draft.categories,range:draft.range,payload,rules:draft.rules,previews};
   checked(await db.from('mqd_shirt_template_versions').insert({id:versionId,template_id:record.id,snapshot}));
   checked(await db.from('mqd_shirt_templates').update({published_version_id:versionId}).eq('id',record.id));return json({ok:true,versionId});
 }
 return json({error:'Unknown action'},400);
 }catch(error){return json({error:error instanceof Error?error.message:'Template request failed'},400);}
});
