import {hasShopAccess} from '../mqd-print-shop-pilot/access.js';
import {validateShopDesignPackage} from './package.js';

export const DESIGN_BUCKET='print-shop-designs';
const TABLE='mqd_print_shop_designs',BUSINESS='mqd_print_shop_businesses';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const PUBLIC_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ORIGINS=new Set(['https://mymerchnow.app','http://127.0.0.1:8765','http://localhost:8765']);
const hex=bytes=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const sha=async value=>hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value));
const denied=()=>{throw Object.assign(new Error('Design not found or access unavailable.'),{status:404});};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const printShop=b=>b?.shop_config&&b.shop_config.fulfillmentMode!=='mymerchnow'&&b.shop_config.organizationType!=='team'&&!b.shop_config.ownerManaged;
const fields='id,business_id,title,engine,product_id,locked,revision,updated_at';
async function active(db,b){
 if(!printShop(b))return false;
 let account=null;
 if(b.status==='active'){const r=await db.from('mqd_print_shop_subscription_accounts').select('status,period_end').eq('business_id',b.id).maybeSingle();if(r.error)return false;account=r.data;}
 return hasShopAccess(b,account);
}
export async function sharedShopDesign(db,{id,token,revision},shopSlug){
 if(!UUID.test(id||'')||!/^[a-f0-9]{64}$/.test(token||''))return denied();
 const r=await db.from(TABLE).select('*').eq('id',id).eq('token_hash',await sha(token)).maybeSingle();
 if(r.error||!r.data)return denied();
 const b=await db.from(BUSINESS).select('*').eq('id',r.data.business_id).maybeSingle();
 if(b.error||!await active(db,b.data)||shopSlug&&b.data.preferred_slug!==shopSlug)return denied();
 if(revision!==undefined&&revision!==r.data.revision)fail('The shop updated this design. Reopen your shared link before continuing.',409);
 return {row:r.data,business:b.data};
}
export function savedShopAppearance(row,business){
 const shop=structuredClone(business.shop_config),appearance=row.appearance;
 if(appearance){
  shop.garmentLogo=appearance.garmentLogo;
  if(shop.garments?.[row.product_id]||appearance.garment){
   shop.garments||={};shop.garments[row.product_id]={...appearance.garment,...shop.garments[row.product_id],logoPreset:appearance.logoPreset,printZones:appearance.printZones};
  }
 }
 return shop;
}
// A shared capability only reads one saved design. It never authorizes owner
// writes, enumeration, setup changes, private customer records or billing.
export function createShopDesignHandler({db,JSZip,secret}){
 const cipherKey=async()=>crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode('print-shop-design:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);
 const encrypt=async token=>{const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:[...iv],data:[...new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipherKey(),new TextEncoder().encode(token)))]};};
 const decrypt=async cipher=>new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(cipher.iv)},await cipherKey(),new Uint8Array(cipher.data)));
 const ownerRecord=async row=>({...Object.fromEntries(fields.split(',').map(k=>[k,row[k]])),token:await decrypt(row.token_cipher)});
 return async req=>{
  const origin=req.headers.get('origin')||'',cors={'Vary':'Origin','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
  if(ORIGINS.has(origin))Object.assign(cors,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'});
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(origin&&!ORIGINS.has(origin))return json({error:'This origin is unavailable.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return json({error:'Use the design workspace.'},405);
  if(req.headers.get('apikey')!==PUBLIC_KEY)return json({error:'Application key required.'},401);
  try{
   // Bound both JSON and multipart input while streaming; Content-Length alone
   // cannot prevent an oversized chunked request from exhausting the runtime.
   const reader=req.body?.getReader();if(!reader)fail('Design details are missing.');
   let length=0;const chunks=[];
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>8*1024*1024+100000){await reader.cancel();fail('Saved design exceeds 8 MB. Keep the original artwork intact.',413);}chunks.push(value);}
   const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
   const multipart=req.headers.get('content-type')?.startsWith('multipart/form-data');
   let body,file;
   if(multipart){const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')},body:bytes}).formData();const raw=form.get('payload');if(typeof raw!=='string'||raw.length>4000)fail('Invalid design details.');body=JSON.parse(raw);file=form.get('package');}
   else{if(length>4000)fail('Invalid design details.');body=JSON.parse(new TextDecoder().decode(bytes));}
   if(['shared-load','shared-package'].includes(body.action)){
    const {row,business}=await sharedShopDesign(db,body);
    if(body.action==='shared-load')return json({design:Object.fromEntries(fields.split(',').filter(k=>k!=='business_id').map(k=>[k,row[k]])),shop:savedShopAppearance(row,business)});
    const result=await db.storage.from(DESIGN_BUCKET).download(row.package_path);if(result.error||!result.data)fail('Saved artwork could not load. Retry this link.',503);
    return new Response(result.data,{headers:{...cors,'Content-Type':'application/zip','Content-Disposition':'attachment; filename="saved-design.zip"'}});
   }
   const jwt=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
   const user=jwt?(await db.auth.getUser(jwt)).data?.user:null;
   if(!user?.email_confirmed_at||!user.email||user.is_anonymous)fail('Sign in with your verified shop-owner email.',401);
   if(user.app_metadata?.role==='admin'){
    const claims=await db.auth.getClaims(jwt);
    if(claims.error||claims.data?.claims?.aal!=='aal2')fail('Complete your existing owner authenticator verification.',403);
   }
   if(body.action==='shops'){
    const result=await db.from(BUSINESS).select('*').eq('owner_email',user.email.toLowerCase()).order('created_at',{ascending:false}).limit(100);
    if(result.error)fail('Your shops could not load.',503);
    return json({shops:(result.data||[]).filter(printShop).map(b=>({id:b.id,name:b.shop_config.name,slug:b.preferred_slug,engines:b.shop_config.engines}))});
   }
   if(!UUID.test(body.businessId||''))return denied();
   const result=await db.from(BUSINESS).select('*').eq('id',body.businessId).eq('owner_email',user.email.toLowerCase()).maybeSingle(),business=result.data;
   if(result.error||!printShop(business)||!business.email_verified_at)return denied();
   if(!await active(db,business))fail('This shop must have current designer access before saving or sharing designs.',403);
   if(body.action==='list'){
    const r=await db.from(TABLE).select(fields).eq('business_id',business.id).order('updated_at',{ascending:false}).limit(100);
    if(r.error)fail('Saved designs could not load.',503);return json({designs:r.data,shop:business.shop_config});
   }
   if(!UUID.test(body.id||''))return denied();
   const r=await db.from(TABLE).select('*').eq('id',body.id).eq('business_id',business.id).maybeSingle();
   if(r.error)fail('Saved design could not load.',503);const prior=r.data;
   if(body.action==='owner-load'){if(!prior)return denied();return json({design:await ownerRecord(prior),shop:savedShopAppearance(prior,business)});}
   if(body.action==='owner-package'){
    if(!prior)return denied();if(body.revision!==prior.revision)fail('This design changed. Reopen before editing.',409);
    const download=await db.storage.from(DESIGN_BUCKET).download(prior.package_path);if(download.error||!download.data)fail('Original artwork could not load.',503);
    return new Response(download.data,{headers:{...cors,'Content-Type':'application/zip'}});
   }
   if(!['save','lock'].includes(body.action))fail('Unsupported owner action.');
   if(typeof body.locked!=='boolean'||!Number.isSafeInteger(body.revision)||body.revision!==(prior?.revision||0))fail('This design changed. Reopen it before saving.',409);
   if(body.action==='lock'&&!prior)return denied();
   let change={locked:body.locked,revision:body.revision+1,updated_at:new Date().toISOString()},path=null;
   if(body.action==='save'){
    if(typeof body.title!=='string'||!body.title.trim()||body.title.length>100||!(file instanceof File))fail('Enter a design title and save its artwork.');
    const shop=prior?savedShopAppearance(prior,business):business.shop_config;
    const data=new Uint8Array(await file.arrayBuffer()),info=await validateShopDesignPackage(data,shop,JSZip);
    if(prior&&prior.engine!==info.engine)fail('Open the original designer for this saved design.');
    path=business.id+'/'+body.id+'/'+crypto.randomUUID()+'.zip';
    const upload=await db.storage.from(DESIGN_BUCKET).upload(path,data,{contentType:'application/zip',upsert:false});if(upload.error)fail('Artwork could not save. Your original is unchanged.',503);
    change={...change,title:body.title.trim(),engine:info.engine,product_id:info.productId,package_path:path,appearance:{garmentLogo:shop.garmentLogo||'',garment:shop.garments?.[info.productId]||null,logoPreset:shop.garments?.[info.productId]?.logoPreset||{mode:'none'},printZones:shop.garments?.[info.productId]?.printZones||null}};
   }
   let saved;
   if(prior)saved=await db.from(TABLE).update(change).eq('id',body.id).eq('business_id',business.id).eq('revision',body.revision).select('*').maybeSingle();
   else{
    const token=hex(crypto.getRandomValues(new Uint8Array(32)));
    saved=await db.from(TABLE).insert({...change,id:body.id,business_id:business.id,created_by:user.id,token_hash:await sha(token),token_cipher:await encrypt(token)}).select('*').maybeSingle();
   }
   if(saved.error||!saved.data){if(path)await db.storage.from(DESIGN_BUCKET).remove([path]);fail('The design changed or could not save. Reopen before retrying; the original is unchanged.',409);}
   // Old immutable packages remain private. A later retention job can prune
   // unreferenced versions; deleting them here could race an in-flight reader.
   return json({design:await ownerRecord(saved.data)});
  }catch(error){return json({error:error.message||'Design could not be processed.'},error.status||400);}
 };
}
