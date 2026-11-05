import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {fixedLogoLayer} from '../v20/print-shop-contract.js';
import {fixture,packageFor,businessId,image} from './print-shop-design-fixture.mjs';
import {sharedShopDesign} from '../supabase/functions/mqd-print-shop-designs/service.js';
const f=fixture();
const json=async(...a)=>{const r=await f.call(...a);return {status:r.status,body:await r.json()};};
assert.equal((await json({action:'shops'},{jwt:null})).status,401);
assert.equal((await json({action:'list',businessId},{jwt:'wrong'})).status,404);
assert.equal((await json({action:'list',businessId},{jwt:'admin'})).status,403,'Existing MQD administrator MFA is retained');
assert.equal((await json({action:'shops'},{origin:'https://evil.test'})).status,403);
for(const engine of ['2d','3d']){
 const id=crypto.randomUUID(),{bytes,saved}=await packageFor(engine);
 let r=await json({action:'save',id,businessId,title:'Customer '+engine,locked:true,revision:0},{file:bytes});
 assert.equal(r.status,200,JSON.stringify(r));const design=r.body.design;
 assert.equal(design.locked,true);assert.match(design.token,/^[a-f0-9]{64}$/);assert.equal(design.revision,1);
 const original=structuredClone(f.designs.get(id)),stored=f.files.get(original.package_path);
 assert.deepEqual(stored,bytes,'Stored package and original artwork stay byte exact');
 const read=await json({action:'shared-load',id,token:design.token},{jwt:null});assert.equal(read.status,200);
 assert(!JSON.stringify(read.body).includes('owner@example.com'));assert(!JSON.stringify(read.body).includes('token_cipher'));assert(!read.body.design.business_id);
 f.businesses.get(businessId).shop_config.garmentLogo='changed-default';
 assert.equal((await json({action:'shared-load',id,token:design.token},{jwt:null})).body.shop.garmentLogo,'','Saved branding does not follow later shop defaults');
 delete f.businesses.get(businessId).shop_config.garmentLogo;
 const packageResponse=await f.call({action:'shared-package',id,token:design.token,revision:1},{jwt:null});assert.equal(packageResponse.status,200);assert.deepEqual(new Uint8Array(await packageResponse.arrayBuffer()),bytes);
 assert.equal((await json({action:'save',id,businessId,title:'FORGED',locked:false,revision:1,token:design.token},{jwt:null,file:bytes})).status,401);
 assert.equal((await json({action:'lock',id,businessId,locked:false,revision:1,token:design.token},{jwt:'wrong'})).status,404);
 assert.equal((await json({action:'shared-load',id:crypto.randomUUID(),token:design.token},{jwt:null})).status,404);
 assert.equal((await json({action:'shared-load',id,token:'f'.repeat(64)},{jwt:null})).status,404);
 assert.deepEqual(f.designs.get(id),original,'Locked link cannot replace the master');
 r=await json({action:'lock',id,businessId,locked:false,revision:1});assert.equal(r.status,200);assert.equal(r.body.design.revision,2);assert.equal(r.body.design.token,design.token);
 assert.deepEqual(f.files.get(original.package_path),bytes,'Unlocking does not alter artwork');
 assert.equal((await json({action:'shared-package',id,token:design.token,revision:1},{jwt:null})).status,409,'Old revision cannot mix lock metadata with new artwork');
 assert.equal((await json({action:'save',id,businessId,title:'STALE',locked:true,revision:1},{file:bytes})).status,409);
 const copy=structuredClone(saved);if(engine==='2d')copy.draft.artwork.front.texts[0].text='CUSTOMER COPY';else copy.design.design.zones.Back.layers[0].text='CUSTOMER COPY';
 assert.deepEqual(f.files.get(original.package_path),bytes,'Editing independent in-memory copy never changes server original');
 assert.equal((await json({action:'owner-load',id,businessId})).body.design.title,'Customer '+engine);
 await assert.rejects(()=>sharedShopDesign(f.db,{id,token:design.token},'other-shop'));
 f.businesses.get(businessId).status='suspended';assert.equal((await json({action:'shared-load',id,token:design.token},{jwt:null})).status,404);f.businesses.get(businessId).status='pilot_active';
}

for(const engine of ['2d','3d']){
 const b=f.businesses.get(businessId),before=structuredClone(b.shop_config),product=engine==='2d'?'everyday-tshirt':'tshirt';
 const preset={mode:'fixed',placement:'center',width:2,height:2,top:1};
 b.shop_config.garmentLogo=image;b.shop_config.garments={[product]:{colors:[engine==='2d'?'Red':'White'],sizes:['L'],logoPreset:preset}};
 const p=await packageFor(engine),zip=await JSZip.loadAsync(p.bytes);
 if(engine==='3d'){p.saved.design.design.zones.Front.layers.push(fixedLogoLayer(b.shop_config,product));zip.file('design.json',JSON.stringify(p.saved));}
 zip.file('brand/logo-placement.json',JSON.stringify({product,preset,asset:'brand/business-logo.png'}));zip.file('brand/business-logo.png',image.split(',')[1],{base64:true});
 const id=crypto.randomUUID(),bytes=await zip.generateAsync({type:'uint8array'});
 let r=await json({action:'save',id,businessId,title:'Fixed original',locked:true,revision:0},{file:bytes});assert.equal(r.status,200,JSON.stringify(r));
 const token=r.body.design.token;b.shop_config.garmentLogo='later-default';b.shop_config.garments[product].logoPreset={mode:'none'};
 const shared=(await json({action:'shared-load',id,token},{jwt:null})).body;assert.equal(shared.shop.garmentLogo,image);assert.deepEqual(shared.shop.garments[product].logoPreset,preset);
 b.shop_config.garmentLogo=image;b.shop_config.garments[product].logoPreset=preset;zip.file('brand/business-logo.png',new Uint8Array([1,2,3]));
 r=await json({action:'save',id:crypto.randomUUID(),businessId,title:'Tampered source',locked:true,revision:0},{file:await zip.generateAsync({type:'uint8array'})});assert.equal(r.status,400,'Original fixed-logo bytes must match');
 b.shop_config=before;
}
f.businesses.get(businessId).shop_config.fulfillmentMode='mymerchnow';assert.equal((await json({action:'list',businessId})).status,404,'Teams excluded');
console.log('PASS Print Shop sharing: verified ownership/MFA, private exact ZIPs, both engines, capability isolation, lock permissions, copies, revision conflicts, suspended shops and Team exclusion.');
