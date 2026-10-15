import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {AUTH_SAVE_MARKER,authSaveResumeId,authSaveRedirectUrl,createAuthSaveRecovery} from '../v20/design-auth-recovery.js';

const payload={schema:'mqd-design-v1',product:{id:'tshirt'},activeZone:'Back',design:{zones:Object.fromEntries(['Front','Back','Left Sleeve','Right Sleeve','Collar'].map(zone=>[zone,{background:'#FF0000',layers:[{type:'text',text:zone,x:17,y:-26,scale:.42,rotation:12},{type:'image',src:'data:image/png;base64,AAAA',flipX:true,crop:{left:.1,top:.2,right:0,bottom:0}}]}]))}};
const user={id:'permanent-user',is_anonymous:false};
const db=new Map(),tab=new Map();
const storage={getItem:key=>tab.get(key),setItem:(key,value)=>tab.set(key,value)};
const io={read:async key=>structuredClone(db.get(key)),write:async(key,value)=>db.set(key,structuredClone(value))};
let recovery=createAuthSaveRecovery(io),restored,saves=0,savedId;
const id=await recovery.prepare(payload);storage.setItem(AUTH_SAVE_MARKER,id);
assert.deepEqual((await io.read('auth-save:'+id)).payload,payload);
const redirect=authSaveRedirectUrl({origin:'https://mymerchnow.app',pathname:'/index.html'},id);
assert.equal(new URL(redirect).searchParams.get('resumeDesign'),id);
assert(!redirect.includes('AAAA'));assert.equal(authSaveResumeId({href:redirect},{getItem:()=>null}),id,'email callback in another tab uses the durable backup ID');
assert.equal(authSaveResumeId({href:'https://mymerchnow.app/index.html'},storage),id,'same-tab OAuth retains its marker');
assert.equal(authSaveResumeId({href:'https://mymerchnow.app/?resumeDesign=invalid'},{getItem:()=>null}),null);
const options={user,restore:async data=>{restored=data;},save:async(data,designId)=>{assert.deepEqual(data,payload);saves++;savedId=designId;return {id:designId};}};
recovery=createAuthSaveRecovery(io); // Full page reload loses all original callbacks.
await Promise.all([recovery.resume(id,options),recovery.resume(id,options)]);
assert.deepEqual(restored,payload);assert.equal(saves,1);assert.equal((await io.read('auth-save:'+id)).status,'saved');
assert.equal((await io.read('auth-save:'+id)).payload,null);
await createAuthSaveRecovery(io).resume(id,options);assert.equal(saves,1,'old callback cannot create another draft');
assert(savedId);
const failedId=await recovery.prepare(payload),before=(await io.read('auth-save:'+failedId)).designId;
await assert.rejects(recovery.resume(failedId,{...options,save:async()=>{throw Error('offline');}}),/offline/);
assert.deepEqual((await io.read('auth-save:'+failedId)).payload,payload,'failed cloud save retains the complete backup');
const edited=structuredClone(payload);edited.design.zones.Front.layers[0].text='Edited after retry';
await recovery.update(failedId,edited,user);
await recovery.resume(failedId,{...options,save:async(data,designId)=>{assert.equal(data.design.zones.Front.layers[0].text,'Edited after retry');assert.equal(designId,before);}});
const wrongId=await recovery.prepare(payload);
await assert.rejects(recovery.resume(wrongId,{...options,save:async()=>{throw Error('offline');}}));
await assert.rejects(recovery.resume(wrongId,{...options,user:{id:'another-user'}}),/same account/);
const guestId=await recovery.prepare(payload);const guest=await recovery.resume(guestId,{...options,user:{id:'guest',is_anonymous:true},save:async()=>{throw Error('guest must not cloud-save');}});assert.equal(guest.status,'restored');
await recovery.cancel(guestId);assert.equal((await recovery.resume(guestId,options)).status,'cancelled');
await assert.rejects(createAuthSaveRecovery({...io,write:async()=>{throw Error('quota');}}).prepare(payload),/quota/);

// Execute the actual unsigned Save Design handler: protection precedes auth,
// and a failed backup must never navigate away or claim an account save.
const source=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('async function saveDraft(){'),source.indexOf('\nconst authDesignRecovery=',source.indexOf('async function saveDraft(){')));
const events=[],button={textContent:'Save Design',disabled:false};let fail=false;
const context={AUTH_SAVE_MARKER,$:()=>button,isPermanentUser:()=>false,captureDesignJSON:async()=>payload,persistentDesignSnapshot:async p=>p,
 currentDesignRecoveryId:()=>null,authDesignRecovery:{prepare:async()=>{events.push('backup');if(fail)throw Error('quota');return id;}},sessionStorage:storage,pendingDesignSaveId:null,
 setDesignRecoveryStatus:()=>{},openAuth:()=>events.push('auth'),resumePendingDesignSave:()=>{},console:{error:()=>{}},alert:()=>events.push('alert'),setTimeout};
vm.createContext(context);vm.runInContext(handler,context);await context.saveDraft();assert.deepEqual(events,['backup','auth']);assert.equal(button.disabled,false);
events.length=0;fail=true;await context.saveDraft();assert.deepEqual(events,['backup','alert']);
assert(source.includes("if(event==='SIGNED_IN')setTimeout("),'Supabase work stays outside the auth callback to avoid a deadlock');
assert(source.includes('await ready;'),'restoration waits for the loaded garment before saving its preview');
console.log('PASS: guest capture-before-auth, redirect/reload/new-tab recovery, five-zone artwork fidelity, stable save IDs, duplicate callbacks, retry edits, account isolation, cancellation and quota failure.');
