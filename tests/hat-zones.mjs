import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [file,threePath]=process.argv.slice(2);
assert.ok(file&&threePath,'Pass Hat GLB and Three.js module paths');
const THREE=await import(pathToFileURL(threePath));
const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
function attribute(id){
 const a=json.accessors[id],v=json.bufferViews[a.bufferView],items={SCALAR:1,VEC2:2,VEC3:3}[a.type];
 const Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];
 const start=(v.byteOffset||0)+(a.byteOffset||0),copy=Uint8Array.from(bin.subarray(start,start+a.count*items*Type.BYTES_PER_ELEMENT));
 return new THREE.BufferAttribute(new Type(copy.buffer),items);
}
const primitive=json.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',attribute(primitive.attributes.POSITION));
geometry.setAttribute('normal',attribute(primitive.attributes.NORMAL));
geometry.setIndex(attribute(primitive.indices));
let code=fs.readFileSync(new URL('../v20/hat-renderer.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(pathToFileURL(threePath).href));
const {createHatZones,hatProjection}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=new THREE.Group(),source=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());root.add(source);
const zones=createHatZones(source),group=root.children.find(o=>o.name==='MQD_Hat_Zones');
assert.equal(zones.size,2);assert.deepEqual([...zones.keys()],['Front Panel','Top of Bill']);assert.equal(source.visible,false);
assert.deepEqual(group.children.map(m=>m.name),['Hat_Front_Panel','Hat_Top_of_Bill','Hat_Trim','Hat_Rest']);
assert.equal(group.children.reduce((sum,m)=>sum+m.geometry.attributes.position.count,0),geometry.index.count,'Every source triangle must have one owner');
assert.equal(group.getObjectByName('Hat_Rest').material.color.getHexString(),'111111');
const front=zones.get('Front Panel'),billMesh=zones.get('Top of Bill'),trim=group.getObjectByName('Hat_Trim'),rest=group.getObjectByName('Hat_Rest');
assert.equal(trim.material,front.material,'Crown top must share the Front Panel material');
for(const [zone,mesh] of zones){assert.ok(mesh.geometry.attributes.position.count>0);const q=hatProjection(mesh,zone);assert.ok(q.d.toArray().every(v=>Number.isFinite(v)&&v>0));}
front.material.color.set('#ff0000');billMesh.material.color.set('#00ff00');
assert.equal(trim.material.color.getHexString(),'ff0000','Crown top must follow Front Panel color');
assert.equal(billMesh.material.color.getHexString(),'00ff00','Bill must remain independent from Front Panel');
assert.equal(rest.material.color.getHexString(),'111111','Fixed side/back crown must remain black');
const bill=zones.get('Top of Bill').geometry.attributes.position;
for(let i=0;i<bill.count;i+=3){
 const z=(bill.getZ(i)+bill.getZ(i+1)+bill.getZ(i+2))/3;
 assert.ok(z>.11,'Top of Bill must not leak onto rear crown geometry');
}
const changed=geometry.clone();changed.attributes.position=geometry.attributes.position.clone();changed.attributes.position.array[0]+=.001;
const changedSource=new THREE.Mesh(changed,new THREE.MeshStandardMaterial());new THREE.Group().add(changedSource);
assert.equal(createHatZones(changedSource),null,'Changed GLB must reject this frozen calibration');
console.log('PASS: two isolated Hat zones, Front-linked crown top, black fixed crown, front-only bill, full 500,000-triangle ownership.');
