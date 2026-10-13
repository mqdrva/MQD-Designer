import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.6.0';
import {hasAdminMfa} from './admin-security.js';
import {configuration,synchronize,ACCOUNT_TABLE} from './billing.js';
import {ADMIN_ACTIONS,discountSpec,ownedSubscription,localChange} from './policy.js';
const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ALLOWED=new Set(['https://mymerchnow.app','http://127.0.0.1:8765','http://127.0.0.1:8776']);
const TABLE='mqd_print_shop_businesses',AUDIT='mqd_print_shop_admin_actions';
const hash=async(s:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function bodyFor(req:Request){const reader=req.body?.getReader();if(!reader)throw new Error('Body required');let text='',count=0;const decoder=new TextDecoder();while(true){const p=await reader.read();if(p.done)break;count+=p.value.length;if(count>5000){await reader.cancel();throw new Error('Request too large');}text+=decoder.decode(p.value,{stream:true});}return JSON.parse(text+decoder.decode());}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors=ALLOWED.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'}:{Vary:'Origin'};
 const json=(value:any,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!ALLOWED.has(origin))return json({error:'Unavailable origin.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST'||req.headers.get('apikey')!==KEY)return json({error:'Administrator access required.'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const jwt=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
 const {data:user,error:authError}=await db.auth.getUser(jwt);
 if(authError||user.user?.app_metadata?.role!=='admin'||!await hasAdminMfa(db,jwt))return json({error:'Administrator sign-in and verification required.'},403);
 let lease:string|undefined,id:string|undefined,requestId:string|undefined;
 try{
  const body=await bodyFor(req),config=await configuration(db);
  const {data:adminSecret}=await db.rpc('mqd_get_vault_secret',{secret_name:'mqd_print_shop_stripe_admin_key'});const adminKey=typeof adminSecret==='string'&&adminSecret.startsWith('rk_live_')?adminSecret:'';
  if(body.action==='list'){
   if(!Number.isInteger(body.page??0)||(body.page??0)<0||typeof(body.search??'')!=='string'||(body.search??'').length>100||!['all','needs_review','pilot','paid','overdue','paused','expired','closed'].includes(body.status??'all'))return json({error:'Invalid list filter.'},400);
   const {data,error}=await db.rpc('mqd_list_print_shop_admin',{p_page:body.page??0,p_search:body.search??'',p_status:body.status??'all'});if(error)throw new Error('Business list unavailable');const teams=await db.from(TABLE).select('id').eq('shop_config->>organizationType','team');if(teams.error)throw new Error('Business types unavailable');const teamIds=new Set((teams.data||[]).map((r:any)=>r.id));return json({...data,businesses:data.businesses.map((r:any)=>({...r,teamService:teamIds.has(r.id)})),billingActionsReady:!!adminKey,discountActionsReady:!!adminKey});
  }
  if(body.action==='history'){
   const {data,error}=await db.from(AUDIT).select('action,status,details,created_at').eq('business_id',body.id).order('created_at',{ascending:false}).limit(20);if(error)throw new Error('History unavailable');return json({history:data});
  }
  if(!ADMIN_ACTIONS.has(body.action)||!/^[-a-f0-9]{36}$/.test(body.id||'')||!/^[-a-f0-9]{36}$/.test(body.requestId||'')||!Number.isInteger(body.revision))return json({error:'Invalid business action.'},400);
  id=body.id;requestId=body.requestId;
  let {data:shop,error}=await db.from(TABLE).select('*').eq('id',id).single();if(error||!shop)return json({error:'Business not found.'},404);
  if(shop.shop_config?.organizationType==='team')return json({error:'Use Team management for this account.'},409);
  if(body.confirm!==shop.preferred_slug)return json({error:'Confirm the selected business before applying changes.'},400);
  const payloadHash=await hash(JSON.stringify({action:body.action,id:body.id,revision:body.revision,days:body.days,plan:body.plan,discount:body.discount,replaceExisting:body.replaceExisting}));
  const prior=await db.from(AUDIT).select('*').eq('request_id',requestId).maybeSingle();if(prior.error)throw new Error('Audit unavailable');
  if(prior.data){if(prior.data.business_id!==id||prior.data.actor_id!==user.user.id||prior.data.payload_hash!==payloadHash)return json({error:'Action identifier already used.'},409);if(prior.data.status==='processed')return json(prior.data.result);}
  if(!prior.data&&body.revision!==shop.revision)return json({error:'Business changed. Refresh before applying changes.'},409);
  lease=crypto.randomUUID();const claim=await db.rpc('mqd_claim_print_shop_subscription',{p_business:id,p_lease:lease});if(claim.error)return json({error:'Another billing action is running. Retry shortly.'},409);let account=claim.data[0];
  const refreshed=await db.from(TABLE).select('*').eq('id',id).single();if(refreshed.error||!refreshed.data)throw new Error('Business unavailable');shop=refreshed.data;
  if(!prior.data&&body.revision!==shop.revision)return json({error:'Business changed. Refresh before applying changes.'},409);
  const insert=await db.from(AUDIT).upsert({request_id:requestId,business_id:id,actor_id:user.user.id,action:body.action,payload_hash:payloadHash,details:{days:body.days??null,plan:body.plan??null,discount:body.discount??null}},{onConflict:'request_id',ignoreDuplicates:true});if(insert.error)throw new Error('Audit could not be saved');
  let message='Business updated.',update:any={};
  const financial=['cancel-renewal','discount','remove-discount','refresh-billing'].includes(body.action)||body.action==='terminate'&&!!(account.stripe_subscription_id||account.stripe_checkout_id);
  if(financial&&!adminKey)return json({error:'Stripe management connection needs approval. Shop access and billing were not changed.'},503);
  const stripe=financial?new Stripe(adminKey,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2}):null;
  let sub:any=null;if(financial&&account.stripe_subscription_id)sub=ownedSubscription(await stripe!.subscriptions.retrieve(account.stripe_subscription_id,{expand:['latest_invoice']}),account,shop,config.prices);
  if(['pause','resume','extend-trial','trial-plan'].includes(body.action)){
   update=localChange(body.action,shop,account,body);
   if(body.action==='trial-plan'){const c=structuredClone(shop.shop_config);c.engines=body.plan==='3d'?['2d','3d']:['2d'];c.printMethods3d=body.plan==='3d'?{...c.printMethods}:{};update.shop_config=c;}
   message=body.action==='pause'?'Shop link paused. Subscription billing is unchanged.':body.action==='resume'?'Shop link resumed.':body.action==='extend-trial'?'Unpaid trial extended. Billing is unchanged.':'Unpaid trial designer access updated.';
  }else if(body.action==='terminate'){
   if(account.stripe_checkout_id){const checkout=await stripe!.checkout.sessions.retrieve(account.stripe_checkout_id);if(checkout.livemode!==true||checkout.customer!==account.stripe_customer_id)throw new Error('Checkout ownership mismatch');if(checkout.status==='open')await stripe!.checkout.sessions.expire(checkout.id);if(checkout.status==='complete'&&!sub)throw new Error('Checkout payment is being confirmed. Refresh before terminating.');}
   if(sub&&sub.status!=='canceled')await stripe!.subscriptions.cancel(sub.id,{invoice_now:false,prorate:false});
   if(sub)await synchronize(stripe,db,account,shop.plan,sub.id);
   update={status:'closed'};message='Business terminated. Its link is disabled and future subscription renewal is canceled. Existing invoices are not refunded.';
  }else {
   if(!sub)throw new Error('This business has no subscription.');
   if(body.action==='cancel-renewal'){if(sub.status!=='canceled')await stripe!.subscriptions.update(sub.id,{cancel_at_period_end:true},{idempotencyKey:'mqd-admin-'+requestId});message='Renewal canceled. Paid access continues through the paid period unless the link is separately paused.';}
   if(body.action==='discount'){
    if(!['active','past_due'].includes(sub.status))throw new Error('Discounts require an active or overdue service subscription.');
    if((sub.discounts?.length||0)>0&&body.replaceExisting!==true)throw new Error('Confirm replacement of the existing subscription discount.');
    const spec=discountSpec(body.discount,shop.plan),price=await stripe!.prices.retrieve(config.prices[shop.plan]);if(price.livemode!==true||price.currency!=='usd'||price.unit_amount!==(shop.plan==='3d'?9900:4900))throw new Error('Approved plan price mismatch');
    const coupon=await stripe!.coupons.create({...spec.coupon,name:'MYMERCHNOW service discount',applies_to:{products:[typeof price.product==='string'?price.product:price.product.id]},max_redemptions:1,metadata:{service:'mqd-print-shops',business:id}},{idempotencyKey:'mqd-admin-coupon-'+requestId});
    await stripe!.subscriptions.update(sub.id,{discounts:[{coupon:coupon.id}],proration_behavior:'none'},{idempotencyKey:'mqd-admin-discount-'+requestId});message='Subscription discount applied for '+spec.months+' month(s). Existing invoices were not changed.';
   }
   if(body.action==='remove-discount'){await stripe!.subscriptions.update(sub.id,{discounts:[],proration_behavior:'none'},{idempotencyKey:'mqd-admin-remove-discount-'+requestId});message='Subscription discounts removed. Existing invoices were not changed.';}
   await synchronize(stripe,db,account,shop.plan,sub.id);
   if(body.action==='refresh-billing')message='Subscription status refreshed from Stripe.';
  }
  const result={message};const saved=await db.rpc('mqd_finish_print_shop_admin',{p_request:requestId,p_revision:shop.revision,p_update:update,p_result:result,p_lease:lease});if(saved.error)throw new Error('Action result could not be confirmed. Refresh before retrying.');return json(saved.data);

 }catch(error){if(requestId)await db.from(AUDIT).update({status:'failed',updated_at:new Date().toISOString()}).eq('request_id',requestId);return json({error:error instanceof Error&&!('type' in error)?error.message:'Stripe action could not be confirmed. Refresh billing before retrying.'},409);}
 finally{if(lease&&id)await db.from(ACCOUNT_TABLE).update({lease_id:null,lease_until:null}).eq('business_id',id).eq('lease_id',lease);}
});
