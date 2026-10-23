import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {batchWindow,batchDraft,batchOrderable,teamAccess,paidGarmentCount,nextMonthReward,refundedGarments,ownedTeamSubscription,DAY_MS} from '../v20/team-contract.js';
const now=Date.parse('2026-10-13T16:00:00Z');
for(const days of [7,14])assert.equal((Date.parse(batchWindow(new Date(now).toISOString(),new Date(now+days*DAY_MS).toISOString()).cutoffAt)-now)/DAY_MS,days);
for(const days of [6,15,NaN])assert.throws(()=>batchWindow(new Date(now).toISOString(),new Date(now+days*DAY_MS).toString()));
assert(batchOrderable({status:'open',shipping_paid_at:'paid',approved_at:'approved',opens_at:new Date(now-DAY_MS).toISOString(),cutoff_at:new Date(now+DAY_MS).toISOString()},now));
assert(!batchOrderable({status:'open',shipping_paid_at:null,approved_at:'approved',opens_at:new Date(now-DAY_MS).toISOString(),cutoff_at:new Date(now+DAY_MS).toISOString()},now));
assert(teamAccess({status:'active',billing_status:'active',period_end:new Date(now+DAY_MS).toISOString()},now));assert(!teamAccess({status:'active',billing_status:'past_due',period_end:new Date(now+DAY_MS).toISOString()},now));
const start='2026-10-01T00:00:00.000Z',end='2026-11-01T00:00:00.000Z',paid={payment_status:'paid',paid_at:'2026-10-13T16:00:00Z',quantity:30,refunded_quantity:0};
assert.equal(nextMonthReward([paid],start,end).creditCents,2000);assert.equal(nextMonthReward([{...paid,quantity:100}],start,end).creditCents,2000,'No stacking');
assert.equal(paidGarmentCount([{...paid,quantity:30,refunded_quantity:1},{...paid,payment_status:'unpaid'},{...paid,disputed:true},{...paid,paid_at:end}],start,end),29);
assert.equal(refundedGarments(30,60000,2000),1);assert.equal(refundedGarments(30,60000,60000),30);
const address={name:'Test team',line1:'100 Test St',city:'Richmond',state:'VA',postal_code:'23220',country:'US'};
assert.equal(batchDraft({days:7,expectedQuantity:30,address},now).expected_quantity,30);assert.throws(()=>batchDraft({days:14,expectedQuantity:0,address},now));
const pricing={version:'test-approved',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500};
globalThis.Deno={env:{get:k=>k==='MQD_EVERYDAY_PRICING'?JSON.stringify(pricing):''}};
const runtime=await import('../supabase/functions/mqd-team-service/runtime.js');
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url),'utf8'));
const shop=runtime.canonicalTeamShop(fixture.shop,now);assert.equal(shop.pricing.baseCents['everyday-tshirt'],2000);assert.equal(shop.printMethods.htv,undefined);assert.equal(shop.printMethods3d['all-over'],'All-over print');
const summary={engine:'2d',productId:'everyday-tshirt',color:'White',printMethod:'transfer',locations:['front'],orderOptions:[{size:'L',quantity:2}]};assert.equal(runtime.teamQuote(shop,summary).totalCents,4000);
fixture.shop.pricing.baseCents['everyday-tshirt']=1;assert.equal(runtime.canonicalTeamShop(fixture.shop,now).pricing.baseCents['everyday-tshirt'],2000,'Organizer cannot set checkout prices');
const teamId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',account={team_id:teamId,livemode:false,stripe_customer_id:'cus_team',stripe_subscription_id:'sub_team',status:'active',billing_status:'active',period_start:start,period_end:end};
const subscription={id:'sub_team',customer:'cus_team',livemode:false,status:'active',latest_invoice:{status:'paid'},items:{data:[{quantity:1,price:{id:'price_team'},current_period_start:Date.parse(start)/1000,current_period_end:Date.parse(end)/1000}]}};
ownedTeamSubscription(subscription,account,'price_team',false);assert.throws(()=>ownedTeamSubscription({...subscription,customer:'cus_other'},account,'price_team',false));
// Execute the actual signed-webhook handler with controlled Stripe and database adapters.
let handler,invoiceItemCalls=0,mailCalls=0;
const tables={mqd_team_accounts:[structuredClone(account)],mqd_team_orders:[{...paid,id:'order-team',team_id:teamId,livemode:false,garment_cents:60000,shipping_cents:0,payment_intent:'pi_order',checkout_id:'cs_order',delivery:'individual',customer:{email:'test@example.com'}}],mqd_team_periods:[{team_id:teamId,period_start:start,period_end:end,invoice_id:'in_first'}],mqd_team_rewards:[],mqd_team_batches:[],mqd_team_events:[]};
const db={from(table){const filters=[];let op='select',value=null,ignore=false;const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},order(){return q;},limit(){return q;},maybeSingle(){return run(true);},single(){return run(true);},insert(v){op='insert';value=v;return q;},upsert(v,opt){op='upsert';value=v;ignore=!!opt?.ignoreDuplicates;return q;},update(v){op='update';value=v;return q;},then(resolve,reject){return run(false).then(resolve,reject);}};async function run(single){const rows=tables[table]||=[];let matching=rows.filter(r=>filters.every(f=>f(r)));if(op==='insert')rows.push(structuredClone(value));if(op==='upsert'){const prior=rows.find(r=>value.invoice_id?r.invoice_id===value.invoice_id: r.team_id===value.team_id&&r.period_start===value.period_start);if(prior){if(!ignore)Object.assign(prior,value);}else rows.push(structuredClone(value));}if(op==='update')matching.forEach(r=>Object.assign(r,value));matching=rows.filter(r=>filters.every(f=>f(r)));return{data:single?matching[0]||null:structuredClone(matching),error:null};}return q;},async rpc(name,args){if(name==='mqd_claim_team_event'){let row=tables.mqd_team_events.find(r=>r.event_id===args.p_event);if(row?.status==='processed')return{data:false};if(!row){row={event_id:args.p_event};tables.mqd_team_events.push(row);}row.lease_id=args.p_lease;return{data:true};}return{data:0};}};
let invoice={id:'in_renew',status:'draft',customer:'cus_team',currency:'usd',subtotal:2000,billing_reason:'subscription_cycle',parent:{subscription_details:{subscription:'sub_team'}},lines:{data:[{amount:2000,quantity:1,pricing:{price_details:{price:'price_team'}},period:{start:Date.parse(end)/1000,end:Date.parse('2026-12-01T00:00:00Z')/1000}}]}};
let charge={id:'ch_team',livemode:false,amount:60000,amount_refunded:0,payment_intent:'pi_order'};
class FakeStripe{constructor(){this.webhooks={constructEventAsync:async(raw,sig)=>{if(sig!=='signed')throw new Error('bad signature');return JSON.parse(raw);}};this.invoices={retrieve:async()=>structuredClone(invoice)};this.subscriptions={retrieve:async()=>structuredClone(subscription)};this.charges={retrieve:async()=>structuredClone(charge)};this.checkout={sessions:{retrieve:async()=>({id:'cs_order',livemode:false,mode:'payment',amount_total:60000,currency:'usd',payment_status:'paid',payment_intent:'pi_order'})}};this.paymentIntents={retrieve:async()=>({id:'pi_order',livemode:false,status:'succeeded',amount_received:60000,latest_charge:charge})};this.invoiceItems={create:async(params,options)=>{assert.equal(params.invoice,'in_renew');assert.equal(params.customer,'cus_team');assert.equal(params.amount,-2000);assert.equal(options.idempotencyKey,'team-reward-in_renew');invoiceItemCalls++;return{id:'ii_reward'};}};}static createFetchHttpClient(){}static createSubtleCryptoProvider(){}}
const config={ready:true,live:false,key:'mock',webhook:'mock',price:'price_team'};
const context={createClient:()=>db,Stripe:FakeStripe,teamConfig:async()=>config,checked:runtime.checked,objectId:runtime.objectId,secret:async()=>'',BASE_URL:runtime.BASE_URL,teamMail:async()=>{mailCalls++;return true;},ownedTeamSubscription,refundedGarments,nextMonthReward,teamAccess,crypto:globalThis.crypto,Response,Request,TextDecoder,Date,Deno:{env:{get:()=>''},serve:h=>handler=h}};
const source=(await fs.readFile(new URL('../supabase/functions/mqd-team-webhook/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');vm.runInNewContext(stripTypeScriptTypes(source),context);
async function webhook(type,object,id=crypto.randomUUID(),signature='signed'){const response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'stripe-signature':signature},body:JSON.stringify({id,type,livemode:false,created:Date.parse('2026-10-13T16:00:00Z')/1000,data:{object}})}));return {status:response.status,data:await response.json()};}
assert.equal((await webhook('invoice.created',invoice,'bad','bad')).status,400);assert.equal(invoiceItemCalls,0);
const eventId=crypto.randomUUID();assert.equal((await webhook('invoice.created',invoice,eventId)).status,200);assert.equal(invoiceItemCalls,1);assert.equal((await webhook('invoice.created',invoice,eventId)).data.duplicate,true);assert.equal(invoiceItemCalls,1);
invoice={...invoice,id:'in_foreign',customer:'cus_other'};assert.equal((await webhook('invoice.created',invoice)).status,200);assert.equal(invoiceItemCalls,1,'Unrelated customer cannot earn a Team credit');
charge.amount_refunded=2000;assert.equal((await webhook('charge.refunded',charge)).status,200);assert.equal(tables.mqd_team_orders[0].refunded_quantity,1);
const paidAt=tables.mqd_team_orders[0].paid_at;assert.equal((await webhook('checkout.session.completed',{id:'cs_order'})).status,200);assert.equal(tables.mqd_team_orders[0].paid_at,paidAt,'Retry must not move a sale into another month');
assert.equal((await webhook('charge.dispute.created',{charge:'ch_team'})).status,200);assert.equal(tables.mqd_team_orders[0].disputed,true);assert.equal(tables.mqd_team_orders[0].production_status,'canceled');
assert.equal(nextMonthReward(tables.mqd_team_orders,start,end).garments,0);
console.log('Team checks passed: approved prices, 7–14 day cutoff, paid-only rewards, refunds/disputes, scoped invoice credit, duplicate events and preserved payment timestamps.');
// Execute the actual Team API authorization and disabled-payment boundaries.
const apiTables={mqd_print_shop_businesses:[{id:teamId,preferred_slug:'fixture-team',shop_config:{organizationType:'team'},token_hash:await runtime.hash('a'.repeat(64)),token_expires_at:new Date(Date.now()+DAY_MS).toISOString(),email_verified_at:'confirmed'}],mqd_team_accounts:[{...account,shop_config:{name:'Fixture Team',slug:'fixture-team'}}],mqd_team_batches:[],mqd_team_orders:[]};
let mfa=true,role='admin',apiHandler,apiLive=false;
const apiDb={auth:{getUser:async()=>({data:{user:{id:'operator',app_metadata:{role},user_metadata:{role:'admin'}}}})},from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},order(){return q;},limit(){return q;},maybeSingle(){return run(true);},single(){return run(true);},then(a,b){return run(false).then(a,b);}};async function run(single){const rows=(apiTables[table]||[]).filter(r=>filters.every(f=>f(r)));return{data:single?rows[0]||null:rows,error:null};}return q;},rpc:async(name)=>({data:name==='mqd_team_pending_metadata'?[{id:teamId,hasPending:false},{id:'new-team',hasPending:true}]:0,error:null})};
const apiContext={...context,createClient:()=>apiDb,config:{},PUBLIC_KEY:runtime.PUBLIC_KEY,hash:runtime.hash,teamConfig:async()=>({ready:false,enabled:false,live:apiLive,mode:apiLive?'live':'sandbox'}),canonicalTeamShop:runtime.canonicalTeamShop,teamPriceCatalog:runtime.teamPriceCatalog,teamQuote:runtime.teamQuote,safeAccount:runtime.safeAccount,checked:runtime.checked,hasAdminMfa:async(_db,jwt)=>mfa&&jwt==='operator',batchDraft,batchWindow,TEAM_POLICY_VERSION:'2026-10-22',TEAM_REWARD_QUANTITY:10,Deno:{env:{get:()=>''},serve:h=>apiHandler=h}};
const apiSource=(await fs.readFile(new URL('../supabase/functions/mqd-team-service/index.ts',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');vm.runInNewContext(stripTypeScriptTypes(apiSource),apiContext);
async function api(body,{jwt='',origin='http://127.0.0.1:8776',key=runtime.PUBLIC_KEY}={}){const response=await apiHandler(new Request('https://example.invalid',{method:'POST',headers:{apikey:key,origin,'Content-Type':'application/json',...(jwt?{authorization:'Bearer '+jwt}:{})},body:JSON.stringify(body)}));return{status:response.status,data:await response.json()};}
assert.equal((await api({action:'admin-list'})).status,403);mfa=false;assert.equal((await api({action:'admin-list'},{jwt:'operator'})).status,403);mfa=true;role='customer';assert.equal((await api({action:'admin-list'},{jwt:'operator'})).status,403);role='admin';
const sandboxList=await api({action:'admin-list'},{jwt:'operator'});assert.equal(sandboxList.status,200);assert.equal(sandboxList.data.pending.length,2);
apiLive=true;const liveList=await api({action:'admin-list'},{jwt:'operator'});assert.equal(liveList.status,200);assert.equal(liveList.data.accounts.length,0);assert.deepEqual(liveList.data.pending.map(p=>p.id),['new-team'],'Sandbox-approved Team must not appear in live approvals');
apiTables.mqd_team_accounts[0].livemode=true;const liveOwnList=await api({action:'admin-list'},{jwt:'operator'});assert.equal(liveOwnList.data.pending.length,2);apiLive=false;const sandboxOtherList=await api({action:'admin-list'},{jwt:'operator'});assert.deepEqual(sandboxOtherList.data.pending.map(p=>p.id),['new-team'],'Live-approved Team must not appear in sandbox approvals');apiTables.mqd_team_accounts[0].livemode=false;
assert.equal((await api({action:'owner-status',id:teamId,token:'b'.repeat(64)})).status,401);
assert.equal((await api({action:'owner-status',id:teamId,token:'a'.repeat(64)})).status,200);
assert.equal((await api({action:'order-checkout'})).status,503,'Disabled Team payments cannot create checkout');
assert.equal((await api({action:'owner-status',id:teamId,token:'a'.repeat(64)},{origin:'https://other.example'})).status,403);
assert.equal((await api({action:'owner-status',padding:'x'.repeat(16000)})).status,400);
console.log('Team API checks passed: private owner access, fresh admin role/MFA, origin isolation, bounded bodies and disabled checkout.');
// Master endpoints use the existing private organizer token or fresh admin + MFA.
const masterContract=await import('../supabase/functions/_shared/mqd-team-masters.js');
const {GARMENT_MAPPING}=await import('../supabase/functions/_shared/shirt-games/mapping.js');
Object.assign(apiContext,masterContract);
const masterDraft={name:'Synthetic master',payload:{schema:'mqd-design-v1',product:{id:'tshirt',model:GARMENT_MAPPING.tshirt.model},templates:GARMENT_MAPPING.tshirt.templates,design:{zones:Object.fromEntries(GARMENT_MAPPING.tshirt.zones.map(z=>[z,{background:'#ffffff',layers:z==='Front'?[{id:'name',type:'text',text:'NAME',font:'Inter',x:0,y:0,scale:1,rotation:0,visible:true}]:[]}]))}},rules:[{zone:'Front',layerId:'name',role:'text',label:'Name',maxLength:30}]};
apiLive=false;apiTables.mqd_team_accounts[0].livemode=false;apiTables.mqd_team_accounts[0].shop_config=structuredClone(fixture.shop);apiTables.mqd_team_accounts[0].shop_config.engines=['2d','3d'];apiTables.mqd_team_accounts[0].shop_config.garments.tshirt={colors:['White'],sizes:['S','M','L','XL']};
let masterSaves=0;const oldRpc=apiDb.rpc;apiDb.rpc=async(name,args)=>{if(name==='mqd_save_team_master'){assert.equal(args.p_team,teamId);masterSaves++;return{data:{revision:1,versionId:args.p_publish?args.p_version:null}};}return oldRpc(name,args);};
const saveBody={action:'master-save',id:teamId,revision:0,publish:false,draft:masterDraft};
assert.equal((await api(saveBody)).status,401);assert.equal((await api({...saveBody,token:'b'.repeat(64)})).status,401);
const masterSaveResult=await api({...saveBody,token:'a'.repeat(64)});assert.equal(masterSaveResult.status,200,JSON.stringify(masterSaveResult));assert.equal(masterSaves,1);
assert.equal((await api({...saveBody,action:'admin-master-save'},{jwt:'operator'})).status,200);assert.equal(masterSaves,2);
mfa=false;assert.equal((await api({...saveBody,action:'admin-master-save'},{jwt:'operator'})).status,403);mfa=true;
assert.equal((await api({...saveBody,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',token:'a'.repeat(64)})).status,404);
const wrong=structuredClone(masterDraft);wrong.rules[0].role='admin';assert.equal((await api({...saveBody,token:'a'.repeat(64),draft:wrong})).status,400);assert.equal(masterSaves,2);
console.log('PASS actual master API: private organizer authoring, owner MFA authoring, public/foreign token/cross-team denial and invalid permissions rejected.');

// Sandbox mail cannot consult credentials or make external requests.
const noMailDb={rpc(){throw new Error('Sandbox mail must not access secrets');}};
assert.equal(await runtime.teamMail(noMailDb,'test','synthetic@example.invalid','Test','Test'),false);
assert.equal(await runtime.teamMail(noMailDb,'test','synthetic@example.invalid','Test','Test',false),false);
console.log('PASS sandbox Teams notification suppression');

for(const quantity of [9,10,11]){
 const reward=nextMonthReward([{...paid,quantity}],start,end);
 assert.equal(reward.target,10);assert.equal(reward.creditCents,quantity>=10?2000:0);
 assert.equal(reward.remaining,Math.max(0,10-quantity));
}
assert.equal(nextMonthReward([{...paid,quantity:10,refunded_quantity:1}],start,end).creditCents,0);
assert.equal(nextMonthReward([{...paid,quantity:10,disputed:true}],start,end).creditCents,0);
assert.equal(nextMonthReward([{...paid,quantity:10,payment_status:'pending'}],start,end).creditCents,0);
console.log('PASS approved ten-garment renewal reward: 9/10/11 boundary, refund, dispute, pending payment');
