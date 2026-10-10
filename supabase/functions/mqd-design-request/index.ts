import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {validateDesignRequest} from '../../../v20/design-request-contract.js';
import {consumeBudget} from '../_shared/mqd-upload-guard.js';

const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const origins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqdllc.com','https://www.mqdllc.com']);
function headers(req){return {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(req.headers.get('origin'))?req.headers.get('origin'):'https://mymerchnow.app','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};}
function json(req,value,status=200){return new Response(JSON.stringify(value),{status,headers:headers(req)});}
async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function secret(db,name){const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');}
export async function handler(req){
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)});
 if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
 // Public intake only: validate the project API key; never grant database access.
 if(req.headers.get('apikey')!==KEY)return json(req,{error:'Invalid project key'},401);
 if(!origins.has(req.headers.get('origin')||''))return json(req,{error:'Unsupported origin'},403);
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))return json(req,{error:'Invalid request format'},400);
  const reader=req.body?.getReader();if(!reader)return json(req,{error:'Missing request'},400);
  const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();return json(req,{error:'Request too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const body=JSON.parse(new TextDecoder().decode(bytes));
  if(body.website)return json(req,{error:'Please contact MQD directly.'},400);
  const data=validateDesignRequest(body);
  const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
  const db=createClient(Deno.env.get('SUPABASE_URL'),service,{auth:{persistSession:false}});
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
  await consumeBudget(db,'design-request:ip:'+await hash(ip),15);
  await consumeBudget(db,'design-request:email:'+await hash(data.email),5);
  await consumeBudget(db,'design-request:global',200);
  const digest=await hash(JSON.stringify(data));
  const {error:insert}=await db.from('mqd_design_requests').upsert({id:data.requestId,payload:data,payload_hash:digest},{onConflict:'id',ignoreDuplicates:true});
  if(insert)throw new Error('Request could not be saved');
  const {data:row,error:read}=await db.from('mqd_design_requests').select('payload_hash,email_status').eq('id',data.requestId).single();
  if(read||row.payload_hash!==digest)return json(req,{error:'Please reopen the form and try again.'},409);
  if(row.email_status==='sent')return json(req,{received:true,reference:data.requestId});
  const apiKey=Deno.env.get('MQD_RESEND_API_KEY')||await secret(db,'mqd_resend_api_key');
  const from=Deno.env.get('MQD_EMAIL_FROM')||await secret(db,'mqd_email_from')||'Morales Quality Designs <notifications@mymerchnow.app>';
  if(!apiKey)return json(req,{error:'Email sending is temporarily unavailable. Please email mqdrva@gmail.com. Your request details remain in this form.'},503);
  const text=`New MQD design request\nReference: ${data.requestId}\nName: ${data.name}\nEmail: ${data.email}\nGarment: ${data.garment}\nQuantity: ${data.quantity}\nPage: ${data.page}\n\nDesign brief:\n${data.brief}\n\nCustomer submission; no order or payment has been placed.`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','Idempotency-Key':'mqd-design-request/'+data.requestId},body:JSON.stringify({from,to:['mqdrva@gmail.com'],reply_to:data.email,subject:'New MQD design request',text}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)return json(req,{error:'We could not send the email. Please try again or email mqdrva@gmail.com.'},502);
  const sent=await response.json();
  await db.from('mqd_design_requests').update({email_status:'sent',provider_id:sent.id}).eq('id',data.requestId);
  return json(req,{received:true,reference:data.requestId});
 }catch(error){return json(req,{error:error.status===429?'Too many requests. Please try later.':error.status===503?'Request service is temporarily unavailable. Please email mqdrva@gmail.com.':error.message==='Request could not be saved'?'Could not save your request. Please try again.':'Please check your details and try again.'},error.status||400);}
}
Deno.serve(handler);
