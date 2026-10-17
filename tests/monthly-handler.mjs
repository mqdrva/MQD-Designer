import assert from 'node:assert/strict';
import {monthlyAction} from '../supabase/functions/mqd-design-contest/monthly.ts';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const user={id,email:'entrant@example.invalid',email_confirmed_at:'2026-01-01',app_metadata:{}};
const json=(body,status=200)=>({body,status});
function database(person=user,aal='aal1'){
 const calls=[];const db={calls,design:{id:other,preview_path:id+'/designs/image.png',design_json:{trusted:'saved design'}},
  auth:{getUser:async()=>({data:{user:person},error:person?null:Error('bad token')}),getClaims:async()=>({data:{claims:{aal}},error:null})},
  storage:{from:()=>({download:async()=>({data:new Blob(['png'],{type:'image/png'}),error:null})})},
  rpc:async(name,args)=>{calls.push({rpc:name,args});return {data:other,error:null}},
  from(table){const q={select(cols){calls.push({table,cols});return q},eq(k,v){calls.push({eq:k,value:v});return q},neq(){return q},order(){return q},limit:async()=>({data:[],error:null}),maybeSingle:async()=>({data:db.design,error:null})};return q;}
 };return db;
}
const req=new Request('https://example.invalid',{headers:{authorization:'Bearer test-token'}});
assert.equal((await monthlyAction(req,{action:'monthly_submit'},database(null),json)).status,401);
assert.equal((await monthlyAction(req,{action:'monthly_queue'},database(),json)).status,403);
assert.equal((await monthlyAction(req,{action:'monthly_queue'},database({...user,app_metadata:{role:'admin'}}),json)).status,403);
assert.equal((await monthlyAction(req,{action:'monthly_submit'},database({...user,is_anonymous:true}),json)).status,401);
assert.equal((await monthlyAction(req,{action:'monthly_submit'},database({...user,email_confirmed_at:null}),json)).status,401);
const db=database();await monthlyAction(req,{action:'monthly_designs'},db,json);
assert(db.calls.some(c=>c.eq==='user_id'&&c.value===id));assert(db.calls.some(c=>c.eq==='product_id'&&c.value==='tshirt'));
const submission={action:'monthly_submit',contestId:id,designId:other,label:'My design',consent:true,email:'attacker@example.invalid',snapshot:{attacker:true}};
await monthlyAction(req,submission,db,json);
const call=db.calls.find(c=>c.rpc==='mqd_monthly_submit');assert.equal(call.args.p_user,id);assert.equal(call.args.p_email,user.email);assert.deepEqual(call.args.p_snapshot,{trusted:'saved design'});
const missing=database();missing.design=null;await assert.rejects(monthlyAction(req,submission,missing,json),/your saved/);
await assert.rejects(monthlyAction(req,{...submission,consent:false},database(),json),/permission/);
const mine=database();await monthlyAction(req,{action:'monthly_mine'},mine,json);assert(mine.calls.some(c=>c.eq==='user_id'&&c.value===id));assert(!mine.calls.find(c=>c.cols)?.cols.includes('design_snapshot'));
assert.equal(await monthlyAction(req,{action:'vote'},database(),json),null);
console.log('Handler checks passed: verified sign-in, owner MFA, own-design isolation, consent, trusted contact/snapshot, private mine response.');
