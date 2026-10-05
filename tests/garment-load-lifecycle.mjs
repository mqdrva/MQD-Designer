import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
const start=source.indexOf('function loadGarment('),end=source.indexOf('\nfunction selectProduct(',start);
const pending=[],events=[];
let disposed=0,fitted=0,rebuilt=0;
const interiorMeshes=new Map([['old',{material:{}}]]);
const c=vm.createContext({console,garmentLoadVersion:0,renderer:{},garment:null,product:{id:'tshirt',model:'shirt.glb'},
  window:{dispatchEvent:event=>events.push(event)},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},
  scene:{add(){},remove(){}},tshirtZoneMeshes:new Map(),tshirtInteriorMeshes:interiorMeshes,fleeceHoodieZoneMeshes:new Map(),
  clearDecals(){},preloadTemplates(){},fitGarment(){fitted++;},findPrimaryMesh:()=>null,
  rebuildGarmentPreview(){rebuilt++;},
  GLTFLoader:class{load(url,ready,progress,error){pending.push({url,ready,error});}}});
vm.runInContext(source.slice(start,end),c);
c.loadGarment();
assert.equal(interiorMeshes.size,0,'changing garments clears stale interior material references');
c.product={id:'hat',model:'hat.glb'};c.loadGarment();
assert.deepEqual(pending.map(p=>p.url),['shirt.glb','hat.glb']);
const oldScene={traverse(fn){fn({geometry:{dispose(){disposed++;}},material:{map:{dispose(){disposed++;}},dispose(){disposed++;}}});}};
pending[0].ready({scene:oldScene});
assert.equal(disposed,3,'late model resources are disposed');assert.equal(fitted,0);assert.equal(rebuilt,0);
assert.equal(events.filter(e=>e.type==='mqd:garment-ready').length,0,'late models must not announce readiness');
const currentScene={traverse(){}};pending[1].ready({scene:currentScene});
assert.equal(c.garment,currentScene);assert.equal(fitted,1);assert.equal(rebuilt,1);
assert.deepEqual(events.map(e=>[e.type,e.detail.productId,e.detail.loadVersion]),[
  ['mqd:garment-loading','tshirt',1],['mqd:garment-loading','hat',2],['mqd:garment-ready','hat',2]
]);
console.log('PASS: garment load notifications, stale model disposal and interior-map reset.');
