import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {maxZoneLayers,TOP_BACK_PRODUCTS} from '../v20/layer-capacity.js';
import {GARMENT_MAPPING} from '../v20/garment-mapping-catalog.js';
import {demoVersions} from '../v20/template-demo.js';
import {cloneTemplate,templateLayers,assertCustomizedTemplate} from '../v20/template-contract.js';
assert.equal(TOP_BACK_PRODUCTS.length,8);
for(const [id,p] of Object.entries(GARMENT_MAPPING))for(const zone of p.zones){
 const expected=TOP_BACK_PRODUCTS.includes(id)&&zone==='Back'?9:6;
 assert.equal(maxZoneLayers({id},zone),expected);
 for(const file of ['editor.js','shop-editor.js']){
  const source=fs.readFileSync(new URL('../v20/'+file,import.meta.url),'utf8');
  const guard=source.match(/^function canAddLayer\(.*$/m)[0],layers=Array.from({length:expected-1},()=>({})),notices=[];
  const ctx={maxZoneLayers,product:{id},activeZone:zone,zoneState:()=>({layers}),alert:m=>notices.push(m)};
  assert.equal(vm.runInNewContext(guard+';canAddLayer()',ctx),true);
  layers.push({});assert.equal(vm.runInNewContext(guard+';canAddLayer()',ctx),false);assert.match(notices[0],new RegExp(String(expected)));
 }
}
const version=structuredClone(demoVersions[0]),copy=cloneTemplate(version);
for(const {layer} of templateLayers(copy)){
 if(layer.templateRole==='text')layer.text='Customer '+layer.label;
 if(layer.templateRole==='logo'){layer.templateReplaced=true;layer.templateReplacementHash='b'.repeat(64);layer.src='customer-logo';}
}
copy.design.zones.Back.layers.push({id:'customer-extra-logo',type:'image',src:'customer-extra-logo',x:3,y:-15,scale:.2,rotation:0,visible:true},{id:'customer-extra-text',type:'text',text:'Extra detail',x:0,y:20,scale:.3,rotation:0,visible:true});
assert.equal(copy.design.zones.Back.layers.length,9);
assertCustomizedTemplate(copy,version);
const reopened=JSON.parse(JSON.stringify(copy));assertCustomizedTemplate(reopened,version);
assert.equal(reopened.design.zones.Back.layers[7].src,'customer-extra-logo');
assert.equal(version.payload.design.zones.Back.layers.length,7);
const full=structuredClone(copy);full.design.zones.Back.layers.push({id:'tenth',type:'text'});assert.throws(()=>assertCustomizedTemplate(full,version),/limit/);
const tampered=structuredClone(copy);tampered.design.zones.Back.layers[0].x=20;assert.throws(()=>assertCustomizedTemplate(tampered,version),/Locked/);
console.log('PASS nine back layers on all eight tops in both editors; other zones unchanged; added logo/text survive template validation and save/reopen; tenth layer and locked-artwork changes rejected.');
