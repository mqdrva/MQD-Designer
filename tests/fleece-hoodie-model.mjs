import assert from 'node:assert/strict';
import fs from 'node:fs';
import {partitionFleeceHoodieTriangle} from '../v20/fleece-hoodie-panels.js';

// Run against the actual downloaded GLB, not a substitute test mesh.
const file=process.argv[2];assert.ok(file,'Pass the fleece-hoodie.glb path');
const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+length));
const bin=bytes.subarray(28+length);
function accessor(id){
 const a=gltf.accessors[id],b=gltf.bufferViews[a.bufferView];
 const offset=(b.byteOffset||0)+(a.byteOffset||0),size={5126:4,5125:4,5123:2}[a.componentType];
 const components={VEC3:3,SCALAR:1}[a.type],stride=b.byteStride||size*components;
 return i=>Array.from({length:components},(_,k)=>{
  const at=offset+i*stride+k*size;
  return a.componentType===5126?bin.readFloatLE(at):a.componentType===5125?bin.readUInt32LE(at):bin.readUInt16LE(at);
 });
}
const mesh=gltf.meshes[0].primitives[0],position=accessor(mesh.attributes.POSITION),index=accessor(mesh.indices);
const count=gltf.accessors[mesh.indices].count,totals=[0,0,0,0,0];
function area(a,b,c){const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;}
for(let i=0;i<count;i+=3){
 const t=[0,1,2].map(k=>position(index(i+k)[0]));let sum=0;
 for(const [zone,poly] of partitionFleeceHoodieTriangle(t)){
  assert.ok(zone>=0&&zone<5);
  for(let k=1;k<poly.length-1;k++){const a=area(poly[0],poly[k],poly[k+1]);assert.ok(Number.isFinite(a));sum+=a;totals[zone]+=a;}
 }
 assert.ok(Math.abs(sum-area(...t))<1e-8,'Partition must preserve surface area without duplicated faces or holes');
}
assert.ok(totals.every(a=>a>0));
console.log(`PASS: ${count/3} actual GLB triangles; five nonempty zones; area conserved.`,totals);
