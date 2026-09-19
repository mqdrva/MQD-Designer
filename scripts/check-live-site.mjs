import assert from 'node:assert/strict';
const site='https://mymerchnow.app';
const api='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/';
async function check(label,url,options={},expected=200,needle=''){
  for(let attempt=0;attempt<2;attempt++){
    try{const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});assert.equal(response.status,expected);const body=await response.text();if(needle)assert.ok(body.includes(needle));console.log('PASS '+label);return;}
    catch{if(attempt===1)throw new Error(label+' failed twice');}
  }
}
const checks=[
  ['Designer',site+'/',{},200,'id="addToCart"'],
  ['Customer sign-in code',site+'/v20/customer.js',{},200,'saveCloudDesign'],
  ['Contact',site+'/contact.html',{},200,'mqdrva@gmail.com'],
  ['Refund policy',site+'/returns.html',{},200,'refund'],
  ['Owner access protection',api+'mqd-owner-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"list"}'},401],
  ['Library admin protection',api+'mqd-library-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"action":"list"}'},401],
  ['Guest submission service',api+'submit-mqd-guest-design',{},200,'submit-mqd-guest-design']
];
const results=await Promise.allSettled(checks.map(args=>check(...args)));
for(const result of results)if(result.status==='rejected'){console.error(result.reason.message);process.exitCode=1;}
