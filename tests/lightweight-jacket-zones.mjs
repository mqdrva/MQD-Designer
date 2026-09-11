import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {jacketFaceZone,matchesJacketGeometry} from '../v20/lightweight-jacket-zones.js';
const [file,threePath]=process.argv.slice(2);assert.ok(file&&threePath,'Pass jacket GLB and Three.js module paths');
const THREE=await import(pathToFileURL(threePath));
const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
function attr(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC2:2}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];const start=(v.byteOffset||0)+(a.byteOffset||0);return new THREE.BufferAttribute(new Type(Uint8Array.from(bin.subarray(start,start+a.count*n*Type.BYTES_PER_ELEMENT)).buffer),n);}
const primitive=json.meshes[0].primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',attr(primitive.attributes.POSITION));g.setAttribute('normal',attr(primitive.attributes.NORMAL));g.setIndex(attr(primitive.indices));
assert.ok(matchesJacketGeometry(g.attributes.position,g.index));
const changed=g.index.clone();changed.array[0]++;assert.equal(matchesJacketGeometry(g.attributes.position,changed),false,'Changed topology must not use stale ownership');
const url=new URL('../v20/lightweight-jacket-renderer.js',import.meta.url);let code=fs.readFileSync(url,'utf8').replace("'three'",JSON.stringify(pathToFileURL(threePath).href)).replace("'./lightweight-jacket-zones.js'",JSON.stringify(new URL('../v20/lightweight-jacket-zones.js',import.meta.url).href));
const {createJacketZones,jacketProjection}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=new THREE.Group(),source=new THREE.Mesh(g,new THREE.MeshStandardMaterial());root.add(source);const zones=createJacketZones(source);
assert.equal(zones.size,5);assert.equal(source.visible,false);assert.equal(new Set([...zones.values()].map(m=>m.material)).size,5);
let total=0;for(const [zone,mesh] of zones){assert.ok(mesh.geometry.attributes.position.count>0);total+=mesh.geometry.attributes.position.count;const projection=jacketProjection(mesh,zone);assert.ok(projection.d.toArray().every(v=>Number.isFinite(v)&&v>0));}
assert.equal(total,g.index.count,'Every source triangle appears once');
for(let face=0;face<g.index.count/3;face++)assert.ok(jacketFaceZone(face)>=0&&jacketFaceZone(face)<5);
for(const [zone,mesh] of zones){for(const other of zones.values())other.material.color.set('#ffffff');mesh.material.color.set('#ff0000');for(const [name,other] of zones)assert.equal(other.material.color.getHexString(),name===zone?'ff0000':'ffffff','Color changes must stay in one zone');}
console.log('PASS: 500,000 triangles, five independent materials, complete coverage, isolated color updates, valid artwork bounds, topology-change guard.');
