import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {loadImage,createCanvas} from '@napi-rs/canvas';
import {demoVersions} from '../v20/template-demo.js';
import {assertTemplateDraft,cloneTemplate,templateLayers,remainingTemplateFields,assertCustomizedTemplate} from '../v20/template-contract.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../docs/template-backgrounds.json',import.meta.url)));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function protectedPlacement(v){return{product:v.payload.product,engine:v.payload.engine,templates:v.payload.templates,zones:Object.fromEntries(Object.entries(v.payload.design.zones).map(([z,s])=>[z,{background:s.background,layers:s.layers.filter(l=>z.includes('Sleeve')?!l.id.endsWith('-background'):!['Front','Back'].includes(z)||l.id.endsWith('-background')).map(l=>Object.fromEntries(['id','type','x','y','scale','rotation','flipX','flipY','crop','visible'].filter(k=>k in l).map(k=>[k,l.id==='sleeve-flag'&&k==='scale'?manifest.layoutRevision.flag.previousScale:k==='flipX'&&z==='Back'&&l.id==='Back-background'?true:l[k]])))}]))};}
assert.equal(manifest.received.length,17);assert.equal(manifest.slots.length,15);assert.equal(demoVersions.length,15);
assert.equal(new Set(manifest.slots.map(s=>s.filename)).size,15);
assert.deepEqual(Object.fromEntries(['Pressure Washing','Lawn Care','HVAC','Pool Care','General Business'].map(c=>[c,manifest.slots.filter(s=>s.category===c).length])),{'Pressure Washing':6,'Lawn Care':3,HVAC:1,'Pool Care':3,'General Business':2});
for(const [i,version] of demoVersions.entries()){
 assert.deepEqual(version.categories,[manifest.slots[i].category]);assertTemplateDraft(version);assert.match(version.name,/^UNPUBLISHED/);assert.equal(manifest.slots[i].status,'unpublished-draft');
 assert.equal(hash(JSON.stringify(protectedPlacement(version))),manifest.protectedPlacementHashes[manifest.slots[i].layoutSlot-1],'Existing garment, background and sleeve placement must be unchanged');
 const receipt=manifest.received.find(r=>r.filename==='assets/'+version.backgroundSource);assert(receipt?.received);
 const embeddedFlag=/american/.test(version.backgroundSource);assert.equal(manifest.slots[i].mirrorPattern,!embeddedFlag);
 const file=new URL('../assets/template-backgrounds/'+version.backgroundSource,import.meta.url),bytes=fs.readFileSync(file);
 assert.equal(hash(bytes),receipt.sha256,'Use exact original bytes, including alpha');
 const image=await loadImage(file.pathname);assert.equal(image.width,1024);assert.equal(image.height,1536);
 for(const zone of ['Front','Back']){
  const layers=version.payload.design.zones[zone].layers;
  assert.equal(layers[0].src,'/assets/template-backgrounds/'+version.backgroundSource);
  assert.equal(version.rules.find(r=>r.layerId===layers[0].id).role,'locked');
  assert.equal(version.rules.find(r=>r.layerId===layers[1].id).role,'logo');
  if(zone==='Front'){assert.equal(layers.length,2);assert(layers.every(l=>l.type==='image'));}
  else{assert.equal(layers.length,7);assert.equal(layers[2].label,'Instagram • Facebook • Google');assert.equal(layers[3].text,'888-888-8888');assert(layers.slice(3).every(l=>l.type==='text'&&l.x===0&&l.align==='center'&&l.font==='Impact'));}
  const blank=await loadImage(new URL('..'+layers[1].src,import.meta.url).pathname),canvas=createCanvas(blank.width,blank.height),c=canvas.getContext('2d');c.drawImage(blank,0,0);const pixels=c.getImageData(0,0,blank.width,blank.height).data;assert(pixels.every((v,index)=>index%4!==3||v===0),'Starter shirt must have no printed placeholder logo');
  const preview=await loadImage(new URL('..'+version.previews[zone],import.meta.url).pathname);assert.equal(preview.width,600);assert.equal(preview.height,800);
 }
 assert.equal(version.payload.design.zones.Front.layers[0].flipX,false);assert.equal(version.payload.design.zones.Back.layers[0].flipX,!embeddedFlag);
 for(const zone of ['Left Sleeve','Right Sleeve']){
  const layers=version.payload.design.zones[zone].layers,bg=layers[0];
  assert.equal(layers.length,zone==='Left Sleeve'?2:1);
  assert.equal(bg.id,zone.replace(' ','-')+'-background');
  assert.equal(bg.src,'/assets/template-backgrounds/'+version.backgroundSource);
  assert.equal(bg.y,manifest.sleeveBackground.y);assert.equal(bg.x,0);assert.equal(bg.scale,1);assert.equal(bg.rotation,0);
  assert.equal(bg.flipX,zone==='Right Sleeve'&&!embeddedFlag);assert.equal(bg.flipY,false);
  assert.equal(version.rules.find(r=>r.zone===zone&&r.layerId===bg.id).role,'locked');
  const preview=await loadImage(new URL('..'+version.previews[zone],import.meta.url).pathname);
  assert.equal(preview.width,600);assert.equal(preview.height,359);
 }
 const flag=version.payload.design.zones['Left Sleeve'].layers[1];assert.equal(flag.flipX,false);assert.equal(flag.flipY,false);assert.equal(flag.scale,.20);
 const back=version.payload.design.zones.Back.layers;assert.equal(back[2].y,-25);assert.equal(back[3].y,-13);assert(back[3].y-back[2].y<18);assert.deepEqual(back.slice(4).map(l=>l.y),[1,12,23]);
 assert.equal(back[6].text,'& MORE!');assert(back.slice(4).every(l=>!l.text.includes('•')&&!l.text.includes('\n')));
 if(i===0)assert.deepEqual(back.slice(4).map(l=>l.text),['PRESSURE WASHING','SOFT WASHING','& MORE!']);
 const layout=demoVersions[manifest.slots[i].layoutSlot-1];
 for(const side of ['Front','Back'])assert.deepEqual(version.payload.design.zones[side].layers.slice(1),layout.payload.design.zones[side].layers.slice(1),'Background variants must keep the exact same logos/contact layout');
 assert.deepEqual(version.rules,layout.rules,'Editing permissions must match the source industry layout');
 const source=structuredClone(version);
 for(const {layer} of templateLayers(source.payload))if(layer.type==='image'){layer.templateAssetPath=source.id+'/'+layer.id;layer.templateAssetHash=hash(fs.readFileSync(new URL('..'+layer.src,import.meta.url)));}
 const a=cloneTemplate(source),b=cloneTemplate(source);assert.notEqual(a.designId,b.designId);
 const text=a.design.zones.Back.layers.find(l=>l.templateRole==='text');text.text='804-555-0199';
 assert.equal(b.design.zones.Back.layers[3].text,'888-888-8888');assert.equal(version.payload.design.zones.Back.layers[3].text,'888-888-8888');
 assert(templateLayers(a).filter(x=>x.layer.templateRole==='locked').length===5);
 for(const {layer} of templateLayers(a)){
  if(layer.templateRole==='text')layer.text=layer.label==='Phone number'?'804-555-0199':'Customer services';
  if(layer.templateRole==='logo'){delete layer.templateAssetPath;layer.templateReplaced=true;layer.templateReplacementHash=receipt.sha256;layer.src='data:image/'+(receipt.format==='PNG'?'png':'jpeg')+';base64,'+bytes.toString('base64');}
 }
 assert.equal(remainingTemplateFields(a).length,0);assertCustomizedTemplate(a,source);assertCustomizedTemplate(JSON.parse(JSON.stringify(a)),source);
 assert.equal(remainingTemplateFields(b).length,6);
}
console.log('PASS all 17 receipts; fifteen original backgrounds and sixty decoded body/sleeve previews; unchanged garment/body background/flag geometry and safe background orientation; owner-requested blank logo slots and centered social/phone/services layout; smaller centered/unmirrored sleeve flag; raised contact rows and three editable Impact service lines; locked matching backgrounds on both sleeves below flag, separate logos/live text; fifteen independent draft copies.');
