import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../v20/owner-zip-mockup-views.js',import.meta.url),'utf8');
async function run(mode){
  let removed=0,generated=0,cancelled=0;
  class Zip{
    constructor(){this.files={};}
    file(name,value){if(arguments.length===1)return this.files[name];this.files[name]={async:async()=>value};return this;}
    remove(name){delete this.files[name];}
    async generateAsync(){generated++;return 'archive';}
  }
  const canvas={width:100,height:100};
  const win={MQDDesigner:{loadDesign:()=>mode==='load-stalled'?new Promise(()=>{}):Promise.resolve()},requestAnimationFrame:()=>1,cancelAnimationFrame:()=>cancelled++};
  const frame={style:{},setAttribute(){},remove(){removed++;},contentWindow:win,contentDocument:{fonts:{ready:Promise.resolve()},getElementById:()=>canvas}};
  const document={body:{appendChild(){queueMicrotask(()=>frame.onload());}},createElement(tag){if(tag==='iframe')return frame;return {getContext:()=>({clearRect(){},drawImage(){},getImageData:()=>({data:[0,0,0,255]})})};}};
  vm.runInNewContext(source,{window:{JSZip:Zip,fetch:async()=>{}},document,console:{warn(){}},structuredClone,Uint8Array,AbortSignal,setTimeout:(fn,ms)=>setTimeout(fn,ms/1000),clearTimeout});
  const zip=new Zip();zip.file('order/design.json',JSON.stringify({design:{zones:{}}}));zip.file('order/mockup.png','saved-preview');zip.file('order/original-assets/front/art.png','original-art');
  if(mode==='saved-views')for(const view of ['front','back','left-side','right-side'])zip.file(`order/original-assets/__mockup__/mockup-${view}.png`,view);
  assert.equal(await zip.generateAsync({type:'blob'}),'archive');assert.equal(generated,1);assert.equal(await zip.file('order/original-assets/front/art.png').async(),'original-art');
  if(mode==='saved-views'){assert.equal(removed,0);for(const view of ['front','back','left-side','right-side'])assert.equal(await zip.file(`order/mockup-previews/${view}.png`).async(),view);}
  else{assert.equal(removed,1);assert.equal(await zip.file('order/mockup-previews/current-view.png').async(),'saved-preview');if(mode==='frames-stalled')assert.equal(cancelled,1);}
}
for(const mode of ['load-stalled','frames-stalled','saved-views'])await run(mode);
const orders=readFileSync(new URL('../v20/owner-orders.js',import.meta.url),'utf8');
const fetchCode=orders.slice(orders.indexOf('async function fetchBlob('),orders.indexOf('\n}',orders.indexOf('async function fetchBlob('))+2);
for(const bodyStalled of [false,true]){
  const context={AbortController,setTimeout:(fn)=>setTimeout(fn,5),clearTimeout,fetch:async(_url,{signal})=>{
    const stalled=()=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));
    return bodyStalled?{ok:true,blob:stalled}:await stalled();
  }};
  vm.runInNewContext(fetchCode,context);await assert.rejects(context.fetchBlob('https://example.test/asset'),/took too long/);
}
console.log('PASS: stalled rendering falls back, saved proofs and artwork survive, stalled downloads time out.');
