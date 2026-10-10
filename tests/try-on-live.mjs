import assert from 'node:assert/strict';
import {createTryOnPilot} from '../supabase/functions/_shared/mqd-tryon-pilot.js';
let used=false,units=100,creditAllowed=true,dailyAllowed=true,authValid=true,anonymous=false;
const calls=[],rpcCalls=[];
const db={auth:{getUser:async()=>({data:{user:authValid?{id:'verified-id',is_anonymous:anonymous}:null}})},
 from:()=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:used?{customer_id:'verified-id'}:null})};return chain;},
 rpc:async(name,args)=>{rpcCalls.push({name,args});return {data:name==='mqd_reserve_tryon_credits'?creditAllowed:name==='mqd_reserve_customer_tryon'?dailyAllowed:true};}};
const handler=createTryOnPilot({production:true,privateTestDailyOverride:true,db,providerKey:'test-only',fetcher:async(url,options)=>{
 calls.push({url,options});return url.endsWith('/account')?Response.json({plan:'basic',images:{available:units,subscription:1000}}):new Response(new Uint8Array([1]),{headers:{'Content-Type':'image/png'}});
}});
function req(generate=false,auth=true){const headers={Origin:'https://mymerchnow.app',...(auth?{Authorization:'Bearer session'}:{})};let body;if(generate){body=new FormData();body.set('action','generate');for(const key of ['person','garment'])body.set(key,new File(['a'],'a.png',{type:'image/png'}));}else{headers['Content-Type']='application/json';body=JSON.stringify({action:'status'});}return new Request('https://test',{method:'POST',headers,body});}
assert.equal((await handler(req(false,false))).status,401);
assert.equal(calls.length,0);
authValid=false;assert.equal((await handler(req())).status,401);authValid=true;
anonymous=true;assert.equal((await handler(req())).status,401);anonymous=false;
assert.deepEqual(await (await handler(req())).json(),{ready:true,remaining:1});
used=true;assert.equal((await handler(req(true))).status,429);used=false;
units=0;assert.equal((await handler(req(true))).status,503);units=100;
creditAllowed=false;assert.equal((await handler(req(true))).status,429);creditAllowed=true;
dailyAllowed=false;assert.equal((await handler(req(true))).status,429);
assert.equal(calls.filter(x=>x.url.endsWith('/edit')).length,0,'no billable request on rejected daily or budget limits');
dailyAllowed=true;assert.equal((await handler(req(true))).status,200);
assert.equal(calls.filter(x=>x.url.endsWith('/edit')).length,1);
assert.equal(rpcCalls.at(-1).name,'mqd_release_tryon_credits');
assert.equal(rpcCalls.find(x=>x.name==='mqd_reserve_customer_tryon').args.p_customer_id,'verified-id');
assert.ok(!rpcCalls.some(x=>x.name==='mqd_reserve_tryon_pilot'),'live users must not use private pilot quota');
console.log('PASS: live authenticated account, guest rejection, shared daily limit, prepaid budget and no private override.');
