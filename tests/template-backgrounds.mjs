import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadImage} from '@napi-rs/canvas';
import {demoVersions} from '../v20/template-demo.js';
import {assertTemplateDraft,cloneTemplate,templateLayers,remainingTemplateFields,assertCustomizedTemplate} from '../v20/template-contract.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../docs/template-backgrounds.json',import.meta.url)));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function placement(v){return{product:v.payload.product,engine:v.payload.engine,templates:v.payload.templates,zones:Object.fromEntries(Object.entries(v.payload.design.zones).map(([z,s])=>[z,s.layers.map(l=>Object.fromEntries(['id','type','x','y','scale','rotation','flipX','flipY','crop','visible'].filter(k=>k in l).map(k=>[k,l[k]])))]))};}
assert.equal(manifest.received.length,17);assert.equal(manifest.slots.length,5);assert.equal(demoVersions.length,5);
assert.equal(new Set(manifest.slots.map(s=>s.filename)).size,5);
for(const [i,version] of demoVersions.entries()){
 assertTemplateDraft(version);assert.match(version.name,/^UNPUBLISHED/);assert.equal(manifest.slots[i].status,'unpublished-draft');
 assert.equal(hash(JSON.stringify(placement(version))),manifest.placementHashes[i],'Existing garment/layer placement must be unchanged');
 const receipt=manifest.received.find(r=>r.filename==='assets/'+version.backgroundSource);assert(receipt?.received);
 assert(!/american/.test(version.backgroundSource),'Never mirror embedded American flags with the back background');
 const file=new URL('../assets/template-backgrounds/'+version.backgroundSource,import.meta.url),bytes=fs.readFileSync(file);
 assert.equal(hash(bytes),receipt.sha256,'Use exact original bytes, including alpha');
 const image=await loadImage(file.pathname);assert.equal(image.width,1024);assert.equal(image.height,1536);
 for(const zone of ['Front','Back']){
  const layers=version.payload.design.zones[zone].layers;
  assert.equal(layers[0].src,'/assets/template-backgrounds/'+version.backgroundSource);
  assert.equal(version.rules.find(r=>r.layerId===layers[0].id).role,'locked');
  assert.equal(version.rules.find(r=>r.layerId===layers[1].id).role,'logo');
  assert.equal(layers[2].type,'text');assert.equal(layers[3].type,'text');
  const preview=await loadImage(new URL('..'+version.previews[zone],import.meta.url).pathname);assert.equal(preview.width,600);assert.equal(preview.height,800);
 }
 assert.equal(version.payload.design.zones.Front.layers[0].flipX,false);assert.equal(version.payload.design.zones.Back.layers[0].flipX,true);
 const flag=version.payload.design.zones['Left Sleeve'].layers[0];assert.equal(flag.flipX,false);assert.equal(flag.flipY,false);
 const source=structuredClone(version);
 for(const {layer} of templateLayers(source.payload))if(layer.type==='image'){layer.templateAssetPath=source.id+'/'+layer.id;layer.templateAssetHash=hash(fs.readFileSync(new URL('..'+layer.src,import.meta.url)));}
 const a=cloneTemplate(source),b=cloneTemplate(source);assert.notEqual(a.designId,b.designId);
 const text=a.design.zones.Front.layers.find(l=>l.templateRole==='text');text.text='804-555-0199';
 assert.equal(b.design.zones.Front.layers[2].text,'(555) 010-2026');assert.equal(version.payload.design.zones.Front.layers[2].text,'(555) 010-2026');
 assert(templateLayers(a).filter(x=>x.layer.templateRole==='locked').length===3);
 for(const {layer} of templateLayers(a)){
  if(layer.templateRole==='text')layer.text=layer.label==='Phone number'?'804-555-0199':'Customer services';
  if(layer.templateRole==='logo'){delete layer.templateAssetPath;layer.templateReplaced=true;layer.templateReplacementHash=receipt.sha256;layer.src='data:image/'+(receipt.format==='PNG'?'png':'jpeg')+';base64,'+bytes.toString('base64');}
 }
 assert.equal(remainingTemplateFields(a).length,0);assertCustomizedTemplate(a,source);assertCustomizedTemplate(JSON.parse(JSON.stringify(a)),source);
 assert.equal(remainingTemplateFields(b).length,6);
}
console.log('PASS all 17 receipts; five original backgrounds and ten decoded previews; unchanged garment/zone/layer geometry and back mirroring; unmoved/unmirrored sleeve flag; locked backgrounds, separate logos/live text; five independent draft copies.');
