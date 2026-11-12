import assert from 'node:assert/strict';
import {deliverRequest,requestEmails,sendRequestEmail} from '../supabase/functions/mqd-print-shop-pilot/delivery.js';
import {PILOT_SHOP,REQUEST_MATERIAL} from '../v20/print-shop-contract.js';
const now=Date.now(),base={id:crypto.randomUUID(),reference:'SHOP-TEST',status:'pending',customer_receipt_status:'pending',created_at:new Date(now).toISOString()};
const input={shop:PILOT_SHOP,customer:{name:'Synthetic Customer',email:'customer@example.com',phone:'2025550101',notes:'Private shop instructions'},summary:{engine:'3d',productId:'tshirt',material:REQUEST_MATERIAL,materialRequest:'Other fabric',color:'White',printMethod:'all-over',orderOptions:[{size:'L',quantity:2}]},estimate:{quoteRequired:true},recipient:'shop@example.com',from:'Print Shops <notifications@example.com>',attachment:{filename:'design.zip',content:'original-bytes'}};
const emails=requestEmails({row:base,...input});
assert.equal(emails.shop.attachments[0].content,'original-bytes');
assert(!emails.customer.attachments);assert(!emails.customer.text.includes(input.customer.notes));
assert.match(emails.customer.text,/not a purchase/);assert.match(emails.customer.text,/Other fabric/);assert.match(emails.customer.text,/SHOP-TEST/);
assert.equal(emails.customer.reply_to,'shop@example.com');
for(const fail of [null,'shop','customer']){
 const row=structuredClone(base),calls=[],db={from:table=>{assert.equal(table,'mqd_print_shop_requests');return {update:change=>({eq:async()=>{Object.assign(row,change);return {};}})};}};
 let failing=fail;
 const send=async args=>{calls.push(args);return failing=== (args.idempotencyKey.startsWith('shop-receipt-')?'customer':'shop')?null:'provider-'+calls.length;};
 const run=()=>deliverRequest({db,row,emails,key:'test-only',send,now});
 if(fail==='shop'){await assert.rejects(run,/could not accept/);assert.equal(calls.length,1);assert.equal(row.status,'failed');assert.equal(row.customer_receipt_status,'pending');}
 else {assert.equal(await run(),fail==='customer'?'failed':'sent');assert.equal(row.status,'sent');assert.equal(calls.length,2);}
 failing=null;await run();
 assert.equal(row.customer_receipt_status,'sent');
 const count=calls.length;await run();assert.equal(calls.length,count,'accepted receipts and merchant ZIPs are never resent');
 if(fail==='customer')assert.equal(calls.filter(c=>!c.idempotencyKey.includes('receipt')).length,1,'receipt retry must not resend the shop request');
}
// Historical requests and sends beyond the provider key retention window stay quiet.
let sends=0;
const db={from:()=>({update:()=>({eq:async()=>({})})})};
assert.equal(await deliverRequest({db,row:{...base,status:'sent',customer_receipt_status:null},emails,key:'x',send:async()=>{sends++;},now}),'not_requested');
assert.equal(await deliverRequest({db,row:{...base,status:'sent',created_at:new Date(now-24*3600000).toISOString()},emails,key:'x',send:async()=>{sends++;},now}),'failed');
await assert.rejects(()=>deliverRequest({db,row:{...base,created_at:new Date(now-24*3600000).toISOString()},emails,key:'x',send:async()=>{sends++;},now}),/shop follow-up/);
assert.equal(sends,0);
for(const failures of [[503,200],[429,200],['network',200],[422],[503,503,503]]){
 const calls=[];
 const id=await sendRequestEmail({key:'x',body:emails.customer,idempotencyKey:'same-key',sleep:async()=>{},fetchImpl:async(url,options)=>{calls.push(options);const status=failures[calls.length-1];if(status==='network')throw new Error('offline');return new Response(JSON.stringify({id:'provider-id'}),{status});}});
 assert.equal(calls.length,failures.length);
 assert.equal(id,failures.at(-1)===200?'provider-id':null);
 assert(calls.every(c=>c.headers['Idempotency-Key']==='same-key'&&c.body===calls[0].body));
}
console.log('PASS request receipts: merchant-first acceptance, private ZIP, retry idempotency, partial failure, historical requests, provider-window bound and no real emails.');
