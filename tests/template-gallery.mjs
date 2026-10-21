import assert from 'node:assert/strict';
import fs from 'node:fs';
import {demoVersions} from '../v20/template-demo.js';
import {assertTemplateDraft,cloneTemplate,remainingTemplateFields,assertCustomizedTemplate,logoFitScale,templateLayers} from '../v20/template-contract.js';
const original=structuredClone(demoVersions[0]);
for(const {layer} of templateLayers(original.payload))if(layer.type==='image'){layer.templateAssetPath=original.id+'/'+layer.id+'.png';layer.templateAssetHash='a'.repeat(64);}
assertTemplateDraft({...original,payload:original.payload});
// Back layouts on tops allow nine layers; other print zones retain six.
const overflow=structuredClone(original);
for(let n=7;n<9;n++){const id='extra-'+n;overflow.payload.design.zones.Back.layers.push({...overflow.payload.design.zones.Back.layers.at(-1),id});overflow.rules.push({zone:'Back',layerId:id,role:'text',label:'Extra'});}
assertTemplateDraft(overflow);
overflow.payload.design.zones.Back.layers.push({...overflow.payload.design.zones.Back.layers.at(-1),id:'overflow'});overflow.rules.push({zone:'Back',layerId:'overflow',role:'text',label:'Overflow'});assert.throws(()=>assertTemplateDraft(overflow),/up to 9 layers/);
const wrongZone=structuredClone(original);wrongZone.payload.design.zones.Front=structuredClone(wrongZone.payload.design.zones.Back);assert.throws(()=>assertTemplateDraft(wrongZone),/up to 6 layers/);
const a=cloneTemplate(original),b=cloneTemplate(original);
assert.notEqual(a.designId,b.designId);assert.notEqual(a.design.template.copyId,b.design.template.copyId);
assert.equal(new Set([...templateLayers(a),...templateLayers(b)].map(x=>x.layer.id)).size,24);
assert.equal(a.design.zones.Back.layers[0].flipX,true);assert.equal(a.design.zones['Left Sleeve'].layers[1].label,'Sleeve flag');
assert.throws(()=>assertCustomizedTemplate(a,original),/sample details/);
assert.equal(remainingTemplateFields(a).length,6);
for(const {layer} of templateLayers(a)){if(layer.templateRole==='text')layer.text=layer.label==='Phone number'?'804-123-4567':'Soft wash · Roofs · Driveways';if(layer.templateRole==='logo'){delete layer.templateAssetPath;layer.templateReplaced=true;layer.templateReplacementHash='b'.repeat(64);layer.src='data:image/png;base64,cmVwbGFjZW1lbnQ=';}}
assert.equal(remainingTemplateFields(a).length,0);assertCustomizedTemplate(a,original);
assert.equal(b.design.zones.Back.layers[3].text,'888-888-8888');assert.equal(original.payload.design.zones.Back.layers[3].text,'888-888-8888');
// Customer contact transformations must survive validation and a saved round trip.
for(const {layer} of templateLayers(a))if(['text','artwork'].includes(layer.templateRole)){layer.x=18;layer.y=-12;layer.scale=.8;layer.rotation=12;if(layer.type==='text'){layer.font='Impact';layer.color='#123456';}}
assertCustomizedTemplate(a,original);
const reopen=JSON.parse(JSON.stringify(a));assertCustomizedTemplate(reopen,original);
for(const change of [l=>l.scale=NaN,l=>l.x=Infinity,l=>l.scale=0,l=>l.type='image']){const copy=structuredClone(a);change(copy.design.zones.Back.layers[3]);assert.throws(()=>assertCustomizedTemplate(copy,original));}
const alteredSocial=structuredClone(a);alteredSocial.design.zones.Back.layers[2].templateAssetPath='unapproved-path';assert.throws(()=>assertCustomizedTemplate(alteredSocial,original),/social artwork/);
for(const mutation of [p=>p.design.zones.Front.layers.shift(),p=>p.design.zones.Back.layers[0].flipX=false,p=>p.design.zones.Front.layers[0].x=9,p=>p.design.zones.Front.layers[0].templateRole='logo',p=>p.design.zones.Front.layers[0].visible=false,p=>p.design.zones.Front.layers.reverse(),p=>p.product.id='fleece-hoodie',p=>p.design.zones.Back.background='#fff',p=>p.design.zones.Front.layers[1].x=8,p=>p.design.zones['Left Sleeve'].layers.reverse(),p=>p.design.zones['Right Sleeve'].layers[0].y=0,p=>p.design.zones['Left Sleeve'].layers[1].flipX=true]){
 const copy=structuredClone(a);mutation(copy);assert.throws(()=>assertCustomizedTemplate(copy,original));
}
const changed=structuredClone(original);changed.payload.design.zones.Front.layers[0].rotation=10;assert.throws(()=>assertCustomizedTemplate(a,changed));assertCustomizedTemplate(a,original);
const fit=logoFitScale([600,300],[300,900],[3763,4992],.25);assert(fit>0);const oldBase=Math.max(3763/600,4992/300)*.25,newBase=Math.max(3763/300,4992/900)*fit;assert(300*newBase<=600*oldBase+.001);assert(900*newBase<=300*oldBase+.001);
const croppedFit=logoFitScale([600,300],[300,900],[3763,4992],.25,{left:.2,right:.2,top:.1,bottom:.1});assert(croppedFit<=fit);
assert.equal(demoVersions.length,15);assert(demoVersions.every(v=>v.name.startsWith('UNPUBLISHED')));
const migration=fs.readFileSync(new URL('../supabase/migrations/20261020164602_premade_design_templates.sql',import.meta.url),'utf8');assert.match(migration,/enable row level security/g);assert.match(migration,/revoke all.*anon,authenticated/);assert.match(migration,/before update or delete/);assert(!/grant .*customer_designs/i.test(migration));
console.log('PASS template contract: fifteen unpublished variants; independent copies; mirrored back/sleeve preservation; required fields; lock/zone/order/mapping tamper rejection; save/reopen; logo aspect-ratio containment; immutable versions; private schema grants.');
