import assert from 'node:assert/strict';
import {createTryOnPilot,quotaFor} from '../supabase/functions/_shared/mqd-tryon-pilot.js';

assert.equal(quotaFor({plan:'basic',images:{available:14,subscription:1000}}).canGenerate,false);
assert.equal(quotaFor({plan:'basic',images:{available:15,subscription:1000}}).units,5);
assert.equal(quotaFor({plan:'plus',images:{available:3,subscription:100}}).units,1);
assert.equal(quotaFor({plan:'unknown',images:{available:100,subscription:100}}),null);
assert.equal(quotaFor({plan:'basic',images:{available:100,subscription:0}}),null);
const code='x'.repeat(40), calls=[], reservations=[];
let allowance=100,allow=true,editStatus=200,dailyAllow=true;
const db={
  auth:{getUser:async token=>({data:{user:token==='valid-session'?{id:'verified-customer'}:null}})},
  from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{used:0}})})})}),
  rpc:async name=>{reservations.push(name);return {data:name==='mqd_reserve_customer_tryon'?dailyAllow:name.includes('reserve')?allow:true};}
};
const handler=createTryOnPilot({pilotHash:code,expiresAt:'2099-01-01',providerKey:'private-test-key',hash:async x=>x,db,
  fetcher:async (url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/account'))return Response.json({plan:'basic',images:{available:allowance,subscription:1000}});
    return new Response(editStatus===200?new Uint8Array([1,2,3]):'provider secret detail',{status:editStatus,headers:{'Content-Type':'image/png'}});
  }});
function request(generate=false,ticket=code){
  const headers={'Origin':'http://127.0.0.1:8786','x-mqd-preview-code':ticket,'Authorization':'Bearer valid-session'};
  if(!generate)return new Request('https://test/',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({action:'status'})});
  const body=new FormData();body.set('action','generate');body.set('person',new File(['person'],'person.png',{type:'image/png'}));body.set('garment',new File(['garment'],'garment.png',{type:'image/png'}));
  return new Request('https://test/',{method:'POST',headers,body});
}
assert.equal((await handler(request(false,'bad'))).status,401);
assert.equal(calls.length,0,'unauthorized request must not reach provider');
allowance=0;
assert.equal((await handler(request(true))).status,503);
assert.equal(reservations.length,0,'no reservation or generation without existing allowance');
allowance=100;allow=false;
assert.equal((await handler(request(true))).status,429);
assert.equal(calls.filter(x=>x.url.endsWith('/edit')).length,0);
allow=true;
assert.equal((await handler(request(true))).status,200);
let edits=calls.filter(x=>x.url.endsWith('/edit'));
assert.equal(edits.length,1);
assert.equal(edits[0].options.body.get('virtualModel.pose'),'standing');
assert.match(edits[0].options.body.get('virtualModel.prompt'),/Replace only the existing upper-body clothing/);
assert.match(edits[0].options.body.get('virtualModel.prompt'),/crop and framing/);
assert.ok(edits[0].options.body.get('virtualModel.model.custom.imageFile') instanceof File);
assert.ok(edits[0].options.body.get('imageFile') instanceof File);
assert.equal(reservations.at(-1),'mqd_release_tryon_pilot');
editStatus=402;
const rejected=await handler(request(true));
assert.equal(rejected.status,503);
assert.ok(!(await rejected.text()).includes('provider secret detail'));
assert.equal(calls.filter(x=>x.url.endsWith('/edit')).length,2,'provider failure must not retry');
dailyAllow=false;
assert.equal((await handler(request(true))).status,429);
assert.equal(calls.filter(x=>x.url.endsWith('/edit')).length,2,'daily limit must prevent billable call');
const missingAuth=request(true);missingAuth.headers.delete('authorization');
assert.equal((await handler(missingAuth)).status,401);
const invalidAuth=request(true);invalidAuth.headers.set('authorization','Bearer invalid');
assert.equal((await handler(invalidAuth)).status,401);
console.log('PASS: existing allowance, private access, pilot limit, image handoff and no automatic retries.');
