import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {subscriptionState,PRICES,configuration,ACCOUNT_TABLE,EVENT_TYPES,save,synchronize,objectId} from '../supabase/functions/mqd-print-shop-billing/billing.js';
const base={id:'sub_test',livemode:false,customer:'cus_test',status:'active',cancel_at_period_end:false,items:{data:[{price:{id:PRICES['2d']},quantity:1,current_period_end:Math.floor(Date.now()/1000)+86400}]},latest_invoice:{status:'paid'}};
assert(subscriptionState(base,'cus_test','2d').testAccess);
assert(subscriptionState({...base,cancel_at_period_end:true},'cus_test','2d').testAccess,'scheduled cancellation retains the paid period');
assert.equal(subscriptionState({...base,cancel_at_period_end:false,cancel_at:base.items.data[0].current_period_end},'cus_test','2d').cancel_at_period_end,true,'flexible billing portal may use cancel_at instead of the legacy cancellation flag');
for(const status of ['incomplete','past_due','unpaid','canceled','paused','trialing'])assert(!subscriptionState({...base,status},'cus_test','2d').testAccess,status);
assert(!subscriptionState({...base,latest_invoice:{status:'open'}},'cus_test','2d').testAccess);
assert(!subscriptionState(base,'cus_test','2d',Date.now()+2*86400000).testAccess);
assert.throws(()=>subscriptionState({...base,livemode:true},'cus_test','2d'),/environment/);
assert.throws(()=>subscriptionState(base,'cus_another','2d'),/ownership/);
assert.throws(()=>subscriptionState(base,'cus_test','3d'),/approved/);
const id=crypto.randomUUID(),token='a'.repeat(64),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const shop={id,token_hash:digest,token_expires_at:new Date(Date.now()+86400000).toISOString(),email_verified_at:new Date().toISOString(),approved_at:new Date().toISOString(),status:'pilot_active',plan:'2d',shop_config:{name:'Test shop'},owner_email:'test@example.com'};
let account={business_id:id,stripe_customer_id:'cus_test',status:'not_started'},calls=[],handler;
const db={rpc:async(name,args)=>name==='mqd_claim_print_shop_billing'?{data:[structuredClone(account)]}:{data:''},from:table=>{
 assert(['mqd_print_shop_businesses',ACCOUNT_TABLE].includes(table),'must not touch apparel tables');let filters=[],change=null;const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},update:v=>{change=v;return q;},single:async()=>finish(),maybeSingle:async()=>finish(),then:(a,b)=>Promise.resolve(finish()).then(a,b)};function finish(){const row=table===ACCOUNT_TABLE?account:shop;if(!filters.every(([k,v])=>k==='lease_id'||row[k]===v))return {data:null,error:{message:'missing'}};if(change)Object.assign(row,change);return {data:structuredClone(row)};}return q;
}};
const configs={key:'rk_test_mock',webhook:'whsec_mock',portal:'bpc_mock',enabled:true};
class StripeMock{static createFetchHttpClient(){return {};}constructor(){this.prices={retrieve:async price=>({id:price,active:true,livemode:false,unit_amount:4900,currency:'usd',recurring:{interval:'month',interval_count:1}})};this.subscriptions={list:async()=>({data:[]})};this.checkout={sessions:{create:async params=>{calls.push(params);return {id:'cs_test',livemode:false,url:'https://checkout.stripe.com/test'};},retrieve:async()=>({status:'open',url:'https://checkout.stripe.com/test'})}};this.billingPortal={sessions:{create:async params=>{calls.push(params);return {url:'https://billing.stripe.com/test'};}}};}}
let source=await fs.readFile(new URL('../supabase/functions/mqd-print-shop-billing/index.ts',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>db,Stripe:StripeMock,PRICES,ACCOUNT_TABLE,configuration:async()=>configs,save,synchronize,crypto,TextEncoder,TextDecoder,Uint8Array,Request,Response,Deno:{env:{get:()=>''},serve:h=>handler=h}});
const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';async function call(body){const response=await handler(new Request('https://example.test',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',Origin:'http://127.0.0.1:8765'},body:JSON.stringify(body)}));return {status:response.status,result:await response.json()};}
let response=await call({action:'checkout',id,token,price:'malicious',amount:1});assert.equal(response.status,200);assert.equal(calls[0].line_items[0].price,PRICES['2d']);assert.equal(calls[0].line_items[0].quantity,1);assert(!('payment_method_types' in calls[0]));assert(!('automatic_tax' in calls[0]));assert.equal(calls[0].mode,'subscription');assert.equal(calls[0].subscription_data.billing_mode.type,'flexible');
response=await call({action:'checkout',id,token});assert.equal(response.status,200);assert.equal(calls.length,1,'reuse open checkout instead of duplicating');
response=await call({action:'checkout',id,token:'b'.repeat(64)});assert.equal(response.status,401);
shop.status='pending_review';response=await call({action:'checkout',id,token});assert.equal(response.status,409);shop.status='pilot_active';
response=await call({action:'portal',id,token});assert.equal(response.status,200);assert.equal(calls.at(-1).customer,'cus_test');
configs.enabled=false;response=await call({action:'checkout',id,token});assert.equal(response.status,503);
globalThis.Deno={env:{get:()=>''}};assert.equal((await configuration({rpc:async()=>({data:'sk_live_not_allowed'})})).enabled,false);delete globalThis.Deno;
for(const file of ['../supabase/functions/mqd-print-shop-billing/index.ts','../supabase/functions/mqd-print-shop-billing-webhook/index.ts']){const raw=await fs.readFile(new URL(file,import.meta.url),'utf8');new vm.Script(stripTypeScriptTypes(raw.replace(/^import .*;\n/gm,'')));}
console.log('Billing checks passed: monthly prices, owner isolation, approval gate, checkout reuse, portal ownership, cancellation access, unpaid/expired states, live-key rejection, and sandbox-only state.');
