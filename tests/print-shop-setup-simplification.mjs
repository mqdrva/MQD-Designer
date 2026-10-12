import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {COLORS,SIZES,PRODUCT_OPTIONS} from '../v20/everyday-catalog.js';
import {shopPrintZones} from '../v20/print-shop-contract.js';
import {validateSetup} from '../supabase/functions/mqd-print-shop-setup/validation.js';
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.value='';this.className='';this.checked=false;}
 append(...nodes){this.children.push(...nodes);}
 before(node){this.previous=node;}
 addEventListener(){}
 setCustomValidity(message){this.validationMessage=message;}
 querySelectorAll(selector){const nodes=this.children.flatMap(c=>c instanceof Element?[c,...c.querySelectorAll('*')]:[]);if(selector==='*')return nodes;return nodes.filter(c=>selector==='input'?c.tag==='input':selector.startsWith('.')?c.className.split(' ').includes(selector.slice(1).replace(':checked',''))&&(!selector.endsWith(':checked')||c.checked):false);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const elements=Object.fromEntries(['shopSlug','setupStatus','garmentRows','premiumRows'].map(id=>[id,new Element('div')]));
const context=vm.createContext({document:{getElementById:id=>elements[id],createElement:tag=>new Element(tag),createTextNode:text=>text},location:{origin:'https://mymerchnow.app'},URL,Date,COLORS,SIZES,PRODUCT_OPTIONS,shopPrintZones});
const source=fs.readFileSync(new URL('../v20/print-shop-setup.js',import.meta.url),'utf8');
vm.runInContext(source.replace(/^import .*;\n/gm,'').split('for(const [id,name] of Object.entries(SHOP_PRINT_METHODS))')[0],context);
for(const [input,expected] of [['MQD SHOP','mqd-shop'],['https://mymerchnow.app/shops/MQD-Shop/3d','mqd-shop'],['  Brenda’s Designs  ','brenda-s-designs']]){elements.shopSlug.value=input;vm.runInContext('normalizeShopLink()',context);assert.equal(elements.shopSlug.value,expected);}
elements.shopSlug.value='ADMIN';vm.runInContext('normalizeShopLink()',context);assert.match(elements.shopSlug.validationMessage,/reserved/);
elements.shopSlug.readOnly=true;elements.shopSlug.value='existing-shop';vm.runInContext('normalizeShopLink()',context);assert.equal(elements.shopSlug.value,'existing-shop');
vm.runInContext("garmentRows('garmentRows',products);garmentRows('premiumRows',premiums)",context);
const shirt=elements.garmentRows.children[0];
for(const input of shirt.querySelectorAll('.offered-size'))input.checked=['M','XL'].includes(input.value);
for(const input of shirt.querySelectorAll('.offered-color'))input.checked=['Black','Forest Green'].includes(input.value);
shirt.querySelectorAll('*').find(e=>e.tag==='button').onclick();
for(const row of elements.garmentRows.children){assert.deepEqual(row.querySelectorAll('.offered-size:checked').map(i=>i.value),['M','XL']);assert(row.querySelectorAll('.offered-color:checked').some(i=>i.value==='Black'));}
assert(elements.garmentRows.children[3].querySelectorAll('.offered-color:checked').some(i=>i.value==='Forest'));
assert.equal(elements.garmentRows.children[3].querySelector('.garment-enabled').checked,false,'disabled garments receive shared selections for later');
const premium=elements.premiumRows.children[0];assert.equal(premium.querySelectorAll('.offered-color').length,0);assert.equal(premium.querySelectorAll('.dimension-row').length,0);assert(premium.querySelectorAll('.offered-size').length>0);
premium.querySelector('.garment-brand').value='';premium.querySelector('.garment-style').value='';
const collected=JSON.parse(vm.runInContext("JSON.stringify(collectGarments('premiumRows'))",context));assert(collected.tshirt.sizes.length);assert.equal(Object.keys(collected.tshirt.printZones).length,0);
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/print-shop-setup.json',import.meta.url)));fixture.plan='3d';fixture.shop.garments.tshirt=collected.tshirt;fixture.shop.pricing.premiumCents={tshirt:4000};const validated=validateSetup(fixture);assert(validated.shop.garments.tshirt.sizes.length);assert.equal(validated.shop.pricing.premiumCents.tshirt,4000);
assert.equal(validated.shop.garments.tshirt.brand,'');assert.equal(validated.shop.garments.tshirt.style,'');
vm.runInContext("sharedSetup('garmentRows');sharedSetup('premiumRows')",context);
const common=elements.garmentRows.previous;
common.querySelector('.shared-brand').value='Shared supplier';
for(const input of common.querySelectorAll('.shared-size'))input.checked=['L','2XL'].includes(input.value);
for(const input of common.querySelectorAll('.shared-color'))input.checked=input.value==='Black';
common.querySelectorAll('*').find(e=>e.tag==='button').onclick();
for(const row of elements.garmentRows.children){assert.equal(row.querySelector('.garment-brand').value,'Shared supplier');assert.deepEqual(row.querySelectorAll('.offered-size:checked').map(i=>i.value),['L','2XL']);assert.deepEqual(row.querySelectorAll('.offered-color:checked').map(i=>i.value),['Black']);}
shirt.querySelectorAll('.offered-size').find(i=>i.value==='L').checked=false;
assert.deepEqual(shirt.querySelectorAll('.offered-size:checked').map(i=>i.value),['2XL']);
assert.deepEqual(elements.garmentRows.children[1].querySelectorAll('.offered-size:checked').map(i=>i.value),['L','2XL']);
const common3d=elements.premiumRows.previous;
assert.equal(common3d.querySelectorAll('.shared-color').length,0);
for(const input of common3d.querySelectorAll('.shared-size'))input.checked=input.value==='M';
common3d.querySelectorAll('*').find(e=>e.tag==='button').onclick();
for(const row of elements.premiumRows.children)assert.deepEqual(row.querySelectorAll('.offered-size:checked').map(i=>i.value),['M']);
console.log('Passed: link normalization, reserved names, immutable owner link, shared 2D sizes/colors, later-enabled garments, simplified 3D fields, and backend-compatible setup.');
