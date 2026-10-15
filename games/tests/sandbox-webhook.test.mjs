import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {createHmac,webcrypto} from 'node:crypto';
import {quantityFromOrderItem,shippingCentsForQuantity} from '../../supabase/functions/_shared/mqd-shipping.js';
const source=stripTypeScriptTypes(readFileSync(new URL('../../supabase/functions/stripe-mqd-test-webhook/index.ts',import.meta.url),'utf8').replace(/^import .*;$/gm,''));
async function exercise({game=true,wrongSession=false,badSignature=false,amount=5000,live=false}={}){
 const order={id:'order-1',order_number:'MQD-TEST123',product_name:'Test Shirt',design_id:null,user_id:null,status:'submitted',stripe_payment_status:'unpaid',is_test:true,stripe_checkout_session_id:wrongSession?'cs_test_other':'cs_test_unit',design_json:game?{range:'shirt-games',testMode:true}:{}};
 const updates=[],emails=[];let handler;
 const db={from:table=>({select:()=>({in:async()=>({data:table==='mqd_orders'?[order]:[{order_id:'order-1',unit_price:40,quantity:1,order_options:[{size:'M',quantity:1}]}],error:null})}),update:value=>{updates.push(value);return {eq:()=>({or:async()=>({error:null})})}}})};
 const env={SUPABASE_URL:'https://unit.invalid',SUPABASE_SERVICE_ROLE_KEY:'unit-service-key',MQD_STRIPE_TEST_WEBHOOK_SECRET:'whsec_unit_fixture'};
 runInNewContext(source,{Deno:{env:{get:key=>env[key]},serve:fn=>{handler=fn}},createClient:()=>db,TextEncoder,Response,crypto:webcrypto,console,quantityFromOrderItem,shippingCentsForQuantity,escapeMqdEmailHtml:String,mqdOwnerEmails:async()=>['unit-owner@example.test'],queueMqdEmail:async(_db,email)=>{emails.push(email)}});
 const epoch=Math.floor(Date.now()/1000),payload=JSON.stringify({id:'evt_test_unit',type:'checkout.session.completed',created:epoch,livemode:live,data:{object:{id:'cs_test_unit',metadata:{mqd_test:'1',order_numbers:'MQD-TEST123'},payment_status:'paid',amount_subtotal:4000,amount_total:amount,total_details:{amount_shipping:1000},currency:'usd'}}});
 const signature=createHmac('sha256','whsec_unit_fixture').update(epoch+'.'+payload).digest('hex');
 const response=await handler(new Request('https://unit.invalid/webhook',{method:'POST',body:payload,headers:{'stripe-signature':`t=${epoch},v1=${badSignature?'wrong':signature}`}}));
 return {status:response.status,body:await response.json(),updates,emails};
}
test('verified paid game sandbox is marked test and queues no notification',async()=>{const r=await exercise();assert.equal(r.status,200);assert.equal(r.updates[0].is_test,true);assert.equal(r.updates[0].stripe_payment_status,'paid');assert.equal(r.emails.length,0)});
test('ordinary sandbox notification behavior is preserved',async()=>{const r=await exercise({game:false});assert.equal(r.status,200);assert.equal(r.emails.length,1)});
test('game sandbox rejects mismatched session, amount, signature and live mode before fulfillment',async()=>{for(const options of [{wrongSession:true},{amount:1},{badSignature:true},{live:true}]){const r=await exercise(options);assert.ok([400,409].includes(r.status));assert.equal(r.updates.length,0);assert.equal(r.emails.length,0)}});
