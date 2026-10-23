import {canonicalTeamShop} from '../mqd-team-service/runtime.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {validateSetup} from './validation.js';
import {hasAdminMfa} from './admin-security.js';
const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ALLOWED=new Set(['https://mymerchnow.app','https://mqd-designer-vercel-git-codex-print-shop-paid-launch-mqd1.vercel.app','https://mqd-designer-vercel-git-codex-print-shop-launch-preview-mqd1.vercel.app','http://127.0.0.1:8765','http://localhost:8765']);
const TABLE='mqd_print_shop_businesses';
const encode=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
const decode=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('');
const hash=async(v:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
async function cipherKey(){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode('print-shop-owner:'+Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function encrypt(token:string){const iv=crypto.getRandomValues(new Uint8Array(12));return {iv:encode(iv),data:encode(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cipherKey(),new TextEncoder().encode(token))))};}
async function decrypt(value:any){return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(value.iv)},await cipherKey(),decode(value.data)));}
async function secret(db:any,name:string){const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');}
async function mail(db:any,data:any,key:string){
 const apiKey=Deno.env.get('MQD_RESEND_API_KEY')||await secret(db,'mqd_resend_api_key');
 const from=Deno.env.get('MQD_EMAIL_FROM')||await secret(db,'mqd_email_from')||'MYMERCHNOW Print Shops <notifications@mymerchnow.app>';
 if(!apiKey)throw new Error('Setup saved, but confirmation email is not configured. Retry with the same submission.');
 for(let attempt=0;attempt<3;attempt++){
  let response:Response;
  try{response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from,...data}),signal:AbortSignal.timeout(10000)});}
  catch(error){if(attempt===2)throw new Error('Email delivery could not be confirmed. Your setup is saved.');await new Promise(r=>setTimeout(r,500*2**attempt));continue;}
  if(response.ok)return await response.json();
  if((response.status===429||response.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,500*2**attempt));continue;}
  throw new Error('Email could not be accepted. Your setup is saved.');
 }

}
async function rawBody(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new Error('Send setup details as JSON.');const reader=req.body?.getReader();if(!reader)throw new Error('Setup details are missing.');let length=0;const chunks=[];while(true){const item=await reader.read();if(item.done)break;length+=item.value.length;if(length>2*1024*1024){await reader.cancel();throw new Error('Setup is too large. Use a smaller logo.');}chunks.push(item.value);}const out=new Uint8Array(length);let i=0;for(const chunk of chunks){out.set(chunk,i);i+=chunk.length;}return JSON.parse(new TextDecoder().decode(out));}
const packetFor=(row:any)=>({schema:'mqd-business-setup-v1',status:'pending-review',plan:row.pending_plan||row.plan,owner:{requestEmail:row.owner_email,phone:row.owner_phone},shop:row.pending_config||row.shop_config});
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors:any={'Vary':'Origin'};
 if(ALLOWED.has(origin))Object.assign(cors,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type,authorization','Access-Control-Allow-Methods':'POST,OPTIONS'});
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...cors}});
 if(origin&&!ALLOWED.has(origin))return json({error:'This origin is unavailable.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'Use the setup form.'},405);
 if(req.headers.get('apikey')!==KEY)return json({error:'Application key required.'},401);
 try{
  const body=await rawBody(req),db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const site=ALLOWED.has(origin)?origin:'https://mymerchnow.app';
  if(['admin-list','admin-review','admin-recover','admin-detail'].includes(body.action)){
   const jwt=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';const {data,error:authError}=await db.auth.getUser(jwt);
   if(authError||data.user?.app_metadata?.role!=='admin'||!await hasAdminMfa(db,jwt))return json({error:'Owner administrator access required.'},403);
   if(body.action==='admin-list'){const {data:rows,error}=await db.from(TABLE).select('id,preferred_slug,plan,owner_email,owner_phone,shop_config,pending_config,pending_plan,status,email_verified_at,billing_status,revision,created_at,pilot_expires_at').order('created_at',{ascending:false}).limit(100);if(error)throw new Error('Setup list could not load.');return json({businesses:rows});}
   const {data:row,error:findError}=await db.from(TABLE).select('*').eq('id',body.id).single();if(findError||!row)return json({error:'Setup not found.'},404);
   if(body.action==='admin-detail'){const safe=Object.fromEntries(['id','preferred_slug','plan','owner_email','owner_phone','shop_config','pending_config','pending_plan','status','email_verified_at','billing_status','revision','created_at','pilot_expires_at'].map(key=>[key,row[key]]));return json({business:safe});}
   if(row.status==='closed')return json({error:'Closed shops cannot be reactivated through pilot review.'},409);
   if(!row.email_verified_at)return json({error:'The business must verify its email before activation.'},409);
   if(body.revision!==row.revision)return json({error:'Setup changed. Reload before reviewing.'},409);
   if(body.action==='admin-recover'){
    let token:string;
    if(new Date(row.token_expires_at).getTime()<=Date.now()){
     token=hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
     const {data:updated,error}=await db.from(TABLE).update({token_hash:await hash(token),token_cipher:await encrypt(token),token_expires_at:new Date(Date.now()+30*86400000).toISOString(),revision:row.revision+1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('revision',row.revision).select('id').maybeSingle();
     if(error||!updated)return json({error:'Owner access changed. Reload and try again.'},409);
    }else token=await decrypt(row.token_cipher);
    const link='https://mymerchnow.app/print-shop-setup.html?setupId='+row.id+'#manage='+token;
    try{await mail(db,{to:[row.owner_email],subject:'Your MYMERCHNOW print-shop owner access',text:`Use this private link to review your setup and manage subscription billing:\n\n${link}\n\nKeep this link private. It has limited validity; contact MYMERCHNOW if it expires. Customer garment payments are handled by your business.`},'shop-recovery-'+row.id+'-'+row.revision);}catch{return json({error:'Owner link could not be emailed. Retry or contact support.'},502);}
    return json({status:row.status,notificationAccepted:true,message:'Private owner link sent to the verified business email.'});
   }
   if(body.decision!=='suspend'&&(row.pending_config||row.shop_config)?.fulfillmentMode==='mymerchnow')return json({error:'Team links need the dedicated MYMERCHNOW order checkout before activation. This setup is saved for review.'},409);
   if(!['approve-pilot','approve-settings','suspend'].includes(body.decision))throw new Error('Choose a valid review action.');
   if(body.decision==='approve-pilot'&&(row.status==='active'||row.billing_status!=='not_configured'))return json({error:'Paid subscriptions must be managed through billing.'},409);
   if(body.decision==='approve-settings'){
    if(row.status!=='active'||!row.pending_config||(row.pending_plan&&row.pending_plan!==row.plan))return json({error:'Only settings for the current paid plan can be approved here.'},409);
    const {data:updated,error}=await db.from(TABLE).update({shop_config:row.pending_config,pending_config:null,pending_plan:null,revision:row.revision+1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('revision',row.revision).eq('status','active').select('id').maybeSingle();
    if(error||!updated)return json({error:'Review changed. Reload and try again.'},409);
    return json({status:'active',notificationAccepted:false,warning:'Shop settings approved. Share the updated shop link with the owner.',link:row.mail_origin+'/shops/'+row.preferred_slug});
   }
   const status=body.decision==='suspend'?'suspended':'pilot_active',expires=new Date(Date.now()+7*86400000).toISOString();
   const update:any={status,updated_at:new Date().toISOString(),revision:row.revision+1};
   if(status==='pilot_active')Object.assign(update,{approved_at:new Date().toISOString(),pilot_expires_at:expires,shop_config:row.pending_config||row.shop_config,plan:row.pending_plan||row.plan,pending_config:null,pending_plan:null});
   const {data:updated,error}=await db.from(TABLE).update(update).eq('id',row.id).eq('revision',row.revision).select('id').maybeSingle();if(error?.code==='23505')return json({error:'That shop link is already active. Change it before approval.'},409);if(error||!updated)return json({error:'Review changed. Reload and try again.'},409);
   const link=row.mail_origin+'/shops/'+row.preferred_slug;let notificationAccepted=true;try{await mail(db,{to:[row.owner_email],subject:status==='pilot_active'?'Your MYMERCHNOW print-shop pilot is ready':'Your print-shop pilot is paused',text:status==='pilot_active'?`${row.shop_config.name}, your 7-day pilot is active.\n\nYour 2D link: ${link}\n${(row.pending_plan||row.plan)==='3d'?'Your 3D link: '+link+'/3d\n':''}\nNo subscription payment was collected. Pilot expires ${expires}. Customers send unpaid requests; your business confirms production and collects payment.\n${row.mail_origin.includes('127.0.0.1')||row.mail_origin.includes('localhost')?'These local preview links work only on the computer running the pilot.':''}`:'Your pilot link has been paused. Contact MYMERCHNOW for help.'},'shop-review-'+row.id+'-'+update.revision);}catch{notificationAccepted=false;}
   return json({status,notificationAccepted,warning:notificationAccepted?null:'Review saved, but the notification email could not be confirmed. Share the shop link with the owner.',link:status==='pilot_active'?link:null,expiresAt:status==='pilot_active'?expires:null});
  }
  if(['load','update'].includes(body.action)){
   if(typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token)||typeof body.id!=='string')return json({error:'This private setup link is invalid.'},401);
   const {data:row,error}=await db.from(TABLE).select('*').eq('id',body.id).eq('token_hash',await hash(body.token)).single();
   if(error||!row||new Date(row.token_expires_at).getTime()<Date.now())return json({error:'This private setup link is invalid or expired. Contact MYMERCHNOW for help.'},401);
   if(body.action==='load'){if(!row.email_verified_at){const {error:verifyError}=await db.from(TABLE).update({email_verified_at:new Date().toISOString()}).eq('id',row.id);if(verifyError)throw new Error('Email confirmation could not be saved. Reopen this link.');}return json({setup:packetFor(row),reference:'SETUP-'+row.id.replaceAll('-','').slice(0,12).toUpperCase(),revision:row.revision,status:row.status,emailVerified:true,pilotExpiresAt:row.pilot_expires_at,billingStatus:row.billing_status});}
   if(row.status==='closed')return json({error:'This shop is closed. Contact MYMERCHNOW for help.'},409);
   const packet=validateSetup(body.setup);if(packet.shop.organizationType==='team')packet.shop=canonicalTeamShop(packet.shop);const teamPacket=packet.shop.organizationType==='team';if((row.shop_config.organizationType==='team')!==(packet.shop.organizationType==='team'))return json({error:'Create a separate Team or Print Shop setup to change service type.'},409);if(packet.owner.requestEmail!==row.owner_email||packet.shop.slug!==row.preferred_slug)return json({error:'Contact MYMERCHNOW to change your verified email or shop link.'},409);
   if(body.revision!==row.revision)return json({error:'Your setup changed. Reopen your private link before updating.'},409);
   if(row.status==='active'&&packet.plan!==row.plan)return json({error:'Contact MYMERCHNOW support to request a subscription plan change.'},409);
   const {data:changed,error:updateError}=await db.from(TABLE).update({pending_config:packet.shop,pending_plan:packet.plan,owner_phone:packet.owner.phone,revision:row.revision+1,updated_at:new Date().toISOString()}).eq('id',row.id).eq('revision',row.revision).select('id').maybeSingle();if(updateError||!changed)return json({error:'Setup changed. Reload before updating.'},409);
   let notificationAccepted=true;try{await mail(db,{to:['mqdrva@gmail.com'],reply_to:row.owner_email,subject:'[Print Shops] Owner update awaiting review',text:`${packet.shop.name} submitted updated settings.\nShop: ${row.preferred_slug}\nReference: ${row.id}\nReview in ${site}/print-shop-admin.html\nCurrent live settings remain unchanged until approval.`},'shop-update-'+row.id+'-'+(row.revision+1));}catch{notificationAccepted=false;}
   return json({status:'pending_review',revision:row.revision+1,notificationAccepted,message:notificationAccepted?'Changes saved for review. Your current live settings remain unchanged.':'Changes saved for review, but the notification email could not be confirmed. Contact MYMERCHNOW; your current live settings remain unchanged.'});
  }
  if(body.action!=='submit')throw new Error('Choose a valid setup action.');
  if(body.website||!Number.isFinite(body.startedAt)||Date.now()-body.startedAt<2000||Date.now()-body.startedAt>86400000)throw new Error('Refresh and complete your setup form.');
  if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw new Error('Submission identifier is invalid.');
  const packet=validateSetup(body.setup);if(packet.shop.organizationType==='team')packet.shop=canonicalTeamShop(packet.shop);const teamPacket=packet.shop.organizationType==='team',digest=await hash(JSON.stringify(packet));
  const rawToken=hex(crypto.getRandomValues(new Uint8Array(32)).buffer),ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
  const {data:rows,error}=await db.rpc('mqd_claim_print_shop_business',{p_row:{id:body.requestId,preferred_slug:packet.shop.slug,plan:packet.plan,owner_email:packet.owner.requestEmail,owner_phone:packet.owner.phone,shop_config:packet.shop,payload_hash:digest,mail_origin:site,ip_hash:await hash((Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'')+ip),token_hash:await hash(rawToken),token_cipher:await encrypt(rawToken)}});
  if(error)return json({error:error.message.includes('limit')?'Too many setup submissions. Try again later.':'Setup could not be saved. Retry the same submission.'},error.message.includes('limit')?429:409);
  const row=rows?.[0];if(!row)throw new Error('Setup could not be saved.');
  const token=await decrypt(row.token_cipher),reference='SETUP-'+row.id.replaceAll('-','').slice(0,12).toUpperCase(),manageLink=row.mail_origin+'/print-shop-setup.html?setupId='+row.id+'#manage='+token;
  if(!row.owner_email_sent){await mail(db,{to:[row.owner_email],subject:'Confirm your MYMERCHNOW print-shop setup',text:`${row.shop_config.name}, we received your setup (${reference}).\n\nConfirm your email and review or update your setup using this private link:\n${manageLink}\n\nDo not share this link; it expires in 30 days. No payment was collected and your shop is not active yet. MYMERCHNOW reviews your garments, branding and print limits before activation. Teams use MYMERCHNOW prices and checkout; print shops and brands collect customer payments directly.\nPlan requested: ${row.shop_config.organizationType==='team'?'Team link — $20/month; 30 qualifying paid garments earn the next month free':row.plan==='2d'?'2D — $49/month':'2D + 3D — $99/month'} after billing is enabled.\n${row.mail_origin.includes('127.0.0.1')||row.mail_origin.includes('localhost')?'This is a local pilot. The link works only on the computer running the preview.':''}`},'shop-setup-owner-'+row.id);await db.from(TABLE).update({owner_email_sent:true}).eq('id',row.id);}
  if(!row.admin_email_sent){await mail(db,{to:['mqdrva@gmail.com'],reply_to:row.owner_email,subject:'[Print Shops] New business setup: '+row.shop_config.name,text:`${reference}\nBusiness: ${row.shop_config.name}\nEmail: ${row.owner_email}\nPhone: ${row.owner_phone}\nPreferred link: ${row.preferred_slug}\nPlan: ${row.plan}\n\nReview: ${row.mail_origin}/print-shop-admin.html\nNo payment collected. No shop activated. The setup is securely stored in the separate print-shop service.`,attachments:[{filename:row.preferred_slug+'-setup.json',content:encode(new TextEncoder().encode(JSON.stringify(packetFor(row),null,2)))}]},'shop-setup-admin-'+row.id);await db.from(TABLE).update({admin_email_sent:true}).eq('id',row.id);}
  return json({reference,status:'pending_review',confirmationAccepted:true,message:'Setup saved for review. Check your business email to confirm it and access your private setup link. No payment was collected.'});
 }catch(error){return json({error:error instanceof Error?error.message:'Setup could not be processed.'},400);}
});
