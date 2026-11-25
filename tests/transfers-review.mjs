import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import * as transfers from '../supabase/functions/_shared/mqd-transfers.js';
import * as promotion from '../supabase/functions/_shared/mqd-promotion-pricing.js';
import * as everyday from '../supabase/functions/_shared/mqd-everyday.js';
import * as shipping from '../supabase/functions/_shared/mqd-shipping.js';
import { transferHandler } from '../supabase/functions/_shared/mqd-transfer-submit.js';
import { cartLineTotals } from '../v20/transfers-cart.js';
import { transferMeasurementsCsv } from '../v20/transfer-production-package.js';
import { classifyOwnerOrder } from '../supabase/functions/_shared/mqd-owner-work-queue.js';

const tables={mqd_orders:[],mqd_order_items:[],mqd_order_assets:[]};
const assets=new Map();
const base=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const env={MQD_TRANSFERS_ENABLED:'true',SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture',MQD_STRIPE_SECRET_KEY:'sk_live_fixture'};
class Query {
  constructor(table){this.rows=tables[table];this.filters=[];}
  select(){return this;}
  eq(key,value){this.filters.push(row=>row[key]===value);return this;}
  in(key,values){this.filters.push(row=>values.includes(row[key]));return this;}
  or(expression){
    assert.equal(expression,'stripe_payment_status.is.null,stripe_payment_status.neq.paid');
    this.filters.push(row=>row.stripe_payment_status!=='paid');
    return this;
  }
  maybeSingle(){this.one=true;return this;}
  single(){return this.maybeSingle();}
  insert(value){this.added=structuredClone(value);return this;}
  update(value){this.updated=structuredClone(value);return this;}
  then(resolve,reject){
    return Promise.resolve().then(()=>{
      if(this.added){
        const row=this.added;
        row.id||=crypto.randomUUID();
        if(this.rows===tables.mqd_orders)row.order_number='MQD-TRANSFER'+(10+this.rows.length);
        this.rows.push(row);return {data:row,error:null};
      }
      const rows=this.rows.filter(row=>this.filters.every(fn=>fn(row)));
      if(this.updated)rows.forEach(row=>Object.assign(row,this.updated));
      return {data:this.one?rows[0]||null:structuredClone(rows),error:null};
    }).then(resolve,reject);
  }
}
const db={
  from:name=>new Query(name),
  rpc:async()=>({data:true}),
  auth:{getUser:async()=>({data:{user:null}})},
  storage:{from:name=>{
    assert.equal(name,'mqd-production');
    return {upload:async(id,file)=>{assets.set(id,file);return{};},remove:async ids=>{ids.forEach(id=>assets.delete(id));return{};}};
  }}
};
const submit=transferHandler({createClient:()=>db,env:name=>env[name]});
let lastSession;
async function loadCheckout(Stripe) {
  const file=await fs.readFile(path.join(base,'supabase/functions/create-mqd-guest-checkout/index.ts'),'utf8');
  let checkout;
  vm.runInNewContext(stripTypeScriptTypes(file.replace(/^import .*\n/gm,'')),{
    ...transfers,...promotion,...everyday,...shipping,Stripe,createClient:()=>db,crypto,Request,Response,URL,TextEncoder,console,
    Deno:{env:{get:name=>env[name]},serve:handler=>{checkout=handler;}}
  });
  return checkout;
}
const checkout=await loadCheckout(class {
  static createFetchHttpClient(){return{};}
  checkout={sessions:{create:async data=>{
    const subtotal=data.line_items.reduce((sum,row)=>sum+row.quantity*row.price_data.unit_amount,0);
    lastSession={subtotal,data};
    return {id:'cs_live_mock_fixture',url:'/__review/checkout',payment_status:'unpaid'};
  }}};
});
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8B9fkAAAAASUVORK5CYII=','base64');
const guestToken=crypto.randomUUID();
const asset=new File([png],'fixture.png',{type:'image/png'});
const sheet={layers:[{x:0,y:0,width:3,height:3}]};
function upload(sku,count,opts={}) {
  const form=new FormData();
  form.append('payload',JSON.stringify({sku,sheets:Array.from({length:count},()=>opts.sheet||sheet),submissionToken:opts.submissionToken||crypto.randomUUID()}));
  form.append('guestToken',opts.guestToken||guestToken);
  for(let i=0;i<count;i++){form.append('asset',asset);form.append('assetMeta','{}');}
  return submit(new Request('https://test.invalid',{method:'POST',body:form}));
}
if(process.argv.includes('--serve')){
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'};
  const server=http.createServer(async (req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1');
      if(url.pathname==='/__review/checkout'){
        res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Local test checkout</h1><p>Subtotal $'+(lastSession.subtotal/100).toFixed(2)+'</p><p>No payment is collected in this review.</p><a href="/transfers.html">Return to Transfers</a>');return;
      }
      if(url.pathname.startsWith('/__review/')){
        const action=url.pathname.split('/').at(-1);
        const request=new Request('http://127.0.0.1'+req.url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});
        const response=action==='submit-mqd-transfer'?await submit(request):action==='create-mqd-guest-checkout'?await checkout(request):new Response('',{status:404});
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      const relative=url.pathname==='/'?'custom-apparel.html':url.pathname.slice(1);
      if(!/^(transfers\.html|custom-apparel\.html|(?:v20|assets)\/[a-zA-Z0-9_./-]+)$/.test(relative)||relative.split('/').some(ch=>ch==='..')){res.writeHead(404);res.end();return;}
      const file=path.join(base,relative);
      const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end();}
  });
  server.listen(Number(process.env.TRANSFERS_PORT||4316),'127.0.0.1',()=>console.log('Transfer review http://127.0.0.1:'+server.address().port+'/'));
}else{
  const submitSource=await fs.readFile(path.join(base,'supabase/functions/submit-mqd-transfer/index.ts'),'utf8');
  const checkEnabled=setup=>{
    let handler;
    vm.runInNewContext(stripTypeScriptTypes(submitSource.replace(/^import .*\n/gm,'')),{
      createClient:()=>db,transferHandler,Deno:{env:{get:name=>setup[name]},serve:fn=>{handler=fn;}}
    });
    return handler(new Request('https://test.invalid'));
  };
  assert.equal((await checkEnabled({SUPABASE_URL:'https://gsxuhpffgdffsqksrkrf.supabase.co'})).status,200);
  assert.equal((await checkEnabled({SUPABASE_URL:'https://gsxuhpffgdffsqksrkrf.supabase.co',MQD_TRANSFERS_ENABLED:'false'})).status,503);
  assert.equal((await checkEnabled({SUPABASE_URL:'https://test.invalid',MQD_TRANSFERS_ENABLED:'false'})).status,503);
  assert.deepEqual([1,2,3,4,5,6,7].map(transfers.dtfCents),[1000,2000,2500,3500,4500,5000,6000]);
  assert.equal((await upload('sublimation-all-over',2)).status,400);
  assert.equal((await upload('dtf-sheet',1,{sheet:{layers:[]}})).status,400);
  assert.equal((await upload('dtf-sheet',1,{sheet:{layers:[{x:10,y:0,width:3,height:3}]}})).status,400);
  const crop={left:.2,top:.1,right:.15,bottom:0};
  const croppedSheet={layers:[{...sheet.layers[0],crop}]};
  const invalidCrop={layers:[{...sheet.layers[0],crop:{...crop,right:.8}}]};
  assert.equal((await upload('dtf-sheet',1,{sheet:invalidCrop})).status,400);
  const id=crypto.randomUUID(), first=await upload('dtf-sheet',2,{sheet:croppedSheet,submissionToken:id});
  assert.equal(first.status,200,await first.clone().text());
  const firstOrder=await first.json();
  assert.deepEqual(tables.mqd_orders[0].design_json.transfers.sheets[0].layers[0].crop,crop);
  assert.deepEqual(tables.mqd_order_assets[0].metadata.crop,crop);
  assert.equal((await (await upload('dtf-sheet',2,{sheet:croppedSheet,submissionToken:id})).json()).orderNumber,firstOrder.orderNumber);
  assert.equal((await upload('dtf-sheet',2,{submissionToken:id})).status,409);
  assert.equal((await upload('dtf-sheet',2,{sheet:croppedSheet,submissionToken:id,guestToken:crypto.randomUUID()})).status,403);
  for(const [sku,count] of [['dtf-sheet',2],['sublimation-square',2]]) {
    const response=await upload(sku,count);
    assert.equal(response.status,200,await response.clone().text());
  }
  const good=tables.mqd_orders.map(row=>row.order_number);
  const request=(orderNumbers,token=guestToken)=>new Request('https://test.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderNumbers,checkoutToken:crypto.randomUUID(),guestToken:token,price:1})});
  assert.equal((await checkout(request(good,crypto.randomUUID()))).status,403);
  const complete=await checkout(request(good));
  assert.equal(complete.status,200,await complete.clone().text());
  assert.equal(lastSession.subtotal,5500);
  assert.deepEqual(Array.from(lastSession.data.line_items,line=>line.price_data.unit_amount),[2000,1500,2000]);
  assert.equal(assets.size,6);
  assert.equal(tables.mqd_order_assets[1].zone_name,'sheet-2');
  assert.deepEqual(cartLineTotals(tables.mqd_orders.map((row,index)=>({orderNumber:row.order_number,productId:row.product_id,price:10,totalQuantity:tables.mqd_order_items[index].quantity}))),[2000,1500,2000]);
  tables.mqd_orders[0].design_json.productionReady=false;
  assert.equal((await checkout(request(good))).status,409);
  tables.mqd_orders[0].design_json.productionReady=true;

  const secret='local-mock-signing-secret';
  let webhook;
  const webhookSource=await fs.readFile(path.join(base,'supabase/functions/stripe-mqd-webhook/index.ts'),'utf8');
  vm.runInNewContext(stripTypeScriptTypes(webhookSource.replace(/^import .*\n/gm,'')),{
    ...transfers,...shipping,createClient:()=>db,crypto,Request,Response,TextEncoder,console,
    mqdOwnerEmails:async()=>['owner@example.invalid'],escapeMqdEmailHtml:String,queueMqdEmail:async()=>({status:'sent'}),
    Deno:{env:{get:name=>name==='MQD_STRIPE_WEBHOOK_SIGNING_SECRET'?secret:env[name]},serve:handler=>{webhook=handler;}}
  });
  const stamp=Math.floor(Date.now()/1000);
  const delivery=JSON.stringify({id:'evt_fixture',livemode:true,type:'checkout.session.completed',created:stamp,data:{object:{
    id:'cs_live_mock_fixture',payment_status:'paid',metadata:{order_numbers:good.join(',')},
    amount_subtotal:5500,amount_total:5500+shipping.shippingCentsForQuantity(6),
    total_details:{amount_shipping:shipping.shippingCentsForQuantity(6)}
  }}});
  const signature=createHmac('sha256',secret).update(stamp+'.'+delivery).digest('hex');
  const paid=await webhook(new Request('https://test.invalid',{method:'POST',headers:{'stripe-signature':'t='+stamp+',v1='+signature},body:delivery}));
  assert.equal(paid.status,200,await paid.clone().text());
  const paidOrder=tables.mqd_orders[0];
  assert.equal(classifyOwnerOrder(paidOrder).payment_confirmed,true);
  assert.deepEqual(paidOrder.design_json.transfers.sheets[0].layers[0],{source:1,x:0,y:0,width:3,height:3,crop});
  assert.match(transferMeasurementsCsv(paidOrder.design_json.transfers),/"1","1","fixture.png","3","3","0","0","print\/individual\/sheet-1\/graphic-1.png","print\/sheet-1.png"/);
  assert.match(transferMeasurementsCsv(paidOrder.design_json.transfers),/"2","1","fixture.png","3","3"/);
  console.log('PASS transfer uploads, storage, duplicate and unauthorized requests, mixed cart pricing, guest checkout, signed payment webhook, and paid order measurements with mocked Stripe.');
}
