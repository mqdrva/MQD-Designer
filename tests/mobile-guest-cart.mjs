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
  window:{matchMedia:()=>({matches:true}),MQDDesigner:{exportDesign:()=>({product:{id:'short-sleeve-polo',name:'Short Sleeve Polo'},design:{zones:{Front:{layers:[]}}}})},fetch:async()=>{uploads++;return {ok:true,json:async()=>({ok:true,orderNumber:'MQD-TEST123'})};}},
  location:{search:''},URLSearchParams,FormData,Blob,crypto,structuredClone,AbortController,console,setTimeout,clearTimeout,
  localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
  alert:message=>{throw new Error(`Unexpected alert: ${message}`)}
});
vm.runInContext(source,context,{filename:'guest-checkout.js'});
assert.equal(await vm.runInContext('mockupBlob()',context),null);
assert.equal(canvasReads,0);
context.button=addButton;
await vm.runInContext('addGuestToCart(button)',context);
assert.equal(uploads,1);
assert.equal(cartButton.textContent,'Cart (1)');
assert.equal(JSON.parse(saved.get('mqd-cart'))[0].orderNumber,'MQD-TEST123');
assert.equal(addButton.disabled,false);
await assert.rejects(vm.runInContext('withTimeout(new Promise(()=>{}),10,"Timed out")',context),/Timed out/);
console.log('mobile guest cart checks passed');
