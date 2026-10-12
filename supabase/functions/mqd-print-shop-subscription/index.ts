import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.6.0';
import {POLICY_VERSION,ACCOUNT_TABLE,configuration,save,synchronize} from './billing.js';
const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ALLOWED=new Set(['https://mymerchnow.app','https://mqd-designer-vercel-git-codex-print-shop-launch-preview-mqd1.vercel.app']);
const sha=async(value:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
async function limitedBody(req:Request,max:number){const reader=req.body?.getReader();if(!reader)throw new Error('Body missing');let count=0;const chunks:Uint8Array[]=[];while(true){const part=await reader.read();if(part.done)break;count+=part.value.length;if(count>max){await reader.cancel();throw new Error('Body too large');}chunks.push(part.value);}const bytes=new Uint8Array(count);let i=0;for(const c of chunks){bytes.set(c,i);i+=c.length;}return new TextDecoder().decode(bytes);}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors=ALLOWED.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'}:{Vary:'Origin'};
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!ALLOWED.has(origin))return json({error:'This subscription origin is unavailable.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST'||req.headers.get('apikey')!==KEY)return json({error:'Use your private business setup link.'},401);
 let db:any,lease:string|undefined,businessId:string|undefined;
 try{
  const text=await limitedBody(req,3000);const body=JSON.parse(text);
  if(!['status','checkout','portal'].includes(body.action)||typeof body.id!=='string'||!/^[a-f0-9-]{36}$/.test(body.id)||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return json({error:'Private business access required.'},401);
  db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:shop,error}=await db.from('mqd_print_shop_businesses').select('*').eq('id',body.id).eq('token_hash',await sha(body.token)).single();
  if(error||!shop||!Number.isFinite(Date.parse(shop.token_expires_at))||Date.parse(shop.token_expires_at)<=Date.now()||!shop.email_verified_at)return json({error:'This private link is invalid, unconfirmed or expired.'},401);
  const config=await configuration(db),{data:account}=await db.from(ACCOUNT_TABLE).select('*').eq('business_id',shop.id).maybeSingle();
  if(body.action==='status')return json({mode:'live',enabled:config.enabled,approved:!!shop.approved_at&&['pilot_active','active'].includes(shop.status),status:account?.status||'not_started',cancelAtPeriodEnd:account?.cancel_at_period_end||false,periodEnd:account?.period_end||null,hasCustomer:config.ready&&!!account?.stripe_customer_id,plan:shop.plan,policyVersion:POLICY_VERSION,message:config.enabled?'Monthly designer subscription. Cancel anytime; access continues through the paid month.':'Paid subscriptions are not open yet. Your unpaid pilot does not convert automatically.'});
  if(!config.ready||body.action==='checkout'&&!config.enabled)return json({error:'Paid subscriptions are not open yet.'},503);
  if(body.action==='checkout'&&(!shop.approved_at||!['pilot_active','active'].includes(shop.status)||shop.pending_config))return json({error:'Your business setup and any changes must be approved before subscribing.'},409);
  if(body.action==='checkout'&&body.policyVersion!==POLICY_VERSION)return json({error:'Review and accept the current subscription terms before continuing.'},409);
  const stripe=new Stripe(config.key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
  lease=crypto.randomUUID();businessId=shop.id;const claim=await db.rpc('mqd_claim_print_shop_subscription',{p_business:shop.id,p_lease:lease});if(claim.error)return json({error:'Billing is already opening. Try again shortly.'},409);
  let record=claim.data[0];const base=ALLOWED.has(origin)?origin:'https://mymerchnow.app',returnUrl=base+'/print-shop-setup.html?setupId='+shop.id;
  if(body.action==='portal'){
   if(!record.stripe_customer_id)throw new Error('Start a subscription before opening billing management.');
   const session=await stripe.billingPortal.sessions.create({customer:record.stripe_customer_id,configuration:config.portal,return_url:returnUrl});return json({mode:'live',url:session.url});
  }
  const price=await stripe.prices.retrieve(config.prices[shop.plan]);
  if(price.livemode!==true||!price.active||price.currency!=='usd'||price.unit_amount!==(shop.plan==='2d'?4900:9900)||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1)throw new Error('The approved subscription price is unavailable.');
  if(!record.stripe_customer_id){const customer=await stripe.customers.create({email:shop.owner_email,name:shop.shop_config.name,description:'MYMERCHNOW print-shop subscription'},{idempotencyKey:'mqd-print-shop-live-customer-'+shop.id});if(customer.livemode!==true)throw new Error('Live subscription customer required.');record=await save(db,ACCOUNT_TABLE,{stripe_customer_id:customer.id},{business_id:shop.id,lease_id:lease});}
  const subscriptions=await stripe.subscriptions.list({customer:record.stripe_customer_id,status:'all',limit:100});
  const existing=subscriptions.data.find(s=>!['canceled','incomplete_expired'].includes(s.status));if(existing){await synchronize(stripe,db,record,shop.plan,existing.id);return json({error:'A subscription already exists. Use Manage billing instead.'},409);}
  if(record.stripe_checkout_id){const prior=await stripe.checkout.sessions.retrieve(record.stripe_checkout_id);if(prior.status==='open')return json({mode:'live',url:prior.url});if(prior.status==='complete'&&!['canceled','incomplete_expired'].includes(record.status))return json({error:'Payment is being confirmed. Refresh billing status shortly.'},409);}
  if(record.stripe_subscription_id)record=await save(db,ACCOUNT_TABLE,{stripe_subscription_id:null},{business_id:shop.id,lease_id:lease});
  const session=await stripe.checkout.sessions.create({mode:'subscription',customer:record.stripe_customer_id,line_items:[{price:price.id,quantity:1}],subscription_data:{billing_mode:{type:'flexible'}},success_url:returnUrl+'&billing=success',cancel_url:returnUrl+'&billing=canceled',expires_at:Math.floor(Date.now()/1000)+1800,custom_text:{submit:{message:'Renews monthly until canceled. Cancel anytime; access ends after the paid month. Refund requests are reviewed individually. Terms: https://mymerchnow.app/print-shop-subscription-terms.html'}},integration_identifier:'mqd-print-shops-live-abcdefgh'},{idempotencyKey:'mqd-print-shop-live-checkout-'+shop.id+'-'+(record.stripe_checkout_id||'first')});
  if(session.livemode!==true||!session.url)throw new Error('Live subscription checkout required.');await save(db,ACCOUNT_TABLE,{stripe_checkout_id:session.id,status:'checkout_pending',policy_version:POLICY_VERSION,policy_accepted_at:new Date().toISOString()},{business_id:shop.id,lease_id:lease});return json({mode:'live',url:session.url});
 }catch{return json({error:'Subscription billing could not complete. Contact MYMERCHNOW for help.'},502);}
 finally{if(db&&lease&&businessId)await db.from(ACCOUNT_TABLE).update({lease_id:null,lease_until:null}).eq('business_id',businessId).eq('lease_id',lease);}
});
