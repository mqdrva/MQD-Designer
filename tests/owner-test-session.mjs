import assert from 'node:assert/strict';
import {ownerTestAccessToken} from '../v20/owner-test-session.js';
const now=1800000000000;
function fixture(session,refresh,level='aal2'){
 let calls=0;return {client:{auth:{getSession:async()=>({data:{session}}),refreshSession:async()=>{calls++;return refresh;},mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level}})}}},calls:()=>calls};
}
const current={access_token:'current-session',expires_at:now/1000+3600};
let f=fixture(current);assert.equal(await ownerTestAccessToken(f.client,now),'current-session');assert.equal(f.calls(),0);
f=fixture({...current,access_token:'expired',expires_at:now/1000-1},{data:{session:current}});assert.equal(await ownerTestAccessToken(f.client,now),'current-session');assert.equal(f.calls(),1);
f=fixture({...current,expires_at:now/1000+30},{data:{session:current}});assert.equal(await ownerTestAccessToken(f.client,now),'current-session');assert.equal(f.calls(),1);
f=fixture(null);await assert.rejects(ownerTestAccessToken(f.client,now),/Sign into/);assert.equal(f.calls(),0);
f=fixture({...current,expires_at:0},{data:{session:null},error:new Error('expired')});await assert.rejects(ownerTestAccessToken(f.client,now),/session expired/);
f=fixture(current,null,'aal1');await assert.rejects(ownerTestAccessToken(f.client,now),/authenticator/);
console.log('PASS current/expired/expiring session refresh, signed-out denial, failed refresh denial, MFA denial; no network or payment.');
