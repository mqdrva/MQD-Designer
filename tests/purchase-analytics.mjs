import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../v20/site-analytics.js',import.meta.url),'utf8');
function page({initial='unpaid',session='cs_local_test',storage=new Map(),test=false,blockedStorage=false}={}){
  const status={textContent:initial},events=[],gaEvents=[];let check;
  const elements={paymentStatus:status,productName:{textContent:'Test shirt'},amount:{textContent:'$50.00'},sandboxBadge:{hidden:!test}};
  const c={document:{readyState:'complete',getElementById:id=>elements[id]||null,addEventListener(){}},
    window:{location:{search:'?session_id='+session},va:(type,event)=>events.push({type,...event}),gtag:(type,name,data)=>gaEvents.push({type,name,data})},
    sessionStorage:{getItem:key=>{if(blockedStorage)throw Error('blocked');return storage.get(key)||null;},setItem:(key,value)=>{if(blockedStorage)throw Error('blocked');storage.set(key,value);}},
    URLSearchParams,MutationObserver:class{constructor(callback){check=callback;}observe(target){assert.equal(target,status);}}};
  vm.runInNewContext(source,c);
  return {events,gaEvents,storage,set(value){status.textContent=value;check();}};
}
const p=page();
for(const state of ['unpaid','UNPAID','not paid','payment unpaid','paid pending','partially paid','Confirming…','Processing','no_payment_required','']){
  p.set(state);assert.equal(p.events.length,0,`${state} must not count as purchase`);assert.equal(p.gaEvents.length,0);
  assert.equal(p.storage.size,0,'pending status must not consume deduplication key');
}
p.set('Paid ✓');assert.equal(p.events.length,1);assert.equal(p.events[0].name,'Purchase Confirmed');assert.equal(p.gaEvents[0].name,'purchase');
assert.equal(p.events[0].data.amount,50);assert.equal(p.events[0].data.currency,'USD');
for(const state of ['Paid ✓','paid','unpaid','Paid ✓'])p.set(state);
assert.equal(p.events.length,1,'mutation/repeated paid status must not duplicate');assert.equal(p.gaEvents.length,1);
const reloaded=page({initial:'Paid ✓',storage:p.storage});assert.equal(reloaded.events.length,0,'same session stays deduplicated across reloads');
const next=page({initial:'paid',session:'cs_other_test',storage:p.storage});assert.equal(next.events.length,1,'different session is tracked');
const testPage=page({initial:' PAID ✓ ',test:true});assert.equal(testPage.events[0].name,'Test Purchase Confirmed');assert.equal(testPage.gaEvents[0].name,'test_purchase_confirmed');
const blocked=page({blockedStorage:true});blocked.set('paid');blocked.set('Paid ✓');assert.equal(blocked.events.length,1,'in-memory dedup still works if storage is unavailable');
console.log('PASS: unpaid ignored, unpaid→paid tracked, duplicate mutations/reloads suppressed, test purchases isolated and storage failure handled.');
