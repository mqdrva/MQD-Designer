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
assert(config.routes.some(r=>r.src==='/'&&r.dest==='/custom-apparel.html'));
const landing=fs.readFileSync('custom-apparel.html','utf8');
assert(landing.includes('href="/index.html">Start Designing</a>'));
assert(landing.includes('No account needed to start'));
const firstRoute=path=>config.routes.find(route=>route.src&&!route.continue&&new RegExp('^'+route.src+'$').test(path));
for(const [path,destination] of [
 ['/teams','/team-setup.html'],['/teams/','/team-setup.html'],
 ['/print-shops','/print-shop-setup.html'],['/print-shops/','/print-shop-setup.html']
]){
 const route=firstRoute(path);
 assert.equal(route?.status,307,`${path} must open the service signup`);
 assert.equal(route.headers.Location,destination);
 assert.equal(route.headers['Cache-Control'],'no-store');
 assert(config.routes.indexOf(route)<config.routes.findIndex(r=>r.handle==='filesystem'));
 const setup=fs.readFileSync(destination.slice(1),'utf8');
 assert(setup.includes('id="setupForm"'));
 assert(setup.includes('No payment is collected by submitting this form.'));
}
for(const path of ['/teams/moparkings','/teams/moparkings/3d','/teams/luvnoone/3d','/shops/pilot','/shops/pilot/3d']){
 assert.equal(firstRoute(path),undefined,`${path} must retain its existing designer route`);
}
assert.equal(firstRoute('/lno').headers.Location,'/teams/luvnoone/3d');
assert.equal(firstRoute('/').dest,'/custom-apparel.html');
assert(config.rewrites.some(r=>r.source==='/teams/:team/3d'&&r.destination==='/team-3d.html'));
assert(config.rewrites.some(r=>r.source==='/shops/:shop'&&r.destination==='/shop-2d.html'));
console.log('PASS: landing route, CTA, campaign links, auth, cart, owner, production captures and AI returns.');
console.log('PASS: public service signup links, trailing slashes and preserved private business designers.');
