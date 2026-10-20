import assert from 'node:assert/strict';
import fs from 'node:fs';
import {demoVersions} from '../v20/template-demo.js';
import {assertTemplateDraft,cloneTemplate,remainingTemplateFields,assertCustomizedTemplate,logoFitScale,templateLayers} from '../v20/template-contract.js';
const original=structuredClone(demoVersions[0]);
for(const {layer} of templateLayers(original.payload))if(layer.type==='image'){layer.templateAssetPath=original.id+'/'+layer.id+'.png';layer.templateAssetHash='a'.repeat(64);}
assertTemplateDraft({...original,payload:original.payload});
const a=cloneTemplate(original),b=cloneTemplate(original);
assert.notEqual(a.designId,b.designId);assert.notEqual(a.design.template.copyId,b.design.template.copyId);
assert.equal(new Set([...templateLayers(a),...templateLayers(b)].map(x=>x.layer.id)).size,18);
assert.equal(a.design.zones.Back.layers[0].flipX,true);assert.equal(a.design.zones['Left Sleeve'].layers[0].label,'Sleeve flag');
assert.throws(()=>assertCustomizedTemplate(a,original),/sample details/);
assert.equal(remainingTemplateFields(a).length,6);
for(const {layer} of templateLayers(a)){if(layer.templateRole==='text')layer.text=layer.text.includes('555')?'804-123-4567':'Soft wash · Roofs · Driveways';if(layer.templateRole==='logo'){delete layer.templateAssetPath;layer.templateReplaced=true;layer.templateReplacementHash='b'.repeat(64);layer.src='data:image/png;base64,cmVwbGFjZW1lbnQ=';}}
assert.equal(remainingTemplateFields(a).length,0);assertCustomizedTemplate(a,original);
assert.equal(b.design.zones.Front.layers[2].text,'(555) 010-2026');assert.equal(original.payload.design.zones.Front.layers[2].text,'(555) 010-2026');
const reopen=JSON.parse(JSON.stringify(a));assertCustomizedTemplate(reopen,original);
for(const mutation of [p=>p.design.zones.Front.layers.shift(),p=>p.design.zones.Back.layers[0].flipX=false,p=>p.design.zones.Front.layers[0].x=9,p=>p.design.zones.Front.layers[0].templateRole='logo',p=>p.design.zones.Front.layers[0].visible=false,p=>p.design.zones.Front.layers.reverse(),p=>p.product.id='fleece-hoodie',p=>p.design.zones.Back.background='#fff',p=>p.design.zones.Front.layers[1].x=8]){
 const copy=structuredClone(a);mutation(copy);assert.throws(()=>assertCustomizedTemplate(copy,original));
}
const changed=structuredClone(original);changed.payload.design.zones.Front.layers[0].rotation=10;assert.throws(()=>assertCustomizedTemplate(a,changed));assertCustomizedTemplate(a,original);
const fit=logoFitScale([600,300],[300,900],[3763,4992],.25);assert(fit>0);const oldBase=Math.max(3763/600,4992/300)*.25,newBase=Math.max(3763/300,4992/900)*fit;assert(300*newBase<=600*oldBase+.001);assert(900*newBase<=300*oldBase+.001);
assert.equal(demoVersions.length,5);assert(demoVersions.every(v=>v.name.startsWith('UNPUBLISHED')));
const migration=fs.readFileSync(new URL('../supabase/migrations/20261020164602_premade_design_templates.sql',import.meta.url),'utf8');assert.match(migration,/enable row level security/g);assert.match(migration,/revoke all.*anon,authenticated/);assert.match(migration,/before update or delete/);assert(!/grant .*customer_designs/i.test(migration));
console.log('PASS template contract: five unpublished fixtures; independent copies; mirrored back/sleeve preservation; required fields; lock/zone/order/mapping tamper rejection; save/reopen; logo aspect-ratio containment; immutable versions; private schema grants.');
