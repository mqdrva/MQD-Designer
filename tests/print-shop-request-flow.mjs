import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import JSZip from 'jszip';
import {fixture,packageFor,key,businessId} from './print-shop-design-fixture.mjs';
import {hasShopAccess} from '../supabase/functions/mqd-print-shop-pilot/access.js';
import {sharedShopDesign,savedShopAppearance} from '../supabase/functions/mqd-print-shop-designs/service.js';
import * as contract from '../supabase/functions/mqd-print-shop-pilot/contract.js';
import {deliverRequest,requestEmails,sendRequestEmail} from '../supabase/functions/mqd-print-shop-pilot/delivery.js';
const source=(await fs.readFile(new URL('../supabase/functions/mqd-print-shop-pilot/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
for(const engine of ['2d','3d']){
 const env=fixture(),rows=new Map(),messages=[];
 const business=env.businesses.get(businessId),productId=engine==='2d'?'everyday-tshirt':'tshirt';
 business.shop_config.garments={[productId]:{materials:['Performance fabric','Cotton blend'],colors:['Red','White'],sizes:['L'],brand:'Synthetic',style:'Fixture'}};
 const db={...env.db,from:table=>{
   if(table!=='mqd_print_shop_requests')return env.db.from(table);
   return {update:change=>({eq:async(_,id)=>{Object.assign(rows.get(id),change);return {};}})};
 },rpc:async(name,args)=>{
   assert.equal(name,'mqd_claim_print_shop_request');
   const prior=rows.get(args.p_id);
   if(prior)return prior.payload_hash===args.p_hash?{data:[structuredClone(prior)]}:{error:{message:'content changed'}};
   const row={id:args.p_id,shop_slug:args.p_shop,payload_hash:args.p_hash,reference:'SHOP-SYNTHETIC',status:'pending',customer_receipt_status:'pending',created_at:new Date().toISOString()};rows.set(row.id,row);return {data:[structuredClone(row)]};
 }};
 let handler,failReceipt=true;
 const send=options=>sendRequestEmail({...options,sleep:async()=>{},fetchImpl:async(_url,options)=>{
   const body=JSON.parse(options.body);if(body.to[0]==='customer@example.com'&&failReceipt)return new Response('{}',{status:503});
   messages.push({body,key:options.headers['Idempotency-Key']});return new Response(JSON.stringify({id:'provider-'+messages.length}),{status:200});
 }});
 vm.runInNewContext(stripTypeScriptTypes(source),{...contract,createClient:()=>db,hasShopAccess,sharedShopDesign,savedShopAppearance,requestEmails,deliverRequest:options=>deliverRequest({...options,send}),JSZip,crypto,TextEncoder,Uint8Array,File,Request,Response,btoa,atob,URL,console,Deno:{env:{get:()=> 'synthetic-private-key'},serve:h=>handler=h}});
 const p=await packageFor(engine),zip=await JSZip.loadAsync(p.bytes),order={...p.order,material:'Performance fabric',materialRequest:''};
 zip.file('order-request.json',JSON.stringify(order));const bytes=await zip.generateAsync({type:'uint8array'});
 const original=await zip.file('originals/front-logo.png').async('uint8array');
 const payload={shop:business.preferred_slug,requestId:crypto.randomUUID(),summary:order,customer:{name:'Synthetic Customer',email:'customer@example.com',phone:'2025550101',notes:'Please quote this'},website:'',startedAt:Date.now()-5000};
 async function call(value=payload,file=bytes){const form=new FormData();form.append('payload',JSON.stringify(value));form.append('package',new Blob([file]),'design.zip');const res=await handler(new Request('https://example.test/request',{method:'POST',headers:{apikey:key,Origin:'http://127.0.0.1:8765'},body:form}));return {status:res.status,result:await res.json()};}
 let result=await call();assert.equal(result.status,200,JSON.stringify(result));assert.equal(result.result.customerReceipt,'failed');assert.equal(messages.length,1,'shop acceptance survives receipt failure');
 const delivered=await JSZip.loadAsync(Buffer.from(messages[0].body.attachments[0].content,'base64'));
 assert.deepEqual(await delivered.file('originals/front-logo.png').async('uint8array'),original,'original artwork bytes survive unchanged');
 assert.equal(JSON.parse(await delivered.file('order-request.json').async('string')).material,'Performance fabric');
 failReceipt=false;result=await call();assert.equal(result.status,200);assert.equal(result.result.customerReceipt,'sent');assert.equal(messages.length,2);
 assert.equal(messages[1].body.to[0],'customer@example.com');assert(!messages[1].body.attachments);assert.match(messages[1].body.text,/Performance fabric/);
 await call();assert.equal(messages.length,2,'same request does not repeat either email');
 for(const summary of [{...order,material:'Silk'},{...order,material:'Cotton blend'},{...order,material:''}]){
   const invalid=await call({...payload,requestId:crypto.randomUUID(),summary});assert.equal(invalid.status,400,JSON.stringify(invalid));
 }
 assert.equal(messages.length,2,'tampered materials never trigger mail');
}
console.log('PASS actual 2D/3D request endpoint: material enforcement, matching ZIP, unchanged originals, shop and customer mail, receipt-only retry, no charges or real messages.');
