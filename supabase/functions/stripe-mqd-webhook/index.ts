import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json"}});
const enc=new TextEncoder();
function serviceKey(){const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}}
function timingSafeEqual(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function hmacHex(secret,message){const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,enc.encode(message));return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function verifyStripeSignature(payload,header,secret){const parts=header.split(',').map(x=>x.trim()),t=parts.find(x=>x.startsWith('t='))?.slice(2)||'',candidates=parts.filter(x=>x.startsWith('v1=')).map(x=>x.slice(3));if(!t||!candidates.length)return false;const ts=Number(t);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return false;const expected=await hmacHex(secret,`${t}.${payload}`);return candidates.some(x=>timingSafeEqual(x,expected));}

function orderNumbersFor(session){
 const metadata=String(session?.metadata?.order_numbers||'').split(',').map(x=>x.trim()).filter(x=>/^MQD-[A-Z0-9]{6,20}$/.test(x));
 if(metadata.length)return[...new Set(metadata)];
 const legacy=String(session?.client_reference_id||'').trim();
 return /^MQD-[A-Z0-9]{6,20}$/.test(legacy)?[legacy]:[];
}

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok');
 if(req.method==='GET')return json({ok:true,service:'stripe-mqd-webhook',version:4});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json({error:'Backend service credentials are not configured'},500);
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:secret,error:secretError}=await supabase.rpc('mqd_get_vault_secret',{secret_name:'mqd_stripe_webhook_signing_secret'});
  if(secretError||!secret)return json({error:'Stripe webhook is not configured'},500);
  const payload=await req.text(),signature=req.headers.get('stripe-signature')||'';
  const valid=await verifyStripeSignature(payload,signature,String(secret));
  if(!valid)return json({error:'Invalid Stripe signature'},400);
  const event=JSON.parse(payload),session=event?.data?.object||{};
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type))return json({received:true,ignored:true});
  const orderNumbers=orderNumbersFor(session);
  if(!orderNumbers.length)return json({error:'Checkout session has no valid order references'},400);
  const {data:orders,error:ordersError}=await supabase.from('mqd_orders').select('id,order_number,design_id').in('order_number',orderNumbers);
  if(ordersError)throw ordersError;
  if(!orders||orders.length!==orderNumbers.length)return json({error:'One or more checkout orders were not found'},404);
  const {data:items,error:itemsError}=await supabase.from('mqd_order_items').select('order_id,unit_price,quantity').in('order_id',orders.map(x=>x.id));
  if(itemsError)throw itemsError;
  const itemByOrder=new Map((items||[]).map(x=>[x.order_id,x]));
  const shipping=session.shipping_details||session.collected_information?.shipping_details||null;
  const paid=event.type==='checkout.session.async_payment_succeeded'||(event.type==='checkout.session.completed'&&session.payment_status==='paid');
  const failed=event.type==='checkout.session.async_payment_failed';
  for(const order of orders){
   const item=itemByOrder.get(order.id);
   const subtotal=Number(item?.unit_price||0)*Math.max(1,Number(item?.quantity)||1);
   const update={
    stripe_checkout_session_id:String(session.id||''),stripe_payment_intent_id:String(session.payment_intent||''),stripe_payment_status:failed?'failed':String(session.payment_status||'unpaid'),
    stripe_customer_id:String(session.customer||''),customer_email:session.customer_details?.email||null,customer_name:session.customer_details?.name||shipping?.name||null,
    customer_phone:session.customer_details?.phone||null,shipping_name:shipping?.name||null,shipping_address:shipping?.address||null,currency:String(session.currency||'usd').toUpperCase(),updated_at:new Date().toISOString()
   };
   if(orderNumbers.length===1&&Number.isFinite(Number(session.amount_total)))update.amount_paid=Number(session.amount_total)/100;
   else if(subtotal>0)update.amount_paid=subtotal;
   if(paid){update.status='paid';update.stripe_payment_status='paid';update.paid_at=new Date().toISOString();}
   const {error:updateError}=await supabase.from('mqd_orders').update(update).eq('id',order.id);if(updateError)throw updateError;
   if(paid&&order.design_id){const {error:designError}=await supabase.from('customer_designs').update({status:'purchased',updated_at:new Date().toISOString()}).eq('id',order.design_id);if(designError)throw designError;}
  }
  return json({received:true,orderNumbers,status:paid?'paid':failed?'failed':String(session.payment_status||'unpaid')});
 }catch(error){console.error('stripe-mqd-webhook failed',error instanceof Error?error.message:String(error));return json({error:error instanceof Error?error.message:'Webhook failed'},500);}
});
