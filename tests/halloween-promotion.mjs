import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as pricing from '../v20/promotion-pricing.js';
import {shippingCentsForQuantity} from '../v20/checkout-pricing.js';
const {BASE_CENTS,HALLOWEEN_END,HALLOWEEN_START,garmentPriceCents,halloweenActive,pricingEpoch}=pricing;
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.equal(read('v20/promotion-pricing.js'),read('supabase/functions/_shared/mqd-promotion-pricing.js'));
assert.equal(Object.keys(BASE_CENTS).length,12);
const expected=[4000,4800,4800,5600,7200,7200,2000,5600,3200,4800,5600,2800];
for(const [i,id] of Object.keys(BASE_CENTS).entries()){
 assert.equal(garmentPriceCents(id,HALLOWEEN_START),expected[i]);
 assert.equal(garmentPriceCents(id,HALLOWEEN_END-1),expected[i]);
 assert.equal(garmentPriceCents(id,HALLOWEEN_END),BASE_CENTS[id]);
 assert.equal(garmentPriceCents(id,HALLOWEEN_START-1),BASE_CENTS[id]);
}
assert.equal(halloweenActive(NaN),false);
assert.throws(()=>garmentPriceCents('unknown'),/Unknown garment/);
assert.equal(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'short',timeStyle:'long'}).format(new Date(HALLOWEEN_END-1)),'10/31/26, 11:59:59 PM EDT');
const guestToken='d6098f67-c597-4335-9043-eef71dcdcc64';
const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(guestToken))).toString('hex');
async function checkout(slug,now,{badOwner=false,badSize=false}={}){
 const signed=slug==='create-mqd-checkout',test=slug==='create-mqd-test-checkout';
 const orders=Object.keys(BASE_CENTS).map((id,i)=>({id:'order-'+i,order_number:'MQD-QA2026'+String(i).padStart(2,'0'),product_id:id,product_price:0.01,status:'submitted',design_id:'design-'+i,user_id:signed?'qa-user':null,guest_checkout_token_hash:badOwner?'wrong':hash,is_test:test}));
 const items=orders.map((order,i)=>({id:'item-'+i,order_id:order.id,product_id:order.product_id,unit_price:0.01,quantity:2,order_options:[{size:['mask','hat'].includes(order.product_id)?null:(badSize?'INVALID':'M'),quantity:2}]}));
 const updates=[];let captured,handler;
 class Query{
  constructor(table){this.table=table;}
  select(){return this;}in(){return this;}eq(){return this;}
  update(data){this.data=data;return this;}
  then(resolve,reject){return Promise.resolve(this.data?(updates.push({table:this.table,data:this.data}),{error:null}):{data:this.table==='mqd_orders'?orders:items,error:null}).then(resolve,reject);}
 }
 class Stripe{
  static createFetchHttpClient(){return {};}
  constructor(){this.checkout={sessions:{create:async(params,options)=>{captured={params,options};return {id:test?'cs_test_qa':'cs_live_qa',url:'https://checkout.stripe.com/qa',payment_status:'unpaid'};}}};}
 }
 const env={SUPABASE_URL:'https://qa.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-fixture-only',MQD_STRIPE_SECRET_KEY:'sk_live_fixture',MQD_STRIPE_TEST_SECRET_KEY:'sk_test_fixture'};
 const context=vm.createContext({
  ...pricing,shippingCentsForQuantity,Stripe,crypto,Request,Response,URL,TextEncoder,console,
  Date:class extends Date{static now(){return now;}},
  createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'qa-user',email:'qa@example.invalid',app_metadata:{role:'admin'}}},error:null})},from:table=>new Query(table),rpc:async()=>({data:test?'sk_test_fixture':'sk_live_fixture',error:null})}),
  Deno:{env:{get:name=>env[name]},serve:fn=>{handler=fn;}}
 });
 const source=read(`supabase/functions/${slug}/index.ts`).replace(/^import .*\n/gm,'');
 vm.runInContext(stripTypeScriptTypes(source),context);
 const response=await handler(new Request('https://qa.invalid',{method:'POST',headers:{authorization:'Bearer qa','content-type':'application/json'},body:JSON.stringify({orderNumbers:orders.map(o=>o.order_number),checkoutToken:'35894ff0-bf84-44e7-bbcb-46191ed8ecad',guestToken,price:0.01,discount:100})}));
 if(badOwner||badSize){assert.notEqual(response.status,200);assert.equal(captured,undefined);return;}
 assert.equal(response.status,200,await response.clone().text());
 assert.deepEqual(Array.from(captured.params.line_items,l=>l.price_data.unit_amount),Object.keys(BASE_CENTS).map(id=>garmentPriceCents(id,now)));
 assert(captured.params.line_items.every(l=>l.quantity===2));
 assert.equal(captured.params.shipping_options[0].shipping_rate_data.fixed_amount.amount,2000,'24 garments keep full-price shipping');
 assert.equal(captured.params.metadata.promotion_id,pricingEpoch(now));
 for(const [i,order] of orders.entries()){
  assert.equal(updates[i*2].data.product_price,garmentPriceCents(order.product_id,now)/100);
  assert.equal(updates[i*2+1].data.unit_price,garmentPriceCents(order.product_id,now)/100);
 }
 return captured.options.idempotencyKey;
}
for(const slug of ['create-mqd-checkout','create-mqd-guest-checkout','create-mqd-test-checkout']){
 const saleKey=await checkout(slug,HALLOWEEN_END-1);
 const regularKey=await checkout(slug,HALLOWEEN_END);
 assert.notEqual(saleKey,regularKey,'retry at expiry cannot replay the sale Session');
 await checkout(slug,HALLOWEEN_END-1,{badSize:true});
 if(slug!=='create-mqd-checkout')await checkout(slug,HALLOWEEN_END-1,{badOwner:true});
}
// Frozen renderer and model mappings stay byte-for-byte unchanged; existing baseline tests cover them.
console.log('PASS: all 12 sale prices, Eastern cutoff, server-enforced guest/account/sandbox checkout, shipping, captured order prices, tampering and expiry retries.');
