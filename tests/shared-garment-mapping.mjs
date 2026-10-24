import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {syncGarmentMapping} from '../scripts/sync-garment-mapping.mjs';
import {GARMENT_MAPPING,applyGarmentMappings} from '../v20/garment-mapping-catalog.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved=JSON.parse(fs.readFileSync(path.join(root,'tests/frozen-products.json'),'utf8'));
assert.equal(Object.keys(GARMENT_MAPPING).length,12);
for(const product of approved)assert.deepEqual(GARMENT_MAPPING[product.id],{model:product.model,zones:product.zones,templates:product.templates});
const cached=[{id:'tshirt',name:'Business custom shirt',price:43.21,model:'old-model.glb',zones:['old'],templates:{}}];
applyGarmentMappings(cached);assert.equal(cached[0].price,43.21);assert.equal(cached[0].name,'Business custom shirt');assert.deepEqual(cached[0].templates,GARMENT_MAPPING.tshirt.templates);assert.equal(cached[0].model,GARMENT_MAPPING.tshirt.model);
syncGarmentMapping(root,{check:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mqd-shared-mapping-'));
try{
  for(const dir of ['v20','assets'])fs.cpSync(path.join(root,dir),path.join(temp,dir),{recursive:true});
  for(const file of ['index.html','shop-3d.html','team-3d.html'])fs.copyFileSync(path.join(root,file),path.join(temp,file));
  const canonical=path.join(temp,'v20/garment-mapping-source.js');
  const before=syncGarmentMapping(temp,{check:true}).version;
  fs.writeFileSync(canonical,fs.readFileSync(canonical,'utf8').replace("const MQD_TSHIRT_ZONE_CALIBRATION='v26-surface-uv-collar-strip';","const MQD_TSHIRT_ZONE_CALIBRATION='test-next-approved-mapping';"));
  assert.throws(()=>syncGarmentMapping(temp,{check:true}),/stale/);
  const update=syncGarmentMapping(temp);assert.notEqual(update.version,before);
  for(const host of ['editor.js','shop-editor.js'])assert(fs.readFileSync(path.join(temp,'v20',host),'utf8').includes("const MQD_TSHIRT_ZONE_CALIBRATION='test-next-approved-mapping';"));
  assert(fs.readFileSync(path.join(temp,'index.html'),'utf8').includes(update.version));
  assert(fs.readFileSync(path.join(temp,'shop-3d.html'),'utf8').includes(update.version));
  assert(fs.readFileSync(path.join(temp,'team-3d.html'),'utf8').includes(update.version));
  assert(fs.readFileSync(path.join(temp,'v20/print-shop.js'),'utf8').includes(update.version));
  // Host policy remains local: release composition must not erase fixed-logo
  // drawing hooks, business state, controls or custom prices.
  const service=path.join(temp,'v20/shop-editor.js');
  const fixedHook="function drawImageLayer(c,l,b){if(l.shopFixed)return 'fixed-logo-host-hook';return drawMappedImageLayer(c,l,b);}";
  let source=fs.readFileSync(service,'utf8').replace(/function drawImageLayer\(c,l,b\)\{[\s\S]*?(?=\n\/\/ @mapping-begin drawMappedImageLayer)/,fixedHook);
  fs.writeFileSync(service,source);syncGarmentMapping(temp);assert(fs.readFileSync(service,'utf8').includes(fixedHook));
  const hostCtx={drawMappedImageLayer:()=> 'shared-image-placement'};vm.createContext(hostCtx);vm.runInContext(fixedHook,hostCtx);
  assert.equal(hostCtx.drawImageLayer(null,{shopFixed:true},null),'fixed-logo-host-hook');
  assert.equal(hostCtx.drawImageLayer(null,{},null),'shared-image-placement');
  fs.writeFileSync(service,source.replace("const MQD_TSHIRT_ZONE_CALIBRATION='test-next-approved-mapping';","const MQD_TSHIRT_ZONE_CALIBRATION='drifted-service';"));
  assert.throws(()=>syncGarmentMapping(temp,{check:true}),/stale/);
  syncGarmentMapping(temp);syncGarmentMapping(temp,{check:true});
  fs.writeFileSync(service,fs.readFileSync(service,'utf8').replace('// @mapping-end splitTshirtGeometry','// removed mapping marker'));
  assert.throws(()=>syncGarmentMapping(temp),/every shared mapping section/);
}finally{fs.rmSync(temp,{recursive:true,force:true});}

// Exercise the generated service code with the same actual renderer tests,
// including all four shirt routes, neckline, glyphs, textures and stale loads.
for(const name of ['tshirt-text-mapping','tshirt-front-neckline','tshirt-preview-contract','garment-load-lifecycle','long-sleeve-text-mapping','long-polo-collar-text','polo-sleeve-fill']){
  const result=spawnSync(process.execPath,['tests/'+name+'.mjs'],{cwd:root,env:{...process.env,MQD_MAPPING_EDITOR:'../v20/shop-editor.js'},encoding:'utf8'});
  assert.equal(result.status,0,name+' failed for the service designer:\n'+result.stdout+result.stderr);
}
console.log('PASS: 12 shared garment frames, automatic two-host propagation, synchronized cache versions, drift/missing-section guards, fixed-logo host preservation, and 7 service mapping regressions.');
