import assert from 'node:assert/strict';
import {createSupportHandler,validateSupport,supportHash,SUPPORT_KEY,deliverSupportNotification} from '../supabase/functions/_shared/mqd-support-chat.js';
import {ownerChatTarget} from '../v20/support-chat-api.js';
const id='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222',token='a'.repeat(64);
let conversation=null,rows=[],notices=[],mail=[],budget=true,role='admin',aal='aal2',authValid=true,mailStatus=200;
class Query{
 constructor(table){this.table=table;this.filters=[];this.operation='select';}
 select(){return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}neq(k,v){this.filters.push(r=>r[k]!==v);return this;}gt(k,v){this.filters.push(r=>r[k]>v);return this;}limit(){return this;}order(){return this;}range(){return this;}
 maybeSingle(){this.single=true;return this;}update(value){this.operation='update';this.value=value;return this;}
 then(resolve,reject){const data=(this.table==='mqd_support_conversations'?(conversation?[conversation]:[]):this.table==='mqd_support_messages'?rows:notices).filter(r=>this.filters.every(f=>f(r)));if(this.operation==='update')data.forEach(r=>Object.assign(r,this.value));return Promise.resolve({data:this.single?data[0]||null:data,error:null}).then(resolve,reject);}
}
const db={from:table=>new Query(table),auth:{getUser:async()=>({data:{user:{app_metadata:{role}}},error:authValid?null:{}}),getClaims:async()=>({data:{claims:{aal}},error:authValid?null:{}})},rpc:async(name,args)=>{
 if(name==='mqd_consume_upload_budget')return {data:budget};
 if(name==='mqd_get_vault_secret')return {data:''};
 if(name==='mqd_support_claim'){const row=notices.find(n=>n.status==='pending'&&Date.parse(n.next_attempt_at||0)<=Date.now());if(!row)return {data:[]};row.status='sending';row.attempts++;return {data:[{...row}]};}
 if(name==='mqd_support_seen')return {data:null};
 if(name==='mqd_support_send'){
  conversation??={id:args.p_id,token_hash:args.p_hash,expires_at:new Date(Date.now()+86400000).toISOString(),customer_seen:0,owner_seen:0};
  const old=rows.find(m=>m.request_id===args.p_request);if(old)return old.body===args.p_body?{data:old}:{error:{message:'conflict'}};
  const m={seq:rows.length+1,request_id:args.p_request,conversation_id:args.p_id,sender:args.p_owner?'owner':'customer',body:args.p_body,created_at:new Date().toISOString()};rows.push(m);if(!args.p_owner)notices.push({message_seq:m.seq,conversation_id:args.p_id,status:'pending',attempts:0,next_attempt_at:new Date(0).toISOString()});return {data:m};
 }
 throw Error('Unexpected RPC '+name);
}};
const env=name=>name==='MQD_RESEND_API_KEY'?'synthetic-key':'';
const fetcher=async(url,options)=>{mail.push(options);return new Response(JSON.stringify({id:'synthetic-email'}),{status:mailStatus});};
const handler=createSupportHandler({createDb:()=>db,env,fetcher});
const call=(body,extra={})=>handler(new Request('https://example.invalid',{method:'POST',headers:{origin:'https://mymerchnow.app',apikey:SUPPORT_KEY,'Content-Type':'application/json','x-mqd-chat-token':token,...extra},body:JSON.stringify(body)}));
const create={action:'create',id,requestId,message:'Synthetic <img src=x onerror=alert(1)> test'};
for(const message of ['', 'a'.repeat(2001),'bad\u0000'])assert.throws(()=>validateSupport({...create,message}));
assert.equal(ownerChatTarget('https://evil.example'), '');assert.equal(ownerChatTarget(id),'/owner-chat.html?chat='+id);
assert.equal((await call(create,{origin:'https://evil.example'})).status,403);
assert.equal((await call(create,{apikey:'wrong'})).status,401);
assert.equal((await call(create,{'x-mqd-chat-token':'guess'})).status,404);
assert.equal((await call({...create,message:'a'.repeat(13000)})).status,413);
assert.equal((await call({action:'list'})).status,403);
assert.equal((await call(create)).status,200);assert.equal(rows.length,1);assert.equal(mail.length,1);
assert.equal((await call(create)).status,200);assert.equal(rows.length,1);assert.equal(mail.length,1);
assert.equal((await call({...create,message:'different'})).status,409);
assert.equal((await call({action:'read',id},{'x-mqd-chat-token':'b'.repeat(64)})).status,404);
assert.equal((await call({action:'read',id:'33333333-3333-4333-8333-333333333333'})).status,404);
for(const action of ['read','send','seen','retry','list']){
 const body={...create,action,seq:1};role='customer';assert.equal((await call(body,{authorization:'Bearer synthetic'})).status,403);
 role='admin';aal='aal1';assert.equal((await call(body,{authorization:'Bearer synthetic'})).status,403);
}
aal='aal2';authValid=false;assert.equal((await call({action:'list'},{authorization:'Bearer synthetic'})).status,403);authValid=true;
assert.equal((await call({action:'list'},{authorization:'Bearer synthetic'})).status,200);
const reply={action:'send',id,requestId:'33333333-3333-4333-8333-333333333333',message:'Synthetic owner reply'};
assert.equal((await call(reply,{authorization:'Bearer synthetic'})).status,200);
assert.equal((await (await call({action:'read',id})).json()).messages.at(-1).body,reply.message);assert.equal(mail.length,1);
budget=false;assert.equal((await call({...create,requestId:crypto.randomUUID()})).status,429);budget=true;
mailStatus=503;const retry={...create,action:'send',requestId:crypto.randomUUID(),message:'Retry synthetic'};
assert.equal((await (await call(retry)).json()).saved,true);assert.equal(notices.at(-1).status,'pending');
const key=mail.at(-1).headers['Idempotency-Key'];notices.at(-1).next_attempt_at=new Date(0).toISOString();mailStatus=200;
await deliverSupportNotification(db,id,{env,fetcher});assert.equal(mail.at(-1).headers['Idempotency-Key'],key);assert.equal(notices.at(-1).status,'sent');
for(const options of mail){const body=JSON.parse(options.body);assert.deepEqual(body.to,['mqdrva@gmail.com']);assert.ok(body.text.includes('/owner/?chat='+id));assert.ok(!body.text.includes(token));assert.ok(!body.text.includes('Synthetic'));assert.ok(!body.reply_to);}
assert.equal(await supportHash(token),conversation.token_hash);
console.log('PASS support API: customer isolation, owner/admin/MFA rejection, input limits, unread read path, idempotency, throttling, privacy-minimal email and failed-email retry.');
