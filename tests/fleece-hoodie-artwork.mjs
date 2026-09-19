import assert from 'node:assert/strict';
import {hoodieArtworkBatches,hoodieSplashPreviewFrame} from '../v20/hoodie-splash-preview.js';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from '../v20/fleece-hoodie-panels.js';
const bytes=fs.readFileSync(process.argv[2]),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
function accessor(id){const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],n={VEC3:3,SCALAR:1}[a.type],size={5126:4,5125:4,5123:2}[a.componentType],stride=v.byteStride||n*size;return i=>Array.from({length:n},(_,k)=>{const at=(v.byteOffset||0)+(a.byteOffset||0)+i*stride+k*size;return a.componentType===5126?bin.readFloatLE(at):a.componentType===5125?bin.readUInt32LE(at):bin.readUInt16LE(at);});}
const primitive=gltf.meshes[0].primitives[0],position=accessor(primitive.attributes.POSITION),index=accessor(primitive.indices),points=hoodiePanelNames.map(()=>[]);
for(let i=0;i<gltf.accessors[primitive.indices].count;i+=3){for(const [zone,poly] of partitionFleeceHoodieTriangle([0,1,2].map(k=>position(index(i+k)[0])))){for(let k=1;k<poly.length-1;k++)for(const p of [poly[0],poly[k],poly[k+1]])points[zone].push(...p);}}
const garment=new THREE.Group(),meshes=new Map();points.forEach((p,i)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial());garment.add(m);meshes.set(hoodiePanelNames[i],m);});
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8'),start=editor.indexOf('function rebuildFleeceHoodiePreview()'),end=editor.indexOf('\nfunction disposeZoneTexture',start),decalGroup=new THREE.Group();
const context={THREE,DecalGeometry,hoodieArtworkBatches,hoodieSplashPreviewFrame,product:{id:'fleece-hoodie',zones:['Left Sleeve','Right Sleeve']},fleeceHoodieZoneMeshes:meshes,garment,decalGroup,clearDecals(){},updateFleeceHoodieZoneColors(){},stateFor:()=>({zones:Object.fromEntries(hoodiePanelNames.map(z=>[z,{layers:[{visible:true}]}]))}),makeCleanZoneArtworkCanvas:()=>({width:512,height:1024}),renderer:{capabilities:{getMaxAnisotropy:()=>1}},zonePlacement:()=>({p:new THREE.Vector3(),r:new THREE.Euler(),d:new THREE.Vector3(1,1,1)}),console};
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
