import {hoodieFrontArtworkV,HOODIE_FRONT_PATTERN_NECK_T,HOODIE_FRONT_MODEL_NECK_T} from '../v20/hoodie-front-calibration.js';
import assert from 'node:assert/strict';
import {hoodieArtworkBatches,hoodieSplashPreviewFrame} from '../v20/hoodie-splash-preview.js';
import fs from 'node:fs';
import {teamRenderZone} from '../v20/team-brand-render.js';
import vm from 'node:vm';
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {partitionFleeceHoodieTriangle,hoodiePanelNames,HOODIE_WAISTBAND_TOP_Y} from '../v20/fleece-hoodie-panels.js';
const bytes=fs.readFileSync(process.argv[2]),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
function accessor(id){const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n={VEC3:3,SCALAR:1}[a.type],size={5126:4,5125:4,5123:2}[a.componentType],stride=v.byteStride||n*size;return i=>Array.from({length:n},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+i*stride+k*size;return a.componentType===5126?bin.readFloatLE(at):a.componentType===5125?bin.readUInt32LE(at):bin.readUInt16LE(at);});}
const primitive=gltf.meshes[0].primitives[0],position=accessor(primitive.attributes.POSITION),index=accessor(primitive.indices),points=hoodiePanelNames.map(()=>[]);
for(let i=0;i<gltf.accessors[primitive.indices].count;i+=3){for(const [zone,poly] of partitionFleeceHoodieTriangle([0,1,2].map(k=>position(index(i+k)[0])))){for(let k=1;k<poly.length-1;k++)for(const p of [poly[0],poly[k],poly[k+1]])points[zone].push(...p);}}
const garment=new THREE.Group(),meshes=new Map();points.forEach((p,i)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());garment.add(m);meshes.set(hoodiePanelNames[i],m);});
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8'),start=editor.indexOf('function rebuildFleeceHoodiePreview()'),end=editor.indexOf('\nfunction disposeZoneTexture',start),decalGroup=new THREE.Group();
const context={hoodieFrontArtworkV,HOODIE_WAISTBAND_TOP_Y,THREE,DecalGeometry,hoodieArtworkBatches,hoodieSplashPreviewFrame,product:{id:'fleece-hoodie',zones:['Left Sleeve','Right Sleeve']},fleeceHoodieZoneMeshes:meshes,garment,decalGroup,clearDecals(){},updateFleeceHoodieZoneColors(){},zoneState:(zone,render)=>render?teamRenderZone(context.stateFor().zones[zone],context.stateFor().teamBackground,zone):context.stateFor().zones[zone],stateFor:()=>({zones:Object.fromEntries(hoodiePanelNames.map(z=>[z,{layers:[{visible:true}]}]))}),makeCleanZoneArtworkCanvas:()=>({width:512,height:1024}),renderer:{capabilities:{getMaxAnisotropy:()=>1}},zonePlacement:()=>({p:new THREE.Vector3(),r:new THREE.Euler(),d:new THREE.Vector3(1,1,1)}),console};
vm.runInNewContext(editor.slice(start,end)+'\nrebuildFleeceHoodiePreview();',context);
assert.equal(decalGroup.children.length,2);
for(let i=0;i<2;i++){const zone=context.product.zones[i],target=meshes.get(zone),decal=decalGroup.children[i].geometry;assert.ok(decal.attributes.position.count>1000,zone+' must receive artwork');decal.computeBoundingBox();target.geometry.computeBoundingBox();const b=target.geometry.boundingBox,d=decal.boundingBox;assert.ok(d.min.y<=b.min.y+.01,zone+' covers wrist');assert.ok(d.max.y>=b.max.y-.01,zone+' covers shoulder');const uv=decal.attributes.uv;let lower=0;for(let j=0;j<uv.count;j++)if(uv.getY(j)<.35)lower++;assert.ok(lower>100,zone+' receives bottom grass portion');}
console.log('PASS: both actual hoodie sleeves receive artwork from shoulder to wrist, including lower grass UVs.');

// The water artwork alone must cover the actual panel through its bottom hem.
context.product.zones=hoodiePanelNames;
context.stateFor=()=>({zones:Object.fromEntries(hoodiePanelNames.map(z=>[z,{layers:[{type:'image',visible:true,libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'}]}]))});
decalGroup.clear();
vm.runInNewContext(editor.slice(start,end)+'\nrebuildFleeceHoodiePreview();',context);
assert.equal(decalGroup.children.length,5);
for(let i=0;i<5;i++){
 const zone=hoodiePanelNames[i],target=meshes.get(zone),decal=decalGroup.children[i].geometry;
 decal.computeBoundingBox();target.geometry.computeBoundingBox();
 assert.ok(decal.boundingBox.min.y<=target.geometry.boundingBox.min.y+.001,zone+' splash reaches hem');
 assert.ok(decal.attributes.position.count>100,zone+' splash projects onto real geometry');
}
const a={type:'text'},water={type:'image',libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'},b={type:'image'};
assert.deepEqual(hoodieArtworkBatches('Front',[a,water,b]).map(x=>x.layers),[[a],[water],[b]]);
assert.equal(hoodieSplashPreviewFrame('Front',b),null);
console.log('PASS: water reaches all five actual hoodie panel hems; other layers retain order and mapping.');

// Front ordinary artwork must use the physical front body's vertical extent,
// not a shorter frame derived from the whole garment (which includes the hood).
const shared=fs.readFileSync(new URL('../v20/garment-mapping-source.js',import.meta.url),'utf8');
const placement=shared.match(/\/\/ @mapping-begin zonePlacement\n([\s\S]*?)\n\/\/ @mapping-end zonePlacement/)[1];
vm.runInNewContext(placement,context);
context.product.zones=['Front','Back'];
context.stateFor=()=>({zones:{Front:{layers:[{type:'image',visible:true},{type:'text',visible:true}]},Back:{layers:[{type:'image',visible:true}]}}});
const frames=[];
context.DecalGeometry=class extends DecalGeometry{constructor(mesh,p,r,d){frames.push({p:p.clone(),r:r.clone(),d:d.clone()});super(mesh,p,r,d);}};
const oldFront=context.zonePlacement('Front'),oldBack=context.zonePlacement('Back');
decalGroup.clear();vm.runInNewContext(editor.slice(start,end)+'\nrebuildFleeceHoodiePreview();',context);
assert.equal(frames.length,2);
const frontBounds=new THREE.Box3().setFromObject(meshes.get('Front')),frame=frames[0];
assert(Math.abs(frame.p.y+frame.d.y/2-frontBounds.max.y)<1e-8,'top of flat Front must reach actual shoulder edge');
assert(Math.abs(frame.p.y-frame.d.y/2-HOODIE_WAISTBAND_TOP_Y)<1e-8,'bottom of flat Front must reach the body/waistband seam, not the band bottom');
assert(frame.p.y+.4*frame.d.y>oldFront.p.y+.4*oldFront.d.y+.05,'high front logo must no longer be compressed down toward chest');
for(const layerY of [-80,-41,-32,0,80]){
 const oldBoxY=(frontBounds.min.y+frontBounds.max.y)/2-layerY/200*(frontBounds.max.y-frontBounds.min.y);
 const correctedY=frame.p.y-layerY/200*frame.d.y;
 assert(correctedY>oldBoxY,'chest and lower artwork must rise relative to the incorrect band-bottom frame');
}
assert.equal(frame.p.x,oldFront.p.x);assert.equal(frame.d.x,oldFront.d.x);
assert.equal(JSON.stringify(frames[1]),JSON.stringify(oldBack),'Back projector must remain exactly unchanged');
console.log('PASS: actual hoodie Front shoulder/waistband anchors align, high chest artwork rises, horizontal mapping and Back remain unchanged.');

assert.equal(hoodieFrontArtworkV(0),0);assert.equal(hoodieFrontArtworkV(1),1);
assert(Math.abs(hoodieFrontArtworkV(1-HOODIE_FRONT_MODEL_NECK_T)-(1-HOODIE_FRONT_PATTERN_NECK_T))<1e-10);
const chestT=(1-41/100)/2;
const modelT=HOODIE_FRONT_MODEL_NECK_T+(chestT-HOODIE_FRONT_PATTERN_NECK_T)*(1-HOODIE_FRONT_MODEL_NECK_T)/(1-HOODIE_FRONT_PATTERN_NECK_T);
assert(modelT<chestT-.07,'reported chest placement must rise by at least seven percent of body height');
for(let i=1;i<=100;i++)assert(hoodieFrontArtworkV(i/100)>hoodieFrontArtworkV((i-1)/100),'mapping must remain monotonic');
console.log('PASS: neckline and hem UV anchors preserved; reported chest placement rises without changing stored layers.');

let opening=-Infinity;
for(let i=0;i<gltf.accessors[primitive.attributes.POSITION].count;i++){const [x,y,z]=position(i);if(Math.abs(x)<.01&&z>.1)opening=Math.max(opening,y);}
assert(Math.abs(opening-.69868803024)<1e-6,'calibration opening must match the actual supplied GLB');
assert(Math.abs((frontBounds.max.y-opening)/(frontBounds.max.y-HOODIE_WAISTBAND_TOP_Y)-HOODIE_FRONT_MODEL_NECK_T)<1e-6,'neckline fraction must match model geometry');

const backgroundState={teamBackground:{src:'synthetic-background',image:{complete:true,naturalWidth:64}},zones:Object.fromEntries(hoodiePanelNames.map(zone=>[zone,{layers:[]}]))};context.stateFor=()=>backgroundState;context.product.zones=hoodiePanelNames;decalGroup.clear();
vm.runInNewContext(editor.slice(start,end)+'\nrebuildFleeceHoodiePreview();',context);assert.equal(decalGroup.children.length,5,'Optional member background must render through all five approved hoodie zones even without master artwork');assert(hoodiePanelNames.every(zone=>backgroundState.zones[zone].layers.length===0),'Rendering cannot add editable layers to the saved master');
console.log('PASS optional hoodie background: five approved zones receive artwork without mutating saved master layers.');
