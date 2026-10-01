import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../v20/guest-checkout.js',import.meta.url),'utf8')
  .replace(/^import \{createClient\}.*\n/,'');
const saved=new Map();
const cartButton={textContent:'Cart (0)'};
const addButton={textContent:'Add to Cart',disabled:false};
let canvasReads=0;
let uploads=0;
let uploadedArtworkBytes=0;
class MockXMLHttpRequest{
  open(method,url){assert.equal(method,'POST');assert.match(url,/submit-mqd-guest-design$/);}
  setRequestHeader(name,value){assert.equal(name,'apikey');assert.ok(value);}
  send(form){
    uploads++;
    uploadedArtworkBytes=form.get('asset')?.size||0;
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
const context=vm.createContext({
  createClient:()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}}),
  document,
  window:{matchMedia:()=>({matches:true}),MQDDesigner:{exportDesign:()=>({product:{id:'short-sleeve-polo',name:'Short Sleeve Polo'},design:{zones:{Front:{layers:[{id:'artwork-1',type:'image',filename:'test.png',src:'data:image/png;base64,iVBORw0KGgo='}]}}}})},fetch:async()=>{throw new Error('Mobile must use XMLHttpRequest');}},
  location:{search:''},URLSearchParams,FormData,Blob,crypto,structuredClone,AbortController,DOMException,XMLHttpRequest:MockXMLHttpRequest,fetch,console,setTimeout,clearTimeout,
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
