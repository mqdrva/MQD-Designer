import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const apiSource=fs.readFileSync(new URL('../v20/voting-api.js',import.meta.url),'utf8');
const contestSource=fs.readFileSync(new URL('../v20/contests.js',import.meta.url),'utf8');
const key='mqd-voter-token-v1',cid='11111111-1111-4111-8111-111111111111',option='22222222-2222-4222-8222-222222222222';
async function browser({storage=new Map(),cookies=new Map(),blockedStorage=false,blockedCookies=false,request=async()=>({recorded:true})}={}){
 const status={textContent:''};let calls=0;
 const document={getElementById:()=>status,hidden:false};
 Object.defineProperty(document,'cookie',{get(){if(blockedCookies)throw Error('Cookies blocked');return [...cookies].map(([k,v])=>k+'='+v).join('; ');},set(value){if(blockedCookies)throw Error('Cookies blocked');const [pair]=value.split(';');const i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}});
 const localStorage={getItem(k){if(blockedStorage)throw Error('Storage blocked');return storage.get(k)||null;},setItem(k,v){if(blockedStorage)throw Error('Storage blocked');storage.set(k,String(v));}};
 const context=vm.createContext({document,localStorage,crypto:webcrypto,URL,Map,Date,location:{href:'https://mymerchnow.app/contests.html?id='+cid},matchMedia:()=>({matches:true})});
 const api=new vm.SourceTextModule(apiSource,{context});await api.link(()=>{});await api.evaluate();
 const source=contestSource.slice(0,contestSource.indexOf("if(!id){$('refreshContest')"))+"\nrender=()=>{};result={};export {vote};";
 const contest=new vm.SourceTextModule(source,{context});
 await contest.link(async spec=>{
  if(spec.includes('voting-api.js'))return api;
  const isRequest=spec.includes('contest-api.js');
  return new vm.SyntheticModule([isRequest?'contestRequest':'attachEntryVideo'],function(){this.setExport(isRequest?'contestRequest':'attachEntryVideo',isRequest?async b=>{calls++;return request(b);}:()=>{});},{context});
 });await contest.evaluate();
 return {api:api.namespace,vote:contest.namespace.vote,status,calls:()=>calls,storage,cookies};
}
const existing='33333333-3333-4333-8333-333333333333';
const first=await browser({storage:new Map([[key,existing]])});
assert.equal(first.api.voterToken(),existing,'Existing browser identity must survive upgrade');
const restored=await browser({cookies:first.cookies});assert.equal(restored.api.voterToken(),existing,'Cookie restores identity if local storage is missing');
const cookiesBlocked=await browser({blockedCookies:true,storage:new Map([[key,existing]])});assert.equal(cookiesBlocked.api.voterToken(),existing);
const storageBlocked=await browser({blockedStorage:true,cookies:first.cookies});assert.equal(storageBlocked.api.voterToken(),existing);
const bothBlocked=await browser({blockedStorage:true,blockedCookies:true});assert.equal(bothBlocked.api.voterToken(),bothBlocked.api.voterToken(),'Memory fallback stays stable for the page');
await first.vote(option);await first.vote(option);assert.equal(first.calls(),1,'Repeat click must not send a second request');
const reload=await browser({cookies:first.cookies});await reload.vote(option);assert.equal(reload.calls(),0,'Cookie receipt blocks duplicate after storage loss');
const throttle=await browser({request:async()=>{throw Error('A vote was recently recorded from this internet connection. Please try again in 200 seconds. People sharing Wi-Fi must wait between votes.');}});
await throttle.vote(option);await throttle.vote(option);assert.equal(throttle.calls(),1,'Cooldown blocks repeated HTTP requests');assert.match(throttle.status.textContent,/Try again in 200 seconds/);
throttle.storage.set('mqd-contest-vote-'+cid+'-retry-at',String(Date.now()-1));await throttle.vote(option);assert.equal(throttle.calls(),2,'Cooldown expires without a timer or background request');
const failed=await browser({request:async()=>{throw Error('Network failure');}});await failed.vote(option);await failed.vote(option);assert.equal(failed.calls(),2,'Network failure must not mark a vote counted');
const duplicate=await browser({request:async()=>({recorded:false})});await duplicate.vote(option);await duplicate.vote(option);assert.equal(duplicate.calls(),1);assert.match(duplicate.status.textContent,/already voted/);
console.log('Browser identity compatibility, cookie/storage fallbacks, duplicate prevention, cooldown request suppression and retry tests passed.');
