import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {validateSetup} from '../supabase/functions/mqd-print-shop-setup/validation.js';
import {fixedLogoLayer,assertFixedLogoPackage,garmentLogoPath,requestEstimate,shopPrintZones} from '../v20/print-shop-contract.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url),'utf8'));
const logo='data:image/png;base64,'+(await fs.readFile(new URL('../assets/brand-logo.png',import.meta.url))).toString('base64');
fixture.shop.organizationType='team';fixture.shop.garmentLogo=logo;
const id=Object.keys(fixture.shop.pricing.baseCents)[0];
fixture.shop.garments[id].logoPreset={mode:'fixed',placement:'center',width:3,height:3,top:1};
const shop=validateSetup(fixture).shop;assert.equal(shop.organizationType,'team');assert.equal(shop.garments[id].logoPreset.mode,'fixed');
for(const bad of [{mode:'fixed',width:20,height:3,top:0,placement:'center'},{mode:'fixed',width:3,height:20,top:0,placement:'center'},{mode:'bad'}]){const f=structuredClone(fixture);f.shop.garments[id].logoPreset=bad;assert.throws(()=>validateSetup(f));}
const noLogo=structuredClone(fixture);noLogo.shop.garmentLogo='';assert.throws(()=>validateSetup(noLogo));
const summary={engine:'3d',productId:id,locations:['front']},preset=shop.garments[id].logoPreset,manifest={product:id,preset,asset:garmentLogoPath(shop)},expected=fixedLogoLayer(shop,id),design={design:{design:{zones:{Front:{layers:[expected]}}}}};
assertFixedLogoPackage(shop,summary,design,manifest);
for(const field of ['src','visible','x','scale','shopLogoPreset']){const altered=structuredClone(design);altered.design.design.zones.Front.layers[0][field]=field==='visible'?false:'tampered';assert.throws(()=>assertFixedLogoPackage(shop,summary,altered,manifest));}
const covered=structuredClone(design);covered.design.design.zones.Front.layers.push({type:'image'});assert.throws(()=>assertFixedLogoPackage(shop,summary,covered,manifest));
assert.throws(()=>assertFixedLogoPackage(shop,{...summary,locations:[]},design,manifest));
// Execute actual 3D invariants and controls: imports, JSON tampering, undo-style deletion cannot remove a fixed logo.
const source=await fs.readFile(new URL('../v20/shop-editor.js',import.meta.url),'utf8');
const context={window:{MQDPrintShop:shop},garmentLogo:(s,p)=>s.garments[p].logoPreset,fixedLogoLayer,product:{id},state:{zones:{Front:{layers:[]}}},businessLogoReady:true,businessLogoImage:{},stateFor(){return this.state;}};
context.stateFor=()=>context.state;vm.createContext(context);
vm.runInContext(source.match(/function ensureBusinessLogo\(\)\{[\s\S]*?\n\}/)[0],context);
context.ensureBusinessLogo();assert.equal(context.state.zones.Front.layers.length,1);context.state.zones.Front.layers[0].x=90;context.ensureBusinessLogo();assert.equal(context.state.zones.Front.layers[0].x,0);
context.state.zones.Front.layers=[];context.ensureBusinessLogo();assert.equal(context.state.zones.Front.layers[0].shopFixed,true);
context.state.zones.Back={layers:[{...expected}]};context.ensureBusinessLogo();assert.equal(context.state.zones.Back.layers.length,0);
assert(source.includes('if(!l||l.shopFixed)return false;'));
assert(source.includes('function drawImageLayer(c,l,b){\n if(l.shopFixed&&l.image)'));
assert(source.includes('return drawMappedImageLayer(c,l,b);'));
assert(source.includes("if(!l||l.shopFixed)return;snapshot();l.visible"));
const polo={garments:{'everyday-polo':{logoPreset:{placement:'center'}}}};assert.equal(shopPrintZones(polo,'everyday-polo').front.placement,'center');assert.equal(shopPrintZones({garments:{}},'everyday-polo').front.placement,'left-chest');
assert.equal((await fs.readFile(new URL('../supabase/functions/mqd-print-shop-pilot/contract.js',import.meta.url),'utf8')),(await fs.readFile(new URL('../v20/print-shop-contract.js',import.meta.url),'utf8')));
await fs.writeFile(join(tmpdir(),'brand-team-preview.json'),JSON.stringify(fixture));
console.log('Logo checks passed: validated setup, immutable fixed layer restoration, package tampering rejection, original asset references, and unchanged legacy polo defaults.');
