import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createShopShareHandler,brandedShopHTML,shopLogoBytes} from '../api/print-shop-share.js';
const bytes=await fs.readFile(new URL('../assets/brand-logo.png',import.meta.url));
const shop={name:'Example & Friends </title><script>bad()</script>',tagline:'Your "own" designer',logo:'data:image/png;base64,'+bytes.toString('base64'),engines:['2d','3d']};
const html2=await fs.readFile(new URL('../shop-2d.html',import.meta.url),'utf8'),html3=await fs.readFile(new URL('../shop-3d.html',import.meta.url),'utf8');
assert.deepEqual(shopLogoBytes(shop.logo).bytes,bytes);assert.equal(shopLogoBytes('https://private.example/logo.png'),null);assert.equal(shopLogoBytes('data:image/svg+xml;base64,PHN2Zz4='),null);assert.equal(shopLogoBytes('data:image/png;base64,YmFk'),null);
for(const engine of ['2d','3d']){
 const html=engine==='2d'?html2:html3,result=brandedShopHTML(html,shop,'example',engine);
 assert.match(result,/og:image/);assert.match(result,/api\/print-shop-share\?shop=example&amp;image=1/);assert(!result.includes('<script>bad()'));
 assert.equal(result.split('<body')[1],html.split('<body')[1],'Designer body and controls must remain identical');
 assert.equal((result.match(/property="og:image"/g)||[]).length,1);assert(!result.includes('og:image:alt" content="Morales'));
 assert.match(result,/Example &amp; Friends/);
}
async function call(url,{missing=false,method='GET',failed=false}={}){
 const handler=createShopShareHandler({loadShop:async slug=>{assert.equal(slug,'example');if(failed)throw Error('network');return missing?null:shop;},template:async e=>e==='3d'?html3:html2});
 const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},end(body){this.body=body;}};await handler({url,method},res);return res;
}
assert.equal((await call('/shops/example')).statusCode,200);
assert.match((await call('/api/print-shop-share?shop=example&engine=3d')).body,/og:url" content="https:\/\/mymerchnow.app\/shops\/example\/3d/);
assert.deepEqual((await call('/api/print-shop-share?shop=example&image=1')).body,bytes);
assert.equal((await call('/shops/example',{missing:true})).statusCode,404);
assert.equal((await call('/shops/example',{failed:true})).statusCode,503);
assert.equal((await call('/shops/example',{method:'POST'})).statusCode,405);
assert.equal((await call('/shops/example',{method:'HEAD'})).body,undefined);
assert.equal((await call('/shops/../private')).statusCode,404);
const config=JSON.parse(await fs.readFile(new URL('../vercel.json',import.meta.url)));const routes=config.routes.filter(r=>r.dest?.startsWith('/api/print-shop-share'));
assert.equal(routes.length,2);assert(routes[0].dest.includes('engine=3d'));assert(routes[1].dest.includes('engine=2d'));assert(config.routes.indexOf(routes[0])<config.routes.findIndex(r=>r.handle==='filesystem'));
console.log('PASS shop link previews: initial metadata, exact original logo bytes, both engines, escaped names, unchanged designer body, unavailable shops, route isolation and no private assets.');
