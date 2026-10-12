import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.6.0';
import {ACCOUNT_TABLE,EVENT_TYPES,configuration,objectId,synchronize} from './billing.js';
async function limitedBody(req:Request,max:number){const reader=req.body?.getReader();if(!reader)throw new Error('Body missing');let count=0;const chunks:Uint8Array[]=[];while(true){const part=await reader.read();if(part.done)break;count+=part.value.length;if(count>max){await reader.cancel();throw new Error('Body too large');}chunks.push(part.value);}const bytes=new Uint8Array(count);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}return new TextDecoder().decode(bytes);}
Deno.serve(async(req:Request)=>{
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return json({error:'Webhook POST required.'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),config=await configuration(db);
 if(!config.enabled)return json({error:'Dedicated sandbox billing is not configured.'},503);
 const stripe=new Stripe(config.key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
 let event:any;try{const text=await limitedBody(req,512000);event=await stripe.webhooks.constructEventAsync(text,req.headers.get('stripe-signature')||'',config.webhook,300,Stripe.createSubtleCryptoProvider());}catch{return json({error:'Invalid webhook signature.'},400);}
 if(event.livemode!==false)return json({error:'Live events are rejected by this sandbox endpoint.'},400);
 if(!EVENT_TYPES.has(event.type))return json({received:true,ignored:true});
 let lease:string|undefined,businessId:string|undefined;
 try{
  const {data:prior,error:priorError}=await db.from('mqd_print_shop_billing_events').select('status').eq('event_id',event.id).maybeSingle();if(priorError)throw priorError;if(['processed','ignored'].includes(prior?.status))return json({received:true,duplicate:true});
  const inserted=await db.from('mqd_print_shop_billing_events').upsert({event_id:event.id,event_type:event.type},{onConflict:'event_id',ignoreDuplicates:true});if(inserted.error)throw inserted.error;
  const ignore=async()=>{const result=await db.from('mqd_print_shop_billing_events').update({status:'ignored',processed_at:new Date().toISOString()}).eq('event_id',event.id);if(result.error)throw result.error;return json({received:true,ignored:true});};
  const object=event.data.object,customer=objectId(object.customer);if(!customer)return await ignore();
  const {data:account,error}=await db.from(ACCOUNT_TABLE).select('*').eq('stripe_customer_id',customer).maybeSingle();if(error)throw error;
  if(!account)return await ignore();
  const {data:shop,error:shopError}=await db.from('mqd_print_shop_businesses').select('plan').eq('id',account.business_id).single();if(shopError)throw shopError;
  lease=crypto.randomUUID();businessId=account.business_id;const claim=await db.rpc('mqd_claim_print_shop_billing',{p_business:businessId,p_lease:lease});if(claim.error)throw claim.error;
  let subscriptionId=event.type.startsWith('customer.subscription.')?object.id:event.type.startsWith('invoice.')?objectId(object.parent?.subscription_details?.subscription):objectId(object.subscription);
  if(event.type.startsWith('checkout.session.')){if(object.id!==account.stripe_checkout_id)return await ignore();const checkout=await stripe.checkout.sessions.retrieve(object.id);if(checkout.livemode!==false||objectId(checkout.customer)!==customer)throw new Error('Checkout ownership mismatch');subscriptionId=objectId(checkout.subscription);}
  if(subscriptionId){if(account.stripe_subscription_id&&account.stripe_subscription_id!==subscriptionId)return await ignore();if(!account.stripe_subscription_id&&!event.type.startsWith('checkout.session.')){if(!account.stripe_checkout_id)return await ignore();const current=await stripe.checkout.sessions.retrieve(account.stripe_checkout_id);if(!current.subscription)throw new Error('Checkout is not ready');if(objectId(current.subscription)!==subscriptionId)return await ignore();}await synchronize(stripe,db,claim.data[0],shop.plan,subscriptionId);}
  const update=await db.from('mqd_print_shop_billing_events').update({status:'processed',processed_at:new Date().toISOString()}).eq('event_id',event.id);if(update.error)throw update.error;
  return json({received:true});
 }catch{return json({error:'Billing event needs a retry.'},500);}
 finally{if(lease&&businessId)await db.from(ACCOUNT_TABLE).update({lease_id:null,lease_until:null}).eq('business_id',businessId).eq('lease_id',lease);}
});
