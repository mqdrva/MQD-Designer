import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const enc=new TextEncoder();
function serviceKey(){const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}}
function timingSafeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function hmacHex(secret:string,message:string){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,enc.encode(message));return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function verifyStripeSignature(payload:string,header:string,secret:string){const parts=header.split(',').map(x=>x.trim()),t=parts.find(x=>x.startsWith('t='))?.slice(2)||'',candidates=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));if(!t||!candidates.length)return false;const ts=Number(t);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;const expected=await hmacHex(secret,`${t}.${payload}`);return candidates.some(v=>timingSafeEqual(v,expected));}

Deno.serve(async(req:Request)=>{
 if(req.method==='GET')return json({ok:true,service:'stripe-mqd-webhook',version:3});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json({error:'Backend not configured'},500);
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:secret,error:secretErr}=await supabase.rpc('mqd_get_vault_secret',{secret_name:'mqd_stripe_webhook_signing_secret'});
  if(secretErr||!secret)return json({error:'Webhook signing secret not configured'},503);
  const raw=await req.text(),sig=req.headers.get('stripe-signature')||'';if(!await verifyStripeSignature(raw,sig,String(secret)))return json({error:'Invalid Stripe signature'},400);
  const event=JSON.parse(raw),session=event?.data?.object||{},ref=String(session.client_reference_id||'').trim();if(!ref)return json({received:true,ignored:'missing_client_reference_id'});
  const shipping=session.collected_information?.shipping_details||session.shipping_details||null;
  const common:any={stripe_checkout_session_id:String(session.id||''),stripe_payment_intent_id:typeof session.payment_intent==='string'?session.payment_intent:(session.payment_intent?.id||null),stripe_customer_id:typeof session.customer==='string'?session.customer:(session.customer?.id||null),stripe_payment_status:String(session.payment_status||''),customer_email:session.customer_details?.email||session.customer_email||null,customer_name:session.customer_details?.name||shipping?.name||null,customer_phone:session.customer_details?.phone||null,shipping_name:shipping?.name||null,shipping_address:shipping?.address||null,currency:session.currency?String(session.currency).toUpperCase():null,updated_at:new Date().toISOString()};
  if(Number.isFinite(Number(session.amount_total)))common.amount_paid=Number(session.amount_total)/100;
  if(event.type==='checkout.session.completed'||event.type==='checkout.session.async_payment_succeeded'){if(session.payment_status==='paid'||event.type==='checkout.session.async_payment_succeeded'){common.status='paid';common.stripe_payment_status='paid';common.paid_at=new Date().toISOString();}}
  else if(event.type==='checkout.session.async_payment_failed')common.stripe_payment_status='failed';else return json({received:true,ignored:event.type});
  const {data,error}=await supabase.from('mqd_orders').update(common).eq('order_number',ref).select('id,order_number,status,design_id').maybeSingle();
  if(error)return json({error:error.message,stage:'order_update'},500);if(!data)return json({received:true,ignored:'order_not_found',reference:ref});
  if(data.status==='paid'&&data.design_id){const {error:designError}=await supabase.from('customer_designs').update({status:'purchased',updated_at:new Date().toISOString()}).eq('id',data.design_id);if(designError)return json({error:designError.message,stage:'design_update'},500);}
  return json({received:true,orderNumber:data.order_number,status:data.status});
 }catch(e){console.error(e);return json({error:e instanceof Error?e.message:String(e)},500);}
});
