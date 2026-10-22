import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
class Zip {
 constructor(){this.files={};}
 file(name,value){if(value!==undefined){this.files[name]={dir:false,async:async type=>type==='string'?String(value):new Uint8Array(value)};return this;}return this.files[name]||null;}
 remove(name){delete this.files[name];}
 async generateAsync(){return this.files;}
}
const context={window:{JSZip:Zip,fetch:async()=>{throw Error('Unexpected network request');}},console,structuredClone,Blob,Uint8Array,setTimeout,clearTimeout};
vm.runInNewContext(await fs.readFile(new URL('../v20/owner-zip-mockup-views.js',import.meta.url),'utf8'),context);
const root='order/',png=tag=>new Uint8Array([137,80,78,71,13,10,26,10,tag]);
const zip=new Zip();zip.file(root+'design.json',JSON.stringify({product:{id:'long-sleeve-tshirt'}}));
for(const [i,view] of ['front','back','left-side','right-side'].entries())zip.file(root+'original-assets/__mockup__/mockup-'+view+'.png',png(i));
await zip.generateAsync();
assert.equal((await zip.file(root+'mockup-previews/left-side.png').async('uint8array'))[8],3);
assert.equal((await zip.file(root+'mockup-previews/right-side.png').async('uint8array'))[8],2);
assert.ok(zip.file(root+'mockup-previews/front.png'));
assert.ok(zip.file(root+'mockup-previews/back.png'));
const broken=new Zip();broken.file(root+'design.json',JSON.stringify({product:{id:'long-sleeve-tshirt'},design:{zones:{Front:{layers:[{id:'layer-1',type:'image',filename:'missing.png'}]}}}}));
await assert.rejects(broken.generateAsync(),/no incomplete ZIP was downloaded.*Saved artwork is missing/);
const corrupt=new Zip();corrupt.file(root+'design.json','{}');for(const view of ['front','back','left-side','right-side'])corrupt.file(root+'original-assets/__mockup__/mockup-'+view+'.png',new Uint8Array());
await assert.rejects(corrupt.generateAsync(),/not a valid PNG/);
const ordinary=new Zip();ordinary.file('readme.txt','Unrelated ZIP');assert.ok((await ordinary.generateAsync())['readme.txt']);
console.log('PASS: four saved proofs, sleeve labels, missing artwork rejection, corrupt proof rejection, unrelated ZIP preservation');
