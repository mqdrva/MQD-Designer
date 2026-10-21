import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {remainingTemplateFields,cloneTemplate,logoFitScale,templateLayers,isEditableTemplateLayer,isEmptyTemplateLogo} from '../v20/template-contract.js';
import {demoVersions} from '../v20/template-demo.js';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
// Exercise the actual browser draft save functions, not a replacement copy implementation.
const customer=read('v20/customer.js'),slice=(start,end)=>customer.slice(customer.indexOf(start),customer.indexOf(end));
const rows=[],uploads=[],userId=crypto.randomUUID(),oldDesign=crypto.randomUUID();
const payload=cloneTemplate(demoVersions[0]);delete payload.design.template.demo;
for(const {zone,layer} of templateLayers(payload))if(layer.type==='image'){
 if(['locked','artwork'].includes(layer.templateRole)){layer.templateAssetPath='immutable/'+layer.id;delete layer.src;}
 else{layer.src='data:image/png;base64,iVBORw0KGgo=';layer.storagePath=userId+'/designs/'+oldDesign+'/'+zone+'/old.png';layer.templateReplaced=true;layer.templateReplacementHash='a'.repeat(64);}
}
const context=vm.createContext({structuredClone,crypto,Date,console,accountUser:()=>({id:userId}),activeCloudDesign:{id:oldDesign,status:'draft',version:1,name:'Old design'},
 dataUrlToBlob:async src=>(await fetch(src)).blob(),uploadCustomerArtwork:async(path,blob)=>uploads.push({path,blob}),originalArtworkBlob:async()=>null,mockupBlob:async()=>null,
 supabase:{from:()=>({upsert:record=>({select:()=>({single:async()=>{rows.push(structuredClone(record));return{data:record,error:null};}})})})}});
vm.runInContext(slice('function fileExtension(', 'async function uploadCustomerArtwork(')+slice('function designColors(', 'async function saveCartCloudDesign('),context);
context.payload=payload;await vm.runInContext('saveCloudDesign(payload,{forceNew:true})',context);await vm.runInContext('saveCloudDesign(payload,{forceNew:true})',context);
assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].design_json.designId,rows[0].id);assert.equal(uploads.length,4);assert(uploads.every(u=>!u.path.includes(oldDesign)));assert.equal(new Set(uploads.map(u=>u.path)).size,4);assert.equal(payload.design.zones.Front.layers[1].storagePath.includes(oldDesign),true);
// Exercise actual guest preflight and early event interception. No external calls are permitted.
let clickHandler;let notifications=[];const guestSource=read('v20/guest-checkout.js').replace(/^import .*\n/gm,'');
const guestContext=vm.createContext({remainingTemplateFields,garmentPrice:()=>40,pricingEpoch:()=> 'fixture',createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}}),
 document:{addEventListener:(event,fn)=>{if(event==='click')clickHandler=fn;},readyState:'loading'},window:{MQDDesigner:{exportDesign:()=>cloneTemplate(demoVersions[0])}},location:{search:''},URLSearchParams,Promise,console,setTimeout,clearTimeout,alert:message=>notifications.push(message)});
vm.runInContext(guestSource,guestContext);let stopped=false;clickHandler({target:{closest:selector=>selector==='#addToCart'?{}:null},preventDefault(){},stopImmediatePropagation(){stopped=true;}});assert(stopped);assert.match(notifications[0],/Phone number.*Back/);assert.match(notifications[0],/Services line 1.*Back/);
// Preview guard binds at window capture before competing document handlers.
let previewHandler;vm.runInNewContext(read('v20/template-preview-guard.js'),{URLSearchParams,location:{search:'?templateDemo=fixture'},window:{addEventListener:(event,fn,capture)=>{assert.equal(capture,true);previewHandler=fn;}},alert:message=>notifications.push(message)});
let prevented=false;previewHandler({target:{closest:selector=>selector.includes('#addToCart')?{}:null},preventDefault(){prevented=true;},stopImmediatePropagation(){}});assert(prevented);assert.match(notifications.at(-1),/ordering actions are disabled/);
// Pure fit calculation used by the actual image field replacement preserves aspect ratio.
assert(logoFitScale([600,300],[300,900],[3763,4992],.25)>0);
console.log('PASS actual client save and guest handlers: independent design IDs and private logo assets, immutable backgrounds retained, no source mutation, sample-field interception before upload, early demo protection.');

// Actual editor guards: only customer details gain controls. Empty logo slots
// have no hit/selection rectangle; uploaded logos regain their normal outline.
const editor=read('v20/editor.js');
const lineFunction=name=>editor.match(new RegExp('function '+name+'\\([^\\n]+'))[0];
let selected;const guard=vm.createContext({isEditableTemplateLayer,isEmptyTemplateLogo,activeLayer:()=>selected,renderLayerPanel(){},renderPrintQuality(){},drawEditor(){},scheduleGarmentPreview(){},renderAll(){},syncTextFontPreview(){},document:{fonts:null}});
vm.runInContext(['isLockedLibraryLayer','updateLayer','updateTextProp'].map(lineFunction).join('\n'),guard);
for(const role of ['text','artwork','locked','logo']){
 selected={templateRole:role,x:0,y:0,scale:1,rotation:0,type:role==='text'?'text':'image'};
 guard.next=role;assert.equal(vm.runInContext('isLockedLibraryLayer()',guard),!['text','artwork'].includes(role));
 vm.runInContext("updateLayer('x',25);updateLayer('scale',.8)",guard);
 assert.equal(selected.x,['text','artwork'].includes(role)?25:0);
 assert.equal(selected.scale,['text','artwork'].includes(role)?.8:1);
 if(role==='text'){vm.runInContext("updateTextProp('text','MY SERVICES');updateTextProp('color','#123456')",guard);assert.equal(selected.text,'MY SERVICES');assert.equal(selected.color,'#123456');}
}
selected={type:'image',libraryAssetId:'background',libraryLocked:true};assert(vm.runInContext('isLockedLibraryLayer()',guard));
selected={type:'image'};assert.equal(vm.runInContext('isLockedLibraryLayer()',guard),false);
const rectSource=editor.slice(editor.indexOf('function activeLayerScreenRect('),editor.indexOf('// @mapping-begin rotateSelectionPoint'));
vm.runInContext(rectSource,guard);guard.slot={templateRole:'logo',templateReplaced:false};assert.equal(vm.runInContext('activeLayerScreenRect(slot)',guard),null);assert.equal(isEmptyTemplateLogo({...guard.slot,templateReplaced:true}),false);
console.log('PASS actual template editor guards: contact movement/size/text styling enabled, background/flag/logo locks retained, empty logo slots excluded from selection.');
