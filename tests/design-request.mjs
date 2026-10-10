import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {validateDesignRequest} from '../v20/design-request-contract.js';

const base={name:'Test customer',email:'TEST@example.com',garment:'Short sleeve',quantity:5,brief:'Blue shirts with our business logo',page:'/index.html',requestId:'91d1df24-5f3a-4b19-85ae-84b85a73b266'};
assert.equal(validateDesignRequest(base).email,'test@example.com');
for(const quantity of [0,-1,1.5,10000,'five']) assert.throws(()=>validateDesignRequest({...base,quantity}));
assert.throws(()=>validateDesignRequest({...base,email:'bad-address'}));
assert.throws(()=>validateDesignRequest({...base,brief:'short'}));
assert.throws(()=>validateDesignRequest({...base,requestId:'invalid'}));
assert.equal(validateDesignRequest({...base,page:'https://other.example/'}).page,'/');
assert.equal(validateDesignRequest({...base,name:'a'.repeat(200)}).name.length,100);

// Exercise the real handler with isolated database and email doubles.
const source=fs.readFileSync(new URL('../supabase/functions/mqd-design-request/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export async function handler','async function handler').replace('Deno.serve(handler);','globalThis.handler=handler;');
let row=null,mailCalls=0,mailOk=true,budgetOk=true;
const db={rpc:async()=>({data:''}),from:()=>({
 upsert:async value=>{row??={...value,email_status:'pending'};return {error:null};},
 select:()=>({eq:()=>({single:async()=>({data:row,error:null})})}),
 update:value=>({eq:async()=>{Object.assign(row,value);return {error:null};}})
})};
const sandbox={Response,TextEncoder,TextDecoder,Uint8Array,AbortSignal,crypto:webcrypto,validateDesignRequest,createClient:()=>db,consumeBudget:async()=>{if(!budgetOk)throw Object.assign(new Error('budget exceeded'),{status:429});},Deno:{env:{get:key=>({SUPABASE_URL:'https://test.example',SUPABASE_SERVICE_ROLE_KEY:'test-only',MQD_RESEND_API_KEY:'test-only'}[key])}},fetch:async(url,options)=>{mailCalls++;assert.equal(JSON.parse(options.body).reply_to,'test@example.com');assert.equal(options.headers['Idempotency-Key'],'mqd-design-request/'+base.requestId);return new Response(JSON.stringify(mailOk?{id:'test-message'}:{error:'failed'}),{status:mailOk?200:503});}};
vm.runInNewContext(source,sandbox);
const request=(body=base,origin='https://mymerchnow.app',key='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4')=>new Request('https://test.example',{method:'POST',headers:{origin,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await sandbox.handler(request(base,'https://other.example'))).status,403);
assert.equal((await sandbox.handler(request(base,undefined,'invalid'))).status,401);
assert.equal((await sandbox.handler(request({...base,website:'bot'}))).status,400);
assert.equal((await sandbox.handler(request({...base,quantity:0}))).status,400);
assert.equal(mailCalls,0);
mailOk=false;
const failure=await sandbox.handler(request());
assert.equal(failure.status,502);assert.equal((await failure.json()).received,undefined);
assert.equal(row.email_status,'pending');
mailOk=true;
assert.equal((await (await sandbox.handler(request())).json()).received,true);
assert.equal(row.email_status,'sent');assert.equal(mailCalls,2);
assert.equal((await (await sandbox.handler(request())).json()).received,true);
assert.equal(mailCalls,2,'a repeated successful submission must not send another email');
assert.equal((await sandbox.handler(request({...base,quantity:6}))).status,409);
budgetOk=false;
assert.equal((await sandbox.handler(request())).status,429);
console.log('PASS: validation, sender checks, email failures, retry deduplication, and request limits.');
