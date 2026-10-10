import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('v20/landing-entry.js','utf8');
for(const [search,hash,expected] of [
 ['', '', null],['?utm_source=facebook','',null],['','#products',null],
 ['?openCart=1','',true],['?owner=1','',true],['?mqdCapture=1&proof=123','',true],
 ['?code=callback','',true],['','#access_token=token&refresh_token=refresh',true],
 ['?ai-test=1','#ai-transfer=example',true]
]){
 let target=null;vm.runInNewContext(source,{URLSearchParams,location:{search,hash,replace:value=>target=value}});
 assert.equal(target,expected?'/index.html'+search+hash:null);
}
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
assert(config.rewrites.some(r=>r.source==='/'&&r.destination==='/custom-apparel.html'));
const landing=fs.readFileSync('custom-apparel.html','utf8');
assert(landing.includes('href="/index.html">Start Designing</a>'));
assert(landing.includes('No account needed to start'));
console.log('PASS: landing route, CTA, campaign links, auth, cart, owner, production captures and AI returns.');
