import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import JSZip from 'jszip';
import {validateSetup} from '../supabase/functions/mqd-print-shop-setup/validation.js';
import {HAT_FIT,shopPrintZones,shop2dViews,requestEstimate,validateGarmentLogo} from '../v20/print-shop-contract.js';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
import {validateShopDesignPackage} from '../supabase/functions/mqd-print-shop-designs/package.js';
import {fixture,packageFor,businessId} from './print-shop-design-fixture.mjs';
const packet=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url)));
packet.plan='3d';packet.shop.pricing.baseCents={'shop-hat':2500};packet.shop.pricing.premiumCents={hat:2500};
packet.shop.garments={ 'shop-hat':{brand:'Synthetic',style:'Measured cap',sizes:[HAT_FIT],colors:['Red','White'],printZones:{front:{width:3,height:3}}},hat:{brand:'Synthetic',style:'3D cap',sizes:[HAT_FIT],colors:['White'],printZones:{}}};
const shop=validateSetup(packet).shop;
assert.deepEqual(shop2dViews('shop-hat'),['front']);
assert.deepEqual(Object.keys(shopPrintZones(shop,'shop-hat')),['front']);
assert.deepEqual(Object.keys(shopPrintZones(shop,'hat')),GARMENT_MAPPING.hat.zones);
for(const z of GARMENT_MAPPING.hat.zones){assert.equal(shopPrintZones(shop,'hat')[z].width,GARMENT_MAPPING.hat.templates[z].width);assert.equal(shopPrintZones(shop,'hat')[z].height,GARMENT_MAPPING.hat.templates[z].height);}
for(const zones of [undefined,{}, {front:{width:3,height:4}}, {front:{width:3,height:3},back:{width:3,height:3}}])assert.throws(()=>shopPrintZones({garments:{'shop-hat':{printZones:zones}}},'shop-hat'));
for(const product of ['shop-hat','hat'])assert.throws(()=>validateGarmentLogo({mode:'fixed'},shop,product));
const invalid=structuredClone(packet);invalid.shop.garments.hat.sizes=['L'];assert.throws(()=>validateSetup(invalid));
const team=structuredClone(packet);team.shop.organizationType='team';assert.throws(()=>validateSetup(team),'No expansion of Team products');
for(const engine of ['2d','3d']){
 const id=engine==='2d'?'shop-hat':'hat',p=await packageFor(engine),zip=await JSZip.loadAsync(p.bytes),env=fixture();
 const current=env.businesses.get(businessId);current.shop_config=structuredClone(shop);current.shop_config.slug=current.preferred_slug;
 p.saved.shop=current.preferred_slug;
 p.order={...p.order,productId:id,printMethod:'htv',orderOptions:[{size:HAT_FIT,quantity:2}],locations:[engine==='2d'?'front':'front panel']};
 if(engine==='2d'){p.saved.draft.product=id;p.saved.draft.printMethod='htv';p.saved.draft.size=HAT_FIT;p.saved.draft.artwork.front.placement={x:.5,y:.5,width:2,height:2};p.saved.draft.artwork.front.texts=[];}
 else{const m=GARMENT_MAPPING.hat;p.saved.design.product={id,model:m.model};p.saved.design.templates=m.templates;p.saved.design.activeZone='Front Panel';p.saved.design.design.zones={'Front Panel':p.saved.design.design.zones.Front,'Top of Bill':{layers:[],background:'#ffffff'}};}
 assert.equal(requestEstimate(shop,p.order).quoteRequired,true,'Hat quote does not invent shirt print fees');
 for(const bad of [{...p.order,locations:['back']},{...p.order,orderOptions:[{size:'6XL',quantity:1}]}])assert.throws(()=>requestEstimate(shop,bad));
 zip.file('design.json',JSON.stringify(p.saved));zip.file('order-request.json',JSON.stringify(p.order));
 const bytes=await zip.generateAsync({type:'uint8array'});
 assert.equal((await validateShopDesignPackage(bytes,current.shop_config,JSZip)).productId,id);
 const designId=crypto.randomUUID();let res=await env.call({action:'save',id:designId,businessId,title:'Synthetic hat',locked:true,revision:0},{file:bytes});assert.equal(res.status,200,await res.clone().text());const saved=(await res.json()).design;
 const loaded=await env.call({action:'shared-package',id:designId,token:saved.token,revision:1},{jwt:null});assert.equal(loaded.status,200);assert.deepEqual(new Uint8Array(await loaded.arrayBuffer()),bytes);
 assert.equal((await env.call({action:'save',id:designId,businessId,title:'forged',locked:false,revision:1},{jwt:null,file:bytes})).status,401);
 res=await env.call({action:'lock',id:designId,businessId,locked:false,revision:1});assert.equal(res.status,200);assert.deepEqual(env.files.get(env.designs.get(designId).package_path),bytes,'Unlocking keeps the original');
 const bad=structuredClone(p.saved);if(engine==='2d')bad.draft.artwork.back=bad.draft.artwork.front;else bad.design.design.zones.Back={layers:[]};zip.file('design.json',JSON.stringify(bad));
 const tampered=await zip.generateAsync({type:'uint8array'});await assert.rejects(()=>validateShopDesignPackage(tampered,current.shop_config,JSZip));
}
console.log('PASS hats: owner setup, square front-only 2D, frozen 3D zones, fit, quotes, original ZIP preservation, private sharing and zone tampering.');
