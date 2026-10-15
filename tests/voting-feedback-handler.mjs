import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const owner=crypto.randomUUID(),ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];
let anonymous=false,missing=false,created,handler;
const designs=ids.map((id,i)=>({id,user_id:owner,name:'Design '+(i+1),product_id:'tshirt',preview_path:owner+'/designs/'+id+'/preview.png',design_json:{design:{zones:{Front:{background:'#FF0000',layers:[{type:'text',text:'Fixture',src:'private-image',image:'private'}]}}}}}));
const client={auth:{getUser:async token=>({data:{user:token==='fixture-token'?{id:owner,is_anonymous:anonymous}:null},error:null})},
 from(table){assert.equal(table,'customer_designs');let selection=ids;const query={select:()=>query,eq:()=>query,in:(_key,value)=>{selection=value;return query;},then(resolve){resolve({data:missing?[]:designs.filter(d=>selection.includes(d.id)),error:null});}};return query;},
 storage:{from:()=>({download:async()=>({data:new Blob(['fixture'],{type:'image/png'}),error:null})})},
 rpc:async(name,args)=>{assert.equal(name,'mqd_poll_create');created=args;return {data:'fixture-poll',error:null};}};
let source=fs.readFileSync(new URL('../supabase/functions/mqd-design-vote/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(source),{createClient:()=>client,Response,Request,Blob,Uint8Array,TextEncoder,crypto,btoa,console:{error(){}},Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://fixture.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'fixture-key':''},serve:fn=>handler=fn}});
async function request(designIds,token='fixture-token'){
  created=null;const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action:'create',designIds,title:'Fixture vote',closesAt:new Date(Date.now()+86400000).toISOString()})}));
  return {status:response.status,data:await response.json()};
}
assert.equal((await request([ids[0]])).status,200);assert.equal(created.p_options.length,2);
assert.deepEqual(JSON.parse(JSON.stringify(created.p_options.map(o=>o.label))),['Thumbs up','Thumbs down']);assert.equal(created.p_options[0].design_id,created.p_options[1].design_id);
assert(!JSON.stringify(created.p_options).includes('private-image'));
for(const count of [2,3]){assert.equal((await request(ids.slice(0,count))).status,200);assert.equal(created.p_options.length,count);assert.equal(new Set(created.p_options.map(o=>o.design_id)).size,count);}
for(const selected of [[],[ids[0],ids[0]],['invalid'],[...ids,crypto.randomUUID()]])assert.equal((await request(selected)).status,400);
assert.equal((await request([ids[0]],'wrong-token')).status,401);
anonymous=true;assert.equal((await request([ids[0]])).status,401);anonymous=false;
missing=true;assert.equal((await request([ids[0]])).status,400);
const tools=fs.readFileSync(new URL('../v20/vote-tools.js',import.meta.url),'utf8');
assert(tools.includes('ids.length<1||ids.length>3'));assert(tools.includes("formStatus.setAttribute('aria-live','polite')"));
assert(tools.includes("form.addEventListener('invalid'"));assert(tools.includes('formStatus,create'));
const page=fs.readFileSync(new URL('../v20/vote-page.js',import.meta.url),'utf8');assert(page.includes("result.poll.mode==='feedback'"));assert(page.includes('👍 Thumbs up'));assert(page.includes('👎 Thumbs down'));assert(page.includes('result.total'));
console.log('PASS: authenticated one-design thumbs options, unchanged 2/3 comparisons, unique IDs, owner/unavailable-design checks, private snapshot normalization and visible mobile validation.');
