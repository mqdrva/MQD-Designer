import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {ADMIN_ACTIONS,discountSpec,ownedSubscription,localChange} from '../supabase/functions/mqd-print-shop-admin/policy.js';
const now=Date.now(),id=crypto.randomUUID(),actor=crypto.randomUUID(),prices={'2d':'price_service_2d','3d':'price_service_3d'};
let shop={id,preferred_slug:'test-business',plan:'2d',status:'pilot_active',revision:1,email_verified_at:new Date(now).toISOString(),approved_at:new Date(now).toISOString(),pilot_expires_at:new Date(now+86400000).toISOString(),shop_config:{engines:['2d'],printMethods:{htv:'HTV'}},billing_status:'not_configured'};
let account={business_id:id,status:'not_started',stripe_customer_id:null,stripe_subscription_id:null};
assert.equal(discountSpec({kind:'amount',value:12.50,months:3},'2d').coupon.amount_off,1250);
assert.equal(discountSpec({kind:'percent',value:25,months:1},'3d').coupon.percent_off,25);
for(const d of [{kind:'amount',value:50,months:1},{kind:'percent',value:101,months:1},{kind:'percent',value:10,months:0},{kind:'percent',value:10,months:13}])assert.throws(()=>discountSpec(d,'2d'));
assert.throws(()=>localChange('resume',{...shop,status:'suspended'},{...account,stripe_subscription_id:'sub_owned',status:'active',period_end:null},{},now));
assert.equal(localChange('pause',shop,account,{},now).status,'suspended');
assert.throws(()=>localChange('extend-trial',shop,{...account,stripe_subscription_id:'sub_paid'},{days:7},now));
let calls=[],audits=new Map(),mfa=true,adminReady=true,handler;
let sub={id:'sub_owned',customer:'cus_owned',livemode:true,status:'active',discounts:[],items:{data:[{quantity:1,price:{id:prices['2d']}}]}};
const db={auth:{getUser:async jwt=>({data:{user:jwt==='admin'?{id:actor,app_metadata:{role:'admin'}}:jwt==='metadata-admin'?{id:actor,user_metadata:{role:'admin'}}:null}})},rpc:async(name,args)=>{
 if(name==='mqd_get_vault_secret')return {data:adminReady?'rk_live_mock':''};
 if(name==='mqd_claim_print_shop_subscription'){account.lease_id=args.p_lease;return {data:[structuredClone(account)]};}
 if(name==='mqd_finish_print_shop_admin'){const entry=audits.get(args.p_request);if(entry.status==='processed')return {data:entry.result};Object.assign(shop,args.p_update);if(Object.keys(args.p_update).length)shop.revision++;entry.status='processed';entry.result=args.p_result;return {data:args.p_result};}
 if(name==='mqd_list_print_shop_admin')return {data:{businesses:[],counts:{},total:0}};
 throw new Error('Unexpected RPC '+name);
},from:table=>{assert(['mqd_print_shop_businesses','mqd_print_shop_subscription_accounts','mqd_print_shop_admin_actions'].includes(table),'no apparel tables');let filters=[],change;const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},update:v=>{change=v;return q;},upsert:async v=>{if(!audits.has(v.request_id))audits.set(v.request_id,structuredClone(v));return {};},single:async()=>finish(),maybeSingle:async()=>finish(),then:(yes,no)=>Promise.resolve(finish()).then(yes,no)};function finish(){let row=table==='mqd_print_shop_businesses'?shop:table==='mqd_print_shop_subscription_accounts'?account:audits.get(filters.find(([k])=>k==='request_id')?.[1]);if(!row||!filters.every(([k,v])=>row[k]===v))return {data:null};if(change)Object.assign(row,change);return {data:structuredClone(row)};}return q;}};
class StripeMock{static createFetchHttpClient(){return {};}constructor(){this.subscriptions={retrieve:async()=>structuredClone(sub),update:async(id,p)=>{calls.push(['update',id,p]);if(p.cancel_at_period_end)sub.cancel_at_period_end=true;return sub;},cancel:async(id,p)=>{calls.push(['cancel',id,p]);sub.status='canceled';return sub;}};this.prices={retrieve:async()=>({livemode:true,currency:'usd',unit_amount:4900,product:'prod_service'})};this.coupons={create:async p=>{calls.push(['coupon',p]);return {id:'coupon_service'};}};this.checkout={sessions:{retrieve:async()=>({id:'cs_owned',livemode:true,customer:'cus_owned',status:'open'}),expire:async id=>calls.push(['expire',id])}};}}
let source=(await fs.readFile('supabase/functions/mqd-print-shop-admin/index.ts','utf8')).replace(/^import .*;\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>db,Stripe:StripeMock,hasAdminMfa:async()=>mfa,configuration:async()=>({prices}),synchronize:async()=>{account.status=sub.status;},ACCOUNT_TABLE:'mqd_print_shop_subscription_accounts',ADMIN_ACTIONS,discountSpec,ownedSubscription,localChange,structuredClone,crypto,TextEncoder,TextDecoder,Uint8Array,Response,Request,Deno:{env:{get:()=>''},serve:h=>handler=h}});
async function call(body,jwt='admin',origin='https://mymerchnow.app'){const r=await handler(new Request('https://example.test',{method:'POST',headers:{Origin:origin,apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4',Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}
const action=(name,extra={})=>({action:name,id,revision:shop.revision,confirm:'test-business',requestId:crypto.randomUUID(),...extra});
assert.equal((await call({action:'list'},'stranger')).status,403);assert.equal((await call({action:'list'},'metadata-admin')).status,403);mfa=false;assert.equal((await call({action:'list'})).status,403);mfa=true;
assert.equal((await call({action:'list'},'admin','https://attacker.test')).status,403);
assert.equal((await call(action('pause',{confirm:'another-shop'}))).status,400);
const extend=action('extend-trial',{days:7});assert.equal((await call(extend)).status,200);const expiry=shop.pilot_expires_at;assert.equal((await call(extend)).status,200);assert.equal(shop.pilot_expires_at,expiry,'replay must not extend twice');
assert.equal((await call(action('pause'))).status,200);assert.equal(shop.status,'suspended');assert.equal(calls.length,0,'pause never changes Stripe billing');
assert.equal((await call(action('resume'))).status,200);assert.equal(shop.status,'pilot_active');
assert.equal((await call(action('trial-plan',{plan:'3d'}))).status,200);assert.deepEqual([...shop.shop_config.engines],['2d','3d']);shop.plan='2d';
account.stripe_customer_id='cus_owned';account.stripe_subscription_id='sub_owned';account.status='active';account.period_end=new Date(now+86400000).toISOString();shop.status='active';
adminReady=false;assert.equal((await call(action('terminate'))).status,503);assert.equal(shop.status,'active');assert.equal(calls.length,0);adminReady=true;
assert.equal((await call(action('cancel-renewal'))).status,200);assert.equal(calls.at(-1)[2].cancel_at_period_end,true);assert.equal(shop.status,'active');
sub.customer='cus_foreign';assert.equal((await call(action('terminate'))).status,409);assert(!calls.some(c=>c[0]==='cancel'));sub.customer='cus_owned';
assert.equal((await call(action('discount',{discount:{kind:'percent',value:20,months:3},replaceExisting:true}))).status,200);const coupon=calls.find(c=>c[0]==='coupon')[1];assert.equal(coupon.percent_off,20);assert.deepEqual([...coupon.applies_to.products],['prod_service']);assert.equal(coupon.max_redemptions,1);assert.equal(calls.at(-1)[2].proration_behavior,'none');
assert.equal((await call(action('terminate'))).status,200);assert.equal(shop.status,'closed');assert.equal(sub.status,'canceled');assert.equal(calls.at(-1)[2].invoice_now,false);assert.equal(calls.at(-1)[2].prorate,false);
console.log('Management passed: admin/MFA/origin isolation, confirmation, idempotent trial changes, pause versus billing, owned subscription cancellation/discounts/termination, and missing-key gating.');
