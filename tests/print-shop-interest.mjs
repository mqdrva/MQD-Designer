import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {validateInterest,receiveInterest} from '../supabase/functions/mqd-print-shop-setup/interest.js';
const contact={name:'  Brenda  ',email:'BRENDA@example.com',shopName:'Brenda’s Designs',phone:''};
const input=()=>({action:'interest',requestId:crypto.randomUUID(),contact:structuredClone(contact),website:'',startedAt:Date.now()-3000});
assert.equal(validateInterest(input()).email,'brenda@example.com');
assert.equal(validateInterest(input()).phone,'');
for(const field of ['name','email','shopName']){const body=input();body.contact[field]=' ';assert.throws(()=>validateInterest(body));}
for(const bad of ['a@b','\nadmin@example.com','x'.repeat(255)+'@example.com']){const body=input();body.contact.email=bad;assert.throws(()=>validateInterest(body));}
for(const change of [{website:'bot'},{startedAt:Date.now()},{startedAt:Date.now()-86400001},{requestId:'x'}])assert.throws(()=>validateInterest({...input(),...change}));
assert.throws(()=>validateInterest({...input(),contact:{...contact,phone:'123'}}),/phone/);
const rows=new Map(),mailCalls=[];let failMail=false,dbFailure=false;
const db={rpc:async(name,{p_row})=>{
 assert.equal(name,'mqd_claim_print_shop_interest');if(dbFailure)return {error:{message:'database unavailable'}};
 const prior=rows.get(p_row.id);if(prior)return prior.payload_hash===p_row.payload_hash?{data:[structuredClone(prior)]}:{error:{message:'Submission content changed'}};
 const row={...p_row,admin_email_sent:false};rows.set(row.id,row);return {data:[structuredClone(row)]};
},from:table=>({update:change=>({eq:async(key,id)=>{assert.equal(table,'mqd_print_shop_interest');assert.equal(key,'id');Object.assign(rows.get(id),change);return {error:null};}})})};
const req=new Request('https://example.test',{headers:{'x-forwarded-for':'192.0.2.1'}});
const hash=async value=>createHash('sha256').update(value).digest('hex');
const mail=async(_db,payload,key)=>{if(failMail)throw Error('provider unavailable');mailCalls.push({payload,key});};
const submit=body=>receiveInterest({body,req,db,hash,mail,ipSecret:'private-test-salt'});
const body=input();let result=await submit(body);assert.equal(result.status,'received');assert(result.notificationAccepted);assert.match(result.reference,/^PILOT-[A-F0-9]{12}$/);assert.equal(mailCalls.length,1);assert.deepEqual(mailCalls[0].payload.to,['mqdrva@gmail.com']);assert.equal(mailCalls[0].payload.reply_to,'brenda@example.com');assert.match(mailCalls[0].payload.text,/No shop activated/);assert(!JSON.stringify(result).includes('brenda@example.com'));assert(!rows.get(body.requestId).ip_hash.includes('192.0.2.1'));
await submit(body);assert.equal(mailCalls.length,1,'a retried request must not resend an accepted notification');
await assert.rejects(()=>submit({...body,contact:{...contact,shopName:'Changed'}}),/could not be saved/);
failMail=true;const retry=input();result=await submit(retry);assert.equal(result.status,'received');assert.equal(result.notificationAccepted,false);assert(rows.has(retry.requestId));
failMail=false;result=await submit(retry);assert(result.notificationAccepted);assert.equal(mailCalls.length,2);
dbFailure=true;await assert.rejects(()=>submit(input()),/could not be saved/);assert.equal(mailCalls.length,2);dbFailure=false;
// Exercise routing/origin/application-key boundaries through the existing handler.
let handler;let source=await readFile(new URL('../supabase/functions/mqd-print-shop-setup/index.ts',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{receiveInterest,createClient:()=>db,crypto,btoa,atob,TextEncoder,TextDecoder,Uint8Array,Response,Request,AbortSignal,setTimeout,Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'test-private-salt':name==='MQD_RESEND_API_KEY'?'test-provider-key':'test'},serve:fn=>{handler=fn;}},fetch:async()=>{throw Error('provider unavailable');}});
const call=async(origin,key,body)=>{const response=await handler(new Request('https://example.test',{method:'POST',headers:{origin,apikey:key,'content-type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};};
const key='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
assert.equal((await call('https://wrong.example',key,input())).status,403);
assert.equal((await call('https://mymerchnow.app','invalid',input())).status,401);
const saved=input();failMail=true;const accepted=await call('https://mymerchnow.app',key,saved);assert.equal(accepted.status,200);assert.equal(accepted.body.notificationAccepted,false);assert(rows.has(saved.requestId));
assert.equal((await call('https://mymerchnow.app',key,{...input(),contact:{...contact,email:'bad'}})).status,400);
const sql=await readFile(new URL('../supabase/migrations/20261118210000_print_shop_interest.sql',import.meta.url),'utf8');assert.match(sql,/enable row level security/);assert.match(sql,/revoke all on function[\s\S]*from public,anon,authenticated/);
console.log('PASS pilot requests: three required fields, optional phone, validation, durable save, notification failure/retry, idempotency, no automatic activation/billing, origin and application-key boundaries. SQL execution requires the release migration.');
