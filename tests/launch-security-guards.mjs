import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { boundedFormData, validateGuestFiles, consumeBudget } from '../supabase/functions/_shared/mqd-upload-guard.js';
import { quantityFromOrderItem, shippingCentsForQuantity } from '../supabase/functions/_shared/mqd-shipping.js';

const form = new FormData();
form.append('asset', new File(['image'], 'logo.png', { type: 'image/png' }));
form.append('assetMeta', JSON.stringify({ zone: 'Front' }));
const req = new Request('https://example.test', { method: 'POST', body: form });
assert.equal(validateGuestFiles(await boundedFormData(req)), 5);
await assert.rejects(boundedFormData(new Request('https://example.test', { method: 'POST', body: new Uint8Array(100), headers: { 'content-type': 'multipart/form-data; boundary=x' } }), 10));
const bad = new FormData(); bad.append('asset', new File(['x'], 'bad.html', {type:'text/html'})); bad.append('assetMeta','{}');
assert.throws(() => validateGuestFiles(bad), /PNG/);
const tooMany = new FormData();
for (let i=0;i<65;i++) { tooMany.append('asset',new File(['x'],'a.png',{type:'image/png'})); tooMany.append('assetMeta','{}'); }
assert.throws(() => validateGuestFiles(tooMany), /64/);
for (const result of [{data:null,error:{message:'offline'}},{data:null,error:null}]) {
  await assert.rejects(consumeBudget({rpc:async()=>result},'test',1), e=>e.status===503);
}
await assert.rejects(consumeBudget({rpc:async()=>({data:false,error:null})},'test',1), e=>e.status===429);
await consumeBudget({rpc:async()=>({data:true,error:null})},'test',1);

function loadHandler(name, client, env={}) {
  let handler;
  const ts=readFileSync(new URL(`../supabase/functions/${name}/index.ts`,import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  const js=stripTypeScriptTypes(ts);
  new Function('Deno','createClient','quantityFromOrderItem','shippingCentsForQuantity','escapeMqdEmailHtml','mqdOwnerEmails','queueMqdEmail', js)(
    {serve:fn=>handler=fn,env:{get:key=>env[key]||'test'}},()=>client,quantityFromOrderItem,shippingCentsForQuantity,x=>x,async()=>[],async()=>({})
  );
  return handler;
}
for (const result of [{data:null,error:{message:'offline'}},{data:null,error:null},{data:false,error:null}]) {
  const handler=loadHandler('mqd-remove-background',{rpc:async()=>result});
  // A fake image must never reach the provider when its budget cannot be verified.
  const response=await handler(new Request('https://example.test',{method:'POST',headers:{origin:'https://mymerchnow.app'},body:'not an image'}));
  assert.equal(response.status,result.data===false?429:503);
}

let updateCount=0;
let row;
const item={order_id:'one',unit_price:50,quantity:1,order_options:[]};
const client={from(table){
  let update;
  const q={select(){return q},in(){return q},eq(){return q},update(value){update=value;return q},or(){
    if(row.stripe_payment_status!=='paid') { Object.assign(row,update); updateCount++; }
    return Promise.resolve({error:null});
  },then(resolve,reject){return Promise.resolve({data:table==='mqd_orders'?[{...row}]:[item],error:null}).then(resolve,reject)}};
  return q;
}};
const webhook=loadHandler('stripe-mqd-webhook',client,{MQD_STRIPE_WEBHOOK_SIGNING_SECRET:'test-signing-secret'});
async function eventRequest(type='checkout.session.completed',valid=true) {
  const timestamp=Math.floor(Date.now()/1000);
  const body=JSON.stringify({id:'evt_test',created:timestamp,livemode:true,type,data:{object:{id:'cs_live_test',metadata:{order_numbers:'MQD-ABCDEF'},payment_status:'paid',amount_subtotal:5000,amount_total:6000,total_details:{amount_shipping:1000},currency:'usd'}}});
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-signing-secret'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`))).toString('hex');
  return new Request('https://example.test',{method:'POST',body,headers:{'stripe-signature':`t=${timestamp},v1=${valid?sig:'invalid'}`}});
}
for(const status of ['paid','production','shipped','completed','cancelled']) {
  row={id:'one',order_number:'MQD-ABCDEF',status,stripe_payment_status:'paid',paid_at:'original',is_test:false};
  const response=await webhook(await eventRequest());
  assert.equal(response.status,200); assert.equal(row.status,status); assert.equal(row.paid_at,'original');
  await webhook(await eventRequest('checkout.session.async_payment_failed'));
  assert.equal(row.status,status); assert.equal(row.stripe_payment_status,'paid');
}
assert.equal(updateCount,0);
row={id:'one',order_number:'MQD-ABCDEF',status:'submitted',stripe_payment_status:null,is_test:false};
assert.equal((await webhook(await eventRequest())).status,200); assert.equal(row.status,'paid'); assert.equal(updateCount,1);
assert.equal((await webhook(await eventRequest('checkout.session.completed',false))).status,400);
assert.equal(updateCount,1);
console.log('PASS: upload stream/file limits, budget rejection, background-removal failure safety, signed webhook settlement, duplicate/late-event protection.');
