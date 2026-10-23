import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateSetup} from '../supabase/functions/mqd-print-shop-setup/validation.js';
import {canonicalTeamShop,teamQuote} from '../supabase/functions/mqd-team-service/runtime.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url)));
globalThis.Deno={env:{get:()=>JSON.stringify({version:'qa',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500})}};
for(const engines of [['2d'],['3d'],['2d','3d']]){
 const p=structuredClone(fixture);p.plan='3d';p.shop.organizationType='team';p.shop.engines=engines;
 const source=structuredClone(p.shop.garments['everyday-tshirt']);source.sizes=['L','5XL'];source.colors=['White'];
 p.shop.pricing.baseCents=engines.includes('2d')?{'everyday-tshirt':2000}:{};
 p.shop.pricing.premiumCents=engines.includes('3d')?{tshirt:4000}:{};
 p.shop.garments={...(engines.includes('2d')?{'everyday-tshirt':source}:{}),...(engines.includes('3d')?{tshirt:structuredClone(source)}:{})};
 const saved=validateSetup(p),shop=canonicalTeamShop(saved.shop);assert.deepEqual(shop.engines,engines);
 const reopened=validateSetup(JSON.parse(JSON.stringify(saved)));assert.deepEqual(reopened.shop.engines,engines);
 const bad=structuredClone(p);Object.values(bad.shop.garments)[0].sizes.push('6XL');assert.throws(()=>validateSetup(bad),/sizes/);
 if(!engines.includes('2d'))assert.throws(()=>teamQuote(shop,{engine:'2d'}),/unavailable/);
 if(!engines.includes('3d'))assert.throws(()=>teamQuote(shop,{engine:'3d',printMethod:'all-over'}),/unavailable/);
}
const missing=structuredClone(fixture);missing.shop.organizationType='team';missing.shop.engines=['3d'];assert.throws(()=>validateSetup(missing));
console.log('PASS Teams designer selections: 2D only, 3D only, both, save/reopen, server engine denial and 6XL rejection.');
