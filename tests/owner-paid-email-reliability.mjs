import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
const webhookSource=fs.readFileSync(new URL('../supabase/functions/stripe-mqd-webhook/index.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
let handler,designDenied=true,deliveryStatus='sent',ownerRecipients=['owner@example.com'];const calls=[];
const order={id:'order-1',order_number:'MQD-ABC12345',product_name:'Shirt',design_id:'design-1',user_id:'user-1',status:'paid',stripe_payment_status:'paid',is_test:false};
class Query{
 constructor(table){this.table=table;this.write=false;}
 select(){return this;}in(){return this;}eq(){return this;}or(){return this;}
 update(){this.write=true;calls.push(this.table==='customer_designs'?'design-status':'payment-record');return this;}
 then(resolve,reject){const result=this.write?{error:this.table==='customer_designs'&&designDenied?{message:'permission denied for table customer_designs'}:null}:{data:this.table==='mqd_orders'?[order]:[{order_id:'order-1',unit_price:40,quantity:1}]};return Promise.resolve(result).then(resolve,reject);}
}
const context={Request,Response,TextEncoder,Uint8Array,crypto:crypto.webcrypto,console:{error:()=>{}},Date,
 Deno:{env:{get:key=>key==='MQD_STRIPE_WEBHOOK_SIGNING_SECRET'?'test-only-signing-secret':'test-only'},serve:fn=>handler=fn},
 createClient:()=>({from:table=>new Query(table)}),quantityFromOrderItem:item=>item.quantity,shippingCentsForQuantity:()=>1000,
 mqdOwnerEmails:async()=>ownerRecipients,escapeMqdEmailHtml:v=>String(v),queueMqdEmail:async(_,{html})=>{assert.match(html,/owner-orders\.html\?order=order-1/);calls.push('owner-notification');return{status:deliveryStatus};}};
vm.runInNewContext(stripTypeScriptTypes(webhookSource),context);
async function paidEvent(){const timestamp=Math.floor(Date.now()/1000);const payload=JSON.stringify({id:'evt-test-only',created:timestamp,livemode:true,type:'checkout.session.completed',data:{object:{id:'cs-test-fixture',payment_status:'paid',amount_subtotal:4000,amount_total:5000,total_details:{amount_shipping:1000},metadata:{order_numbers:'MQD-ABC12345',mqd_user_id:'user-1'}}}});const sig=crypto.createHmac('sha256','test-only-signing-secret').update(timestamp+'.'+payload).digest('hex');return handler(new Request('https://example.invalid/webhook',{method:'POST',headers:{'stripe-signature':`t=${timestamp},v1=${sig}`},body:payload}));}
assert.equal((await paidEvent()).status,500);assert.ok(calls.indexOf('owner-notification')<calls.indexOf('design-status'),'Notification must not wait for design status update');
designDenied=false;calls.length=0;assert.equal((await paidEvent()).status,200);
deliveryStatus='failed';assert.equal((await paidEvent()).status,500);assert.ok(calls.includes('payment-record'));
deliveryStatus='pending';assert.equal((await paidEvent()).status,500);
ownerRecipients=[];assert.equal((await paidEvent()).status,500);
assert.equal((await handler(new Request('https://example.invalid/webhook',{method:'POST',body:'{}'}))).status,400);

// Run the real email queue/helper against a local in-memory provider and database.
let row=null,accepted=0,fetches=0,failStatusWrite=true;const providerKeys=new Map(),keys=[];
class EmailQuery{
 constructor(){this.updateValue=null;this.insertValue=null;}
 upsert(value){this.insertValue=value;return this;}update(value){this.updateValue=value;return this;}
 select(){return this;}eq(){return this;}maybeSingle(){return Promise.resolve({data:row,error:null});}
 then(resolve,reject){let result={error:null};if(this.insertValue&&!row)row={...this.insertValue,id:'stable-notification-id',attempts:0};if(this.updateValue){if(this.updateValue.status==='sent'&&failStatusWrite){failStatusWrite=false;result={error:{message:'temporary database error'}};}else row={...row,...this.updateValue};}return Promise.resolve(result).then(resolve,reject);}
}
const helper=fs.readFileSync(new URL('../supabase/functions/_shared/mqd-email.js',import.meta.url),'utf8').replace(/export /g,'');
const emailContext={console,Deno:{env:{get:key=>key==='MQD_RESEND_API_KEY'?'test-only-provider-key':key==='MQD_EMAIL_FROM'?'notifications@example.com':undefined}},AbortSignal,
 fetch:async(_url,init)=>{fetches++;const key=init.headers['Idempotency-Key'];keys.push(key);if(!providerKeys.has(key)){accepted++;providerKeys.set(key,'provider-message-1');}return{ok:true,json:async()=>({id:providerKeys.get(key)})};}};
vm.runInNewContext(helper+'\nglobalThis.queue=queueMqdEmail;',emailContext);
const db={from:()=>new EmailQuery()},message={orderId:'order-1',kind:'owner_paid_order',recipient:'owner@example.com',subject:'Paid order',text:'Open Owner Orders'};
assert.equal((await emailContext.queue(db,message)).status,'failed');
assert.equal((await emailContext.queue(db,message)).status,'sent');
assert.equal((await emailContext.queue(db,message)).status,'sent');
assert.equal(accepted,1);assert.equal(fetches,2);assert.equal(new Set(keys).size,1);assert.equal(row.status,'sent');
row={...row,status:'failed',payload:{...row.payload,meta:{...row.payload.meta,deliveryStartedAt:new Date(Date.now()-25*60*60*1000).toISOString()}}};
assert.equal((await emailContext.queue(db,message)).manualReview,true);assert.equal(fetches,2);
console.log('PASS real webhook and email helper: design-sync failure does not suppress notification; failed/pending/no-recipient follows retry path; invalid signature rejected; provider retries keep one idempotency key; sent rows are not resent.');
