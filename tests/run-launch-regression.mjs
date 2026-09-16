import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {mkdir,open,rename,stat,unlink} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

const root=fileURLToPath(new URL('..',import.meta.url));
const products=JSON.parse(fs.readFileSync(new URL('./frozen-products.json',import.meta.url),'utf8'));
const cacheDir=path.resolve(process.env.MQD_GLB_CACHE_DIR||path.join(os.tmpdir(),'mqd-launch-regression-glbs'));
const threePath=fileURLToPath(import.meta.resolve('three'));

await mkdir(cacheDir,{recursive:true});

async function validateGlb(file,product){
  const info=await stat(file);
  assert.ok(info.size>=28,`${product.name}: downloaded GLB is empty`);
  const handle=await open(file,'r');
  try{
    const header=Buffer.alloc(20);
    await handle.read(header,0,header.length,0);
    assert.equal(header.toString('ascii',0,4),'glTF',`${product.name}: invalid GLB header`);
    assert.equal(header.readUInt32LE(4),2,`${product.name}: unsupported GLB version`);
    assert.equal(header.readUInt32LE(8),info.size,`${product.name}: incomplete GLB download`);
    const jsonLength=header.readUInt32LE(12);
    assert.ok(jsonLength>0&&jsonLength<info.size-20,`${product.name}: invalid GLB JSON chunk`);
    const json=Buffer.alloc(jsonLength);
    await handle.read(json,0,json.length,20);
    const gltf=JSON.parse(json.toString('utf8'));
    assert.ok(Array.isArray(gltf.meshes)&&gltf.meshes.length>0,`${product.name}: GLB has no meshes`);
    assert.ok(Array.isArray(gltf.accessors)&&gltf.accessors.length>0,`${product.name}: GLB has no geometry accessors`);
  }finally{
    await handle.close();
  }
}

async function downloadProduct(product){
  const file=path.join(cacheDir,`${product.id}.glb`);
  try{
    await validateGlb(file,product);
    console.log(`CACHE: ${product.name}`);
    return file;
  }catch{
    await unlink(file).catch(()=>{});
  }
  const temporary=`${file}.${process.pid}.tmp`;
  console.log(`FETCH: ${product.name}`);
  const response=await fetch(product.model);
  assert.ok(response.ok&&response.body,`${product.name}: GLB request failed (${response.status})`);
  await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(temporary));
  await validateGlb(temporary,product);
  await rename(temporary,file);
  return file;
}

const modelPaths=new Map();
const queue=[...products];
const workers=Array.from({length:Math.min(3,queue.length)},async()=>{
  while(queue.length){
    const product=queue.shift();
    modelPaths.set(product.id,await downloadProduct(product));
  }
});
await Promise.all(workers);
console.log(`PASS: all ${products.length} frozen product GLBs downloaded and structurally validated.`);

const tests=[
  ['checkout-security.mjs'],
  ['shipping-tiers.mjs'],
  ['customer-accounts.mjs'],
  ['fleece-hoodie-zones.mjs'],
  ['frozen-product-baseline.mjs'],
  ['library-clone.mjs'],
  ['long-sleeve-pattern-uv.mjs'],
  ['long-sleeve-text-mapping.mjs'],
  ['mask-renderer.mjs'],
  ['tshirt-text-mapping.mjs'],
  ['fleece-hoodie-model.mjs',modelPaths.get('fleece-hoodie')],
  ['hat-zones.mjs',modelPaths.get('hat'),threePath],
  ['hood-mask-panels.mjs',modelPaths.get('hood-mask-shirt'),threePath],
  ['hooded-long-sleeve-panels.mjs',modelPaths.get('hooded-long-sleeve'),threePath],
  ['lightweight-jacket-zones.mjs',modelPaths.get('lightweight-jacket'),threePath],
  ['long-sleeve-polo-reference.mjs',modelPaths.get('long-sleeve-polo')],
  ['long-sleeve-zones.mjs',modelPaths.get('long-sleeve-tshirt')],
  ['shorts-panels.mjs',modelPaths.get('shorts'),threePath],
  ['sweat-pants-panels.mjs',modelPaths.get('sweat-pants'),threePath]
];

function run([name,...args]){
  return new Promise((resolve,reject)=>{
    console.log(`\nTEST: ${name}`);
    const child=spawn(process.execPath,[path.join(root,'tests',name),...args],{cwd:root,stdio:'inherit',env:{...process.env,MQD_RENDER:''}});
    child.once('error',reject);
    child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${name} failed${signal?` (${signal})`:` (exit ${code})`}`)));
  });
}

for(const test of tests)await run(test);
console.log(`\nPASS: launch regression completed (${products.length} garments, ${tests.length} checks).`);
