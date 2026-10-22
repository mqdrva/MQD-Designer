import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createContestSaveInvite,contestEntryUrl} from '../v20/contest-save-invite.js';
const user={id:'u',email_confirmed_at:'2026-01-01'},design={id:'d',product_id:'tshirt'};
const monthly={server_now:'2026-10-17T20:00:00Z',current:{id:'round',opens_at:'2026-10-01T00:00:00Z',closes_at:'2026-11-06T04:59:00Z'}};
function fixture({entries=[],round=monthly,current='u',offline=false}={}){
 const db=new Map(),shown=[];let calls=0;
 const options={read:async k=>db.get(k),write:async(k,v)=>db.set(k,v),show:d=>shown.push(d),currentUserId:()=>current,request:async b=>{calls++;if(offline)throw Error('offline');return b.action==='monthly'?round:{entries};}};
 return {options,db,shown,get calls(){return calls;}};
}
let f=fixture(),invite=createContestSaveInvite(f.options);
await Promise.all([invite(design,user),invite(design,user)]);assert.equal(f.shown.length,1);
await createContestSaveInvite(f.options)(design,user);assert.equal(f.shown.length,1,'durable marker survives reload');
for(const options of [{entries:[{contest_id:'round'}]},{round:{...monthly,current:null}},{round:{...monthly,server_now:monthly.current.closes_at}},{current:'other'},{offline:true}]){
 f=fixture(options);assert.equal(await createContestSaveInvite(f.options)(design,user),false);assert.equal(f.shown.length,0);
}
f=fixture();invite=createContestSaveInvite(f.options);
for(const [d,u] of [[{...design,product_id:'long-sleeve-tshirt'},user],[design,{...user,is_anonymous:true}],[design,{id:'u'}],[null,user]])assert.equal(await invite(d,u),false);
assert.equal(f.calls,0);
assert.equal(contestEntryUrl('design & one'),'/contests.html?entryDesign=design%20%26%20one#monthlyEntryForm');
// Execute the real Save Design handler for a new draft, update, failed save and auth recovery handoff.
const source=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function saveDraft(){'),source.indexOf('\nconst authDesignRecovery=',source.indexOf('async function saveDraft(){')));
let invitations=0,fail=false;const button={textContent:'Save Design'};
const context={$:()=>button,isPermanentUser:()=>true,persistentDesignSnapshot:async x=>x,captureDesignJSON:async()=>({product:{id:'tshirt'}}),savePayloadToDrafts:async()=>{},currentDesignRecoveryId:()=>null,activeCloudDesign:null,saveCloudDesign:async()=>{if(fail)throw Error('offline');return design;},inviteSavedDesign:()=>{invitations++;},accountUser:()=>user,setDesignRecoveryStatus:()=>{},setTimeout:()=>{},console:{error:()=>{}},alert:()=>{}};
vm.createContext(context);vm.runInContext(handler,context);
await context.saveDraft();assert.equal(invitations,1);
context.activeCloudDesign={id:'d',status:'draft'};await context.saveDraft();assert.equal(invitations,1,'updates do not prompt');
context.activeCloudDesign=null;fail=true;await context.saveDraft();assert.equal(invitations,1,'failed saves do not prompt');
assert(source.includes('if(result.result)void inviteSavedDesign(result.result,accountUser())'),'auth recovery prompts only on a new save, not a previous receipt');
console.log('PASS: first successful save, repeat saves, concurrent callbacks, durable dismissal, eligibility, auth, account switches, already-entered rounds, cutoff and offline safety.');
