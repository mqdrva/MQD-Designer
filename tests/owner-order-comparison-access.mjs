import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {classifyOwnerOrder} from '../supabase/functions/_shared/mqd-owner-work-queue.js';
const source=fs.readFileSync(new URL('../supabase/functions/mqd-owner-orders/index.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
let handler,role='customer',mfa=false,reads=0,writes=0,existing;
const from=()=>{let changed=null;const query={select(){return query;},eq(){return query;},update(value){writes++;changed=value;return query;},maybeSingle:async()=>({data:changed?{...existing,...changed}:existing,error:null})};return query;};
const context={Request,Response,console,Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://example.supabase.co':key==='SUPABASE_SERVICE_ROLE_KEY'?'test-only':undefined},serve:fn=>handler=fn},
 createClient:()=>({from,auth:{getUser:async()=>({data:{user:{app_metadata:{role}}},error:null})}}),hasAdminMfa:async()=>mfa,classifyOwnerOrder,
 ownerOrderComparison:async()=>{reads++;return{status:'unknown',label:'Review needed'};}};
vm.runInNewContext(stripTypeScriptTypes(source),context);
const request=token=>new Request('https://example.supabase.co/functions/v1/mqd-owner-orders',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer test-only'}:{})},body:JSON.stringify({action:'compare',id:'92610252-91a8-47d6-9db0-07c49753983f'})});
assert.equal((await handler(request(false))).status,401);assert.equal(reads,0);
assert.equal((await handler(request(true))).status,403);assert.equal(reads,0);
role='admin';assert.equal((await handler(request(true))).status,403);assert.equal(reads,0);
mfa=true;const allowed=await handler(request(true));assert.equal(allowed.status,200);assert.equal(reads,1);assert.equal(allowed.headers.get('Cache-Control'),'private, no-store');
const update=()=>new Request('https://example.supabase.co/functions/v1/mqd-owner-orders',{method:'POST',headers:{Authorization:'Bearer test-only','Content-Type':'application/json'},body:JSON.stringify({action:'update',id:'92610252-91a8-47d6-9db0-07c49753983f',status:'production'})});
existing={id:'92610252-91a8-47d6-9db0-07c49753983f',status:'submitted',is_test:false,stripe_payment_status:null,paid_at:null,amount_paid:null};
assert.equal((await handler(update())).status,409);assert.equal(writes,0);
existing={...existing,status:'paid',stripe_payment_status:'paid',paid_at:'2026-10-14T00:00:00Z',amount_paid:144};
assert.equal((await handler(update())).status,200);assert.equal(writes,1);
existing={...existing,stripe_payment_status:'refunded'};assert.equal((await handler(update())).status,409);assert.equal(writes,1);
existing={...existing,is_test:true};assert.equal((await handler(update())).status,409);assert.equal(writes,1);
console.log('PASS actual comparison route: anonymous/customer/owner without MFA cannot read comparison; owner with MFA can; private no-store response.');
