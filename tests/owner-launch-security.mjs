import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {hasAdminMfa} from '../supabase/functions/_shared/mqd-admin-security.js';
import {boundedFormData,consumeBudget,UploadError} from '../supabase/functions/_shared/mqd-upload-guard.js';
function load(name,client){
  let handler;
  const source=readFileSync(`supabase/functions/${name}/index.ts`,'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  new Function('Deno','createClient','hasAdminMfa','boundedFormData','consumeBudget','UploadError',stripTypeScriptTypes(source))({serve:fn=>handler=fn,env:{get:()=> 'test'}},()=>client,hasAdminMfa,boundedFormData,consumeBudget,UploadError);
  return handler;
}
const id='11111111-1111-4111-8111-111111111111';
let role='admin',aal='aal1',claimsError=null,storageCalls=0,uploaded=0,budget={data:true,error:null};
const client={auth:{getUser:async()=>({data:{user:{id,app_metadata:{role}}},error:null}),getClaims:async()=>({data:{claims:{aal}},error:claimsError})},rpc:async()=>budget,storage:{from(bucket){storageCalls++;return {list:async()=>({data:[{id:'file',name:'test.png',metadata:{size:8},updated_at:'now'},{id:null,name:'nested'}],error:null}),createSignedUrls:async paths=>({data:paths.map(path=>({path,signedUrl:'https://example.test/file'})),error:null}),upload:async()=>{uploaded++;return{error:null}}};}}};
const request=body=>new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)});
for(const name of ['mqd-owner-orders','mqd-library-admin']){
  const handler=load(name,client);
  assert.equal((await handler(new Request('https://example.test',{method:'POST'}))).status,401);
  role='customer';aal='aal2';assert.equal((await handler(request({}))).status,403);
  role='admin';aal='aal1';assert.equal((await handler(request({}))).status,403);
  aal='aal2';claimsError={message:'Invalid token'};assert.equal((await handler(request({}))).status,403);claimsError=null;
}
assert.equal(storageCalls,0);
const owner=load('mqd-owner-orders',client);
assert.equal((await owner(request({action:'backup-list',bucket:'not-approved'}))).status,400);
assert.equal((await owner(request({action:'backup-list',bucket:'garments',prefix:'../other'}))).status,400);
const backup=await owner(request({action:'backup-list',bucket:'garments'}));assert.equal(backup.status,200);
const listing=await backup.json();assert.equal(listing.files.length,1);assert.deepEqual(listing.folders,['nested']);assert.equal(listing.nextOffset,null);
const save=load('mqd-save-artwork',client);
async function upload(path=id+'/designs/'+id+'/preview.png',bytes=new Uint8Array([137,80,78,71,13,10,26,10]),type='image/png'){
  const form=new FormData();form.append('path',path);form.append('file',new Blob([bytes],{type}),'preview.png');
  return save(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer test'},body:form}));
}
assert.equal((await upload()).status,200);assert.equal(uploaded,1);
assert.equal((await upload('another-user/designs/'+id+'/preview.png')).status,400);
assert.equal((await upload(id+'/designs/'+id+'/../preview.png')).status,400);
assert.equal((await upload(undefined,new TextEncoder().encode('<script>bad</script>'))).status,400);
assert.equal((await upload(undefined,new Uint8Array(20*1024*1024+1))).status,413);
budget={data:false,error:null};assert.equal((await upload()).status,429);
budget={data:null,error:{message:'offline'}};assert.equal((await upload()).status,503);
assert.equal(uploaded,1);
console.log('PASS: admin/MFA denial, backup scope, owned upload path, image validation, size limits and fail-closed budgets.');
