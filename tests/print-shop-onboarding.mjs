import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {validateSetup} from '../supabase/functions/mqd-print-shop-setup/validation.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url)));
const packet=validateSetup(fixture);
assert.equal(packet.shop.pilot,false);
assert.equal(packet.owner.requestEmail,'brenda@example.com');
assert.throws(()=>validateSetup({...fixture,owner:{...fixture.owner,phone:''}}),/phone/);
const bad=structuredClone(fixture);bad.shop.garments['everyday-tshirt'].printZones.front.width=20;assert.throws(()=>validateSetup(bad));
const rows=new Map(),emails=[];let failMail=false,handler;
const db={auth:{getUser:async jwt=>({data:{user:jwt==='admin-mfa'?{email:'brenda@example.com',email_confirmed_at:'confirmed',app_metadata:{role:'admin'}}:jwt==='admin-low'?{email:'brenda@example.com',email_confirmed_at:'confirmed',app_metadata:{role:'admin'}}:jwt==='shop-owner'?{email:'brenda@example.com',email_confirmed_at:'confirmed',app_metadata:{}}:jwt==='wrong-shop'?{email:'another@example.com',email_confirmed_at:'confirmed'}:jwt==='unverified'?{email:'brenda@example.com'}:null},error:!['admin-mfa','shop-owner','wrong-shop','unverified','admin-low'].includes(jwt)}),getClaims:async()=>({data:{claims:{aal:'aal2'}}})},rpc:async(name,{p_row})=>{
 if(name==='mqd_get_vault_secret')return {data:'mock-email-key'};
 const prior=rows.get(p_row.id);if(prior)return prior.payload_hash===p_row.payload_hash?{data:[structuredClone(prior)]}:{error:{message:'Submission content changed'}};
 const row={...p_row,status:'pending_review',billing_status:'not_configured',revision:1,token_expires_at:new Date(Date.now()+30*86400000).toISOString(),owner_email_sent:false,admin_email_sent:false};rows.set(row.id,row);return {data:[structuredClone(row)]};
},from:()=>{let filters=[],change=null;const q={select:()=>q,eq:(key,value)=>{filters.push([key,value]);return q;},order:()=>q,limit:async()=>({data:[...rows.values()].map(r=>structuredClone(r))}),update:value=>{change=value;return q;},single:async()=>finish(),maybeSingle:async()=>finish(),then:(resolve,reject)=>Promise.resolve(finish()).then(resolve,reject)};function finish(){const row=[...rows.values()].find(r=>filters.every(([k,v])=>r[k]===v));if(!row)return {data:null,error:{message:'not found'}};if(change)Object.assign(row,change);return {data:structuredClone(row)};}return q;}};
let source=await fs.readFile(new URL('../supabase/functions/mqd-print-shop-setup/index.ts',import.meta.url),'utf8');source=source.replace(/^import .*;\n/gm,'');
const context={structuredClone,createClient:()=>db,validateSetup,hasAdminMfa:async(_db,jwt)=>jwt==='admin-mfa',crypto:globalThis.crypto,btoa,atob,TextEncoder,TextDecoder,Uint8Array,Response,Request,AbortSignal,setTimeout,Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'mock-private-service-key':'mock'},serve:h=>{handler=h;}},fetch:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');if(failMail)return new Response('{}',{status:422});emails.push(JSON.parse(options.body));return new Response('{"id":"mock-provider-id"}',{status:200});}};
vm.runInNewContext(stripTypeScriptTypes(source),context);
const key='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
async function call(body,jwt){const res=await handler(new Request('https://example.test',{method:'POST',headers:{apikey:key,'Content-Type':'application/json',Origin:'http://127.0.0.1:8765',...(jwt?{Authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}));return {status:res.status,data:await res.json()};}
const id=crypto.randomUUID(),submit={action:'submit',requestId:id,setup:fixture,website:'',startedAt:Date.now()-3000};
let res=await call(submit);assert.equal(res.status,200);assert.equal(emails.length,2);assert(!JSON.stringify(res).includes('manage='));
await call(submit);assert.equal(emails.length,2,'duplicate submission must not resend emails');
res=await call({action:'admin-list'});assert.equal(res.status,403);
res=await call({action:'load',id,token:'f'.repeat(64)});assert.equal(res.status,401);
res=await call({action:'admin-review',id,revision:1,decision:'approve-pilot'},'admin-mfa');assert.equal(res.status,409,'confirmation is required');
const token=emails[0].text.match(/#manage=([a-f0-9]{64})/)[1];
res=await call({action:'load',id,token});assert.equal(res.status,200);assert.equal(res.data.emailVerified,true);
res=await call({action:'admin-review',id,revision:1,decision:'approve-pilot'},'admin-mfa');assert.equal(res.status,200);assert.equal(rows.get(id).status,'pilot_active');
const updated=structuredClone(fixture);updated.shop.name='Updated business';failMail=true;
res=await call({action:'update',id,token,revision:2,setup:updated});assert.equal(res.status,200);assert.equal(res.data.notificationAccepted,false);assert.equal(rows.get(id).shop_config.name,'Updated business');assert.equal(rows.get(id).pending_config,null);assert.equal(res.data.liveSettingsUpdated,true);
res=await call({action:'update',id,token,revision:2,setup:updated});assert.equal(res.status,409,'stale updates must not overwrite');
res=await call({action:'admin-review',id,revision:3,decision:'approve-pilot'},'admin-mfa');assert.equal(res.status,200);assert.equal(res.data.notificationAccepted,false);assert.equal(rows.get(id).shop_config.name,'Updated business');
rows.get(id).status='active';rows.get(id).billing_status='active';
const paidUpdate=structuredClone(updated);paidUpdate.shop.name='Paid business update';
res=await call({action:'update',id,token,revision:4,setup:paidUpdate});assert.equal(res.status,200);
rows.get(id).pending_config=structuredClone(rows.get(id).shop_config); // Retain coverage of legacy staged administrative review.
res=await call({action:'admin-review',id,revision:5,decision:'approve-settings'},'admin-mfa');assert.equal(res.status,200);assert.equal(rows.get(id).status,'active');assert.equal(rows.get(id).billing_status,'active');assert.equal(rows.get(id).shop_config.name,'Paid business update');assert.equal(rows.get(id).pending_config,null);
res=await call({action:'admin-review',id,revision:6,decision:'approve-pilot'},'admin-mfa');assert.equal(res.status,409,'paid settings cannot reset the unpaid pilot');
res=await call({action:'admin-review',id,revision:6,decision:'suspend'},'admin-mfa');assert.equal(res.status,200);assert.equal(rows.get(id).status,'suspended');
failMail=false;rows.get(id).token_expires_at=new Date(Date.now()-1000).toISOString();
res=await call({action:'admin-recover',id,revision:7});assert.equal(res.status,403,'recovery requires administrator MFA');
res=await call({action:'admin-recover',id,revision:7},'admin-mfa');assert.equal(res.status,200);assert(!JSON.stringify(res).includes('manage='),'private token is delivered only by email');assert.equal(emails.at(-1).to[0],fixture.owner.requestEmail);
const recoveredToken=emails.at(-1).text.match(/#manage=([a-f0-9]{64})/)[1];assert.notEqual(recoveredToken,token);assert(new Date(rows.get(id).token_expires_at).getTime()>Date.now());
res=await call({action:'load',id,token});assert.equal(res.status,401,'expired owner link stays revoked after recovery');
res=await call({action:'load',id,token:recoveredToken});assert.equal(res.status,200);
console.log('Onboarding passed: private confirmation, idempotency, admin authorization, review, owner updates, stale revisions, and saved-state email failure handling.');

// Signed-in ownership never needs, returns or rotates a private setup token.
for(const jwt of [undefined,'wrong-shop','unverified','admin-low'])assert([401,403].includes((await call({action:'account-load',id},jwt)).status));
res=await call({action:'account-load',id},'shop-owner');assert.equal(res.status,200);assert(!JSON.stringify(res.data).includes(recoveredToken));
const before=structuredClone(rows.get(id));rows.get(id).status='active';rows.get(id).billing_status='active';
const upgrade=structuredClone(paidUpdate);upgrade.plan='3d';upgrade.shop.garments.tshirt=structuredClone(upgrade.shop.garments['everyday-tshirt']);upgrade.shop.pricing.premiumCents={tshirt:4000};
res=await call({action:'account-update',id,revision:rows.get(id).revision,setup:upgrade},'shop-owner');assert.equal(res.status,200,JSON.stringify(res));
assert.equal(rows.get(id).pending_plan,'3d');assert.equal(rows.get(id).plan,before.plan);assert.deepEqual([...rows.get(id).shop_config.engines],before.shop_config.engines);assert.deepEqual(rows.get(id).shop_config.pricing.premiumCents,before.shop_config.pricing.premiumCents);assert.equal(rows.get(id).billing_status,'active');assert.equal(rows.get(id).status,'active');
assert.equal((await call({action:'account-update',id,revision:before.revision,setup:upgrade},'shop-owner')).status,409);
const rebind=structuredClone(upgrade);rebind.owner.requestEmail='another@example.com';assert.equal((await call({action:'account-update',id,revision:rows.get(id).revision,setup:rebind},'shop-owner')).status,409);
rows.get(id).shop_config.organizationType='team';assert.equal((await call({action:'account-load',id},'shop-owner')).status,403);rows.get(id).shop_config.organizationType='print-shop';
console.log('PASS account setup: verified owner, cross-account/Team denial, no private token exposure, staged 3D request, unchanged live plan and billing, revision conflicts.');
rows.get(id).shop_config.ownerManaged=true;
for(const action of ['load','update'])assert.equal((await call({action,id,token:recoveredToken,revision:rows.get(id).revision,setup:fixture})).status,403,'Old organizer setup token must not expose an MQD-owned master workspace');
assert.equal((await call({action:'admin-recover',id,revision:rows.get(id).revision},'admin-mfa')).status,403,'Generic recovery cannot create an organizer setup-access link for an owner workspace');
console.log('PASS owner-managed setup isolation from legacy private tokens and recovery.');

// Approved shops publish settings without changing access, billing or pilot dates.
rows.get(id).shop_config.ownerManaged=false;
const logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j1S8AAAAASUVORK5CYII=';
for(const status of ['pilot_active','active']){
 const row=rows.get(id);row.status=status;const before=structuredClone(row),mailCount=emails.length;
 const changed=structuredClone(upgrade);changed.shop.logo=logo;changed.shop.name='Automatic '+status;
 res=await call({action:'account-update',id,revision:row.revision,setup:changed},'shop-owner');
 assert.equal(res.status,200,JSON.stringify(res));assert.equal(res.data.liveSettingsUpdated,true);assert.equal(res.data.planRequestPending,true);
 assert.equal(row.shop_config.logo,logo);assert.equal(row.shop_config.name,changed.shop.name);
 assert.equal(row.plan,'2d');assert.deepEqual([...row.shop_config.engines],['2d']);assert.deepEqual(row.shop_config.pricing.premiumCents,{});
 assert.equal(row.pending_plan,'3d');assert.deepEqual(row.pending_config.engines,['2d','3d']);assert.equal(row.pending_config.logo,logo);
 for(const key of ['status','billing_status','approved_at','pilot_expires_at','token_hash','token_cipher','token_expires_at'])assert.equal(JSON.stringify(row[key]),JSON.stringify(before[key]),key+' must not change');
 assert.equal(emails.length,mailCount,'Live settings must not send approval emails');
 const retained=structuredClone(paidUpdate);retained.shop.logo=logo;retained.shop.name='Later logo edit';
 res=await call({action:'update',id,token:recoveredToken,revision:row.revision,setup:retained});assert.equal(res.status,200);
 assert.equal(row.pending_plan,'3d','An ordinary current-plan edit must not discard an existing upgrade request');
 assert(row.pending_config.pricing.premiumCents.tshirt);assert.equal(row.pending_config.name,'Later logo edit');
}
// Initial application review remains required and no new public configuration is activated.
const row=rows.get(id);row.status='pending_review';row.approved_at=null;const prior=structuredClone(row.shop_config);
const initial=structuredClone(paidUpdate);initial.shop.logo=logo;initial.shop.name='Pending applicant';
res=await call({action:'account-update',id,revision:row.revision,setup:initial},'shop-owner');assert.equal(res.status,200);assert.equal(res.data.status,'pending_review');assert.equal(JSON.stringify(row.shop_config),JSON.stringify(prior));assert.equal(row.pending_config.name,'Pending applicant');
console.log('PASS automatic live settings: approved pilot/paid logo and settings, existing legacy access, staged/preserved 3D requests, unchanged entitlement/billing/approval dates, initial-review boundary.');

// A downgrade request does not remove current 3D entitlement or its garment setup.
row.status='active';row.approved_at=new Date().toISOString();row.plan='3d';row.shop_config=validateSetup(upgrade).shop;row.pending_config=null;row.pending_plan=null;
const threeBefore=structuredClone(row.shop_config);res=await call({action:'account-update',id,revision:row.revision,setup:paidUpdate},'shop-owner');assert.equal(res.status,200,JSON.stringify(res));assert.equal(row.plan,'3d');assert.deepEqual([...row.shop_config.engines],['2d','3d']);assert.deepEqual(row.shop_config.pricing.premiumCents,threeBefore.pricing.premiumCents);assert.equal(row.pending_plan,'2d');assert.deepEqual(row.pending_config.engines,['2d']);
console.log('PASS downgrade boundary: staged request retains current 3D access and prices.');
