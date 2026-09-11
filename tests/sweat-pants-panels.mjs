import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createSweatPanels,sweatUv} from '../v20/sweat-pants-panels.js';
const THREE=await import(pathToFileURL(process.argv[3]));
const bytes=fs.readFileSync(process.argv[2]),len=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+len)),bin=bytes.subarray(28+len);
function attr(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3}[a.type],T={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],start=(v.byteOffset||0)+(a.byteOffset||0);return new THREE.BufferAttribute(new T(Uint8Array.from(bin.subarray(start,start+a.count*n*T.BYTES_PER_ELEMENT)).buffer),n);}
const primitive=json.meshes[0].primitives[0],g=new THREE.BufferGeometry();
g.setAttribute('position',attr(primitive.attributes.POSITION));g.setAttribute('normal',attr(primitive.attributes.NORMAL));g.setIndex(attr(primitive.indices));
const root=new THREE.Group(),source=new THREE.Mesh(g,new THREE.MeshStandardMaterial());root.add(source);
const {panels,bounds}=createSweatPanels(source,THREE),seam=(bounds.min.z+bounds.max.z)/2;
assert.equal(panels.size,2);assert.equal(source.visible,false);
assert.notEqual(panels.get('Front').material,panels.get('Back').material);
function area(geo){let total=0;const p=geo.getAttribute('position'),idx=geo.index,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let i=0;i<(idx?idx.count:p.count);i+=3){a.fromBufferAttribute(p,idx?idx.getX(i):i);b.fromBufferAttribute(p,idx?idx.getX(i+1):i+1);c.fromBufferAttribute(p,idx?idx.getX(i+2):i+2);total+=b.sub(a).cross(c.sub(a)).length()/2;}return total;}
let sum=0;
for(const [zone,mesh] of panels){
  sum+=area(mesh.geometry);const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');let seamCount=0;
  for(let i=0;i<p.count;i++){
    assert.ok(zone==='Front'?p.getZ(i)>=seam-1e-6:p.getZ(i)<=seam+1e-6);
    if(Math.abs(p.getZ(i)-seam)<1e-6)seamCount++;
    const expected=sweatUv(zone,p.getX(i),p.getY(i),bounds);
    assert.ok(Math.abs(uv.getX(i)-expected[0])<1e-6&&Math.abs(uv.getY(i)-expected[1])<1e-6,'2D coordinates must equal model coordinates');
  }
  assert.ok(seamCount>0);
}
assert.ok(Math.abs(sum-area(g))/area(g)<1e-6,'No missing or overlapping fabric');
console.log('PASS actual Sweat Pants GLB: full surface coverage, independent front/back, shared seam, exact affine image coordinates.');
