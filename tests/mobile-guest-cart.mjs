import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {garmentPrice,pricingEpoch} from '../v20/promotion-pricing.js';

const source=readFileSync(new URL('../v20/guest-checkout.js',import.meta.url),'utf8')
  .replace(/^import .*\n/gm,'');
const saved=new Map();
const cartButton={textContent:'Cart (0)'};
const addButton={textContent:'Add to Cart',disabled:false};
let canvasReads=0;
let uploads=0;
let uploadedArtworkBytes=0;
class MockXMLHttpRequest{
  headers={};
  open(method,url){assert.equal(method,'POST');assert.match(url,/submit-mqd-guest-design$/);}
  setRequestHeader(name,value){this.headers[name]=value;assert.ok(value);}
  send(body){
    assert.ok(body instanceof ArrayBuffer,'send materialized bytes instead of file-backed FormData');
    assert.ok(body.byteLength>0);
    void this.receive(body);
  }
  async receive(body){
    const form=await new Response(body,{headers:{'Content-Type':this.headers['Content-Type']}}).formData();
    uploads++;
    uploadedArtworkBytes=form.get('asset')?.size||0;
    assert.deepEqual(new Uint8Array(await form.get('asset').arrayBuffer()),new Uint8Array([137,80,78,71,13,10,26,10]),'artwork bytes must survive multipart encoding');
    assert.equal(form.get('guestToken').length,36);
    assert.equal(JSON.parse(form.get('payload')).product.id,'short-sleeve-polo');
    assert.ok(uploadedArtworkBytes>0,'mobile request must include image bytes');
    assert.equal(form.getAll('assetMeta').length,1);
    this.status=200;
    this.responseText=JSON.stringify({ok:true,orderNumber:'MQD-TEST123'});
    this.onload();
  }
}
const document={
  getElementById(id){
    if(id==='webgl'){canvasReads++;throw new Error('Mobile must not capture WebGL');}
    if(id==='cartButton')return cartButton;
    if(id==='productSelect')return {value:'short-sleeve-polo'};
    return null;
  },
  querySelectorAll(){return [{querySelector(selector){return {value:selector==='.order-size'?'M':'1'};}}];},
  addEventListener(){},
  readyState:'loading'
};
const context=vm.createContext({garmentPrice,pricingEpoch,
  createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}}),
  document,
  window:{matchMedia:()=>({matches:true}),MQDDesigner:{exportDesign:()=>({product:{id:'short-sleeve-polo',name:'Short Sleeve Polo'},design:{zones:{Front:{layers:[{id:'artwork-1',type:'image',filename:'test.png',src:'data:image/png;base64,iVBORw0KGgo='}]}}}})},fetch:async()=>{throw new Error('Mobile must use XMLHttpRequest');}},
  location:{search:''},URLSearchParams,FormData,Blob,ArrayBuffer,TextEncoder,crypto,structuredClone,AbortController,DOMException,XMLHttpRequest:MockXMLHttpRequest,fetch,console,setTimeout,clearTimeout,
  localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
  alert:message=>{throw new Error(`Unexpected alert: ${message}`)}
});
vm.runInContext(source,context,{filename:'guest-checkout.js'});
assert.equal(await vm.runInContext('mockupBlob()',context),null);
assert.equal(canvasReads,0);
context.button=addButton;
await vm.runInContext('addGuestToCart(button)',context);
assert.equal(uploads,1);
assert.ok(uploadedArtworkBytes>0);
assert.equal(cartButton.textContent,'Cart (1)');
assert.equal(JSON.parse(saved.get('mqd-cart'))[0].orderNumber,'MQD-TEST123');
assert.equal(addButton.disabled,false);
await assert.rejects(vm.runInContext('withTimeout(new Promise(()=>{}),10,"Timed out")',context),/Timed out/);
const specialForm=new FormData();
specialForm.append('payload',JSON.stringify({label:'Portrait — café'}));
specialForm.append('asset',new Blob([new Uint8Array([0,255,13,10,128])],{type:'image/png'}),'portrait "family".png');
specialForm.append('assetMeta','{"zone":"Front"}');
specialForm.append('asset',new Blob([new Uint8Array([137,80,78,71])],{type:'image/png'}),'back.png');
specialForm.append('assetMeta','{"zone":"Back"}');
context.specialForm=specialForm;
const encoded=await vm.runInContext('encodeGuestForm(specialForm)',context);
const decoded=await new Response(encoded.body,{headers:{'Content-Type':encoded.contentType}}).formData();
assert.equal(decoded.get('payload'),specialForm.get('payload'));
assert.equal(decoded.getAll('asset').length,2);
assert.deepEqual(new Uint8Array(await decoded.get('asset').arrayBuffer()),new Uint8Array([0,255,13,10,128]));
context.emptyForm=new FormData();
context.emptyForm.append('asset',new Blob([],{type:'image/png'}),'empty.png');
await assert.rejects(vm.runInContext('encodeGuestForm(emptyForm)',context),/artwork could not be read/);
const beforeFailure=saved.get('mqd-cart');
context.XMLHttpRequest=class extends MockXMLHttpRequest{
  async receive(){this.status=400;this.responseText=JSON.stringify({error:'Could not read the design upload.'});this.onload();}
};
let alerts=[];context.alert=message=>alerts.push(message);
await vm.runInContext('addGuestToCart(button)',context);
assert.equal(saved.get('mqd-cart'),beforeFailure,'failed server response must not add a cart item');
assert.match(alerts[0],/Could not read/);
assert.equal(addButton.disabled,false);
let forwarded=0;
const proofSource=readFileSync(new URL('../v20/order-mockup-views.js',import.meta.url),'utf8')
  .replace(/^  import\('\/v20\/guest-checkout\.js[^\n]+\n/m,'');
const proofContext=vm.createContext({
  window:{matchMedia:()=>({matches:true}),fetch:async()=>{forwarded++;return {ok:true};}},
  location:{search:''},URLSearchParams,FormData,URL,console,
  document:{createElement(){throw new Error('Mobile must not open a hidden 3D renderer');}}
});
vm.runInContext(proofSource,proofContext,{filename:'order-mockup-views.js'});
await vm.runInContext('window.fetch("https://example.supabase.co/functions/v1/submit-mqd-guest-design",{body:new FormData()})',proofContext);
assert.equal(forwarded,1);
console.log('mobile guest cart checks passed');
