import assert from 'node:assert/strict';
const api='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-team-service';
const headers={apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4','Content-Type':'application/json'};
for(const [body,expected] of [[{action:'order-checkout'},503],[{action:'admin-master-load',id:crypto.randomUUID()},403],[{action:'master-save',id:crypto.randomUUID(),revision:0,publish:true,draft:{}},404]]){
 const r=await fetch(api,{method:'POST',headers,body:JSON.stringify(body)}),data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));console.log(body.action,r.status,data.error);
}
console.log('PASS deployed Teams service: live checkout disabled; unauthenticated admin and unknown-team master access denied. No orders, charges, or messages created.');
