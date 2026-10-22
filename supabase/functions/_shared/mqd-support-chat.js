import {consumeBudget} from './mqd-upload-guard.js';
import {hasAdminMfa} from './mqd-admin-security.js';
export const SUPPORT_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ORIGINS=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqdllc.com','https://www.mqdllc.com']);
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
export async function supportHash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
export function validateSupport(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||body.website)throw fail('Invalid request.');
 if(!['create','send','read','seen','list','retry'].includes(body.action))throw fail('Invalid action.');
 if(body.action!=='list'&&!UUID.test(body.id||''))throw fail('Conversation unavailable.',404);
 if(['create','send'].includes(body.action)){
  if(!UUID.test(body.requestId||'')||typeof body.message!=='string'||!body.message.trim()||body.message.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(body.message))throw fail('Enter a message of 1–2000 characters.');
 }
 if(body.action==='seen'&&(!Number.isSafeInteger(body.seq)||body.seq<0))throw fail('Invalid read marker.');
 return body;
}
async function boundedJson(req){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw fail('Invalid request format.');
 const reader=req.body?.getReader();if(!reader)throw fail('Missing request.');
 const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();throw fail('Request too large.',413);}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
async function checked(query){const {data,error}=await query;if(error)throw fail('Chat service is temporarily unavailable. Please try again.',503);return data;}
async function secret(db,name){const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');}
export async function deliverSupportNotification(db,id,{env,fetcher=fetch}){
 const rows=await checked(db.rpc('mqd_support_claim',{p_id:id}));const row=rows?.[0];if(!row)return;
 const key=env('MQD_RESEND_API_KEY')||await secret(db,'mqd_resend_api_key');
 const from=env('MQD_EMAIL_FROM')||await secret(db,'mqd_email_from')||'Morales Quality Designs <notifications@mymerchnow.app>';
 const link='https://mymerchnow.app/owner/?chat='+id;
 let update;
 try{
  if(!key)throw Error('not configured');
  const res=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'mqd-support/'+row.message_seq},signal:AbortSignal.timeout(12000),body:JSON.stringify({from,to:['mqdrva@gmail.com'],subject:'New MQD support message',text:'A customer sent MQD a support message. Sign in to your secure owner portal to read and reply:\n\n'+link+'\n\nReplies must be sent in the portal. This mailbox does not add replies to the chat.'})});
  if(!res.ok){const error=Error('provider failure');error.permanent=res.status<500&&res.status!==429;throw error;}
  const result=await res.json();if(!result.id)throw Error('unknown outcome');
  update={status:'sent',provider_id:result.id,last_error:null,lease_until:null};
 }catch(error){update={status:error.permanent?'review':'pending',last_error:error.permanent?'Provider configuration needs review.':'Notification not confirmed; retry scheduled.',lease_until:null,next_attempt_at:new Date(Date.now()+Math.min(3600000,30000*2**row.attempts)).toISOString()};}
 // A failed status write leaves the lease in place; retry uses the same provider key.
 await checked(db.from('mqd_support_notifications').update(update).eq('message_seq',row.message_seq));
}
export function createSupportHandler({createDb,env,fetcher=fetch}){
 return async req=>{
  const origin=req.headers.get('origin')||'';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'content-type,apikey,authorization,x-mqd-chat-token','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return json({error:'Method not allowed.'},405);
  if(!ORIGINS.has(origin))return json({error:'Unsupported origin.'},403);
  if(req.headers.get('apikey')!==SUPPORT_KEY)return json({error:'Invalid project key.'},401);
  try{
   const body=validateSupport(await boundedJson(req)),db=createDb();
   const jwt=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');let owner=false;
   if(jwt){const {data,error}=await db.auth.getUser(jwt);if(error||data?.user?.app_metadata?.role!=='admin')throw fail('Owner access required.',403);if(!await hasAdminMfa(db,jwt))throw fail('Authenticator verification required.',403);owner=true;}
   if(['list','retry'].includes(body.action)&&!owner)throw fail('Owner access required.',403);
   if(owner&&body.action==='create')throw fail('Use the customer chat to start a conversation.');
   const token=req.headers.get('x-mqd-chat-token')||'';
   if(!owner&&!/^[a-f0-9]{64}$/.test(token))throw fail('Conversation unavailable.',404);
   const hash=owner?'':await supportHash(token);
   const ip=await supportHash(req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown');
   await consumeBudget(db,'support:requests:'+ip,12000);
   let conversation;
   if(body.action!=='list'){
    conversation=await checked(db.from('mqd_support_conversations').select('*').eq('id',body.id).maybeSingle());
    if(conversation&&(!owner&&conversation.token_hash!==hash||Date.parse(conversation.expires_at)<=Date.now()))throw fail('Conversation unavailable.',404);
    if(!conversation&&body.action!=='create')throw fail('Conversation unavailable.',404);
   }
   if(body.action==='list'){
    const page=Number.isSafeInteger(body.page)&&body.page>=0?Math.min(body.page,1000):0;
    const conversations=await checked(db.from('mqd_support_conversations').select('id,created_at,updated_at,expires_at,owner_seen').order('updated_at',{ascending:false}).order('id').range(page*30,page*30+29));
    for(const c of conversations){const unread=await checked(db.from('mqd_support_messages').select('seq').eq('conversation_id',c.id).eq('sender','customer').gt('seq',c.owner_seen).limit(501));c.unread=unread.length;}
    return json({conversations});
   }
   if(['create','send'].includes(body.action)){
    if(!owner){await consumeBudget(db,'support:send:'+ip,120);await consumeBudget(db,'support:conversation:'+body.id,100);await consumeBudget(db,'support:global',500);if(!conversation)await consumeBudget(db,'support:create:'+ip,5);}
    const {data,error}=await db.rpc('mqd_support_send',{p_id:body.id,p_hash:hash,p_request:body.requestId,p_body:body.message.trim(),p_owner:owner,p_create:body.action==='create'});
    if(error){if(/conflict/.test(error.message))throw fail('This message identifier was already used. Refresh the chat.',409);if(/unavailable/.test(error.message))throw fail('Conversation unavailable.',404);throw fail('Message could not be saved. Please try again.',503);}
    if(!owner)await deliverSupportNotification(db,body.id,{env,fetcher}).catch(()=>{});
    const notices=owner?[]:await checked(db.from('mqd_support_notifications').select('status').eq('message_seq',data.seq));
    return json({saved:true,message:data,notification:owner?null:notices?.[0]?.status||'pending'});
   }
   if(body.action==='seen'){await checked(db.rpc('mqd_support_seen',{p_id:body.id,p_seq:body.seq,p_owner:owner}));return json({ok:true});}
   if(body.action==='retry'){await deliverSupportNotification(db,body.id,{env,fetcher});return json({ok:true});}
   const messages=await checked(db.from('mqd_support_messages').select('seq,request_id,sender,body,created_at').eq('conversation_id',body.id).order('seq').limit(500));
   await deliverSupportNotification(db,body.id,{env,fetcher}).catch(()=>{});
   const notices=await checked(db.from('mqd_support_notifications').select(owner?'status,message_seq,last_error':'status').eq('conversation_id',body.id).neq('status','sent').limit(500));
   return json({messages,unread:messages.filter(m=>m.sender===(owner?'customer':'owner')&&m.seq>(owner?conversation.owner_seen:conversation.customer_seen)).length,notifications:owner?notices:undefined,notificationPending:notices.length>0,expiresAt:conversation.expires_at});
  }catch(error){return json({error:error.status?error.message:'Please check your request and try again.'},error.status||400);}
 };
}
