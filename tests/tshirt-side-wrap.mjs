import assert from 'node:assert/strict';
import fs from 'node:fs';
import {panelUv,partitionBodyTriangle,panelNames} from '../v20/panels.js';
import {tshirtSideWrapUv,isTshirtSleeveInterior,isTshirtCollarInterior} from '../v20/tshirt-side-wrap.js';
assert(isTshirtCollarInterior(Array(3).fill([0,.8,-.16,0,0,1])),'inner back collar stays shaded');
assert(!isTshirtCollarInterior(Array(3).fill([0,.8,-.16,0,0,-1])),'outer back collar stays printable');
assert(!isTshirtCollarInterior(Array(3).fill([0,.8,.08,0,1,0])),'upper rim stays printable');
const bounds={min:{x:-.45,y:-.86,z:-.36},max:{x:.45,y:.86,z:.36}};
for(const zone of ['Front','Back']){
  for(const x of[-.2,0,.2])assert.deepEqual(tshirtSideWrapUv(zone,x,0,.2,bounds),panelUv(zone,x,0,.2,bounds),'central logo anchors retain their original UVs');
  for(const x of[-.4,.4]){
    const z1=zone==='Front'?.1:-.2,z2=-.06;
    const a=tshirtSideWrapUv(zone,x,0,z1,bounds),b=tshirtSideWrapUv(zone,x,0,z2,bounds);
    assert(Math.abs(a[0]-b[0])>.07,'side depth must span artwork rather than smear one column');
    assert.equal(a[1],panelUv(zone,x,0,z1,bounds)[1],'height remains unchanged');
  }
}
for(const zone of['Left Sleeve','Right Sleeve','Collar'])assert.deepEqual(tshirtSideWrapUv(zone,.5,.4,.05,bounds),panelUv(zone,.5,.4,.05,bounds));
if(process.argv[2]){
  const file=fs.readFileSync(process.argv[2]),length=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+length)),start=28+length;
  const read=n=>{const a=json.accessors[n],v=json.bufferViews[a.bufferView],C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];return new C(file.buffer,file.byteOffset+start+(v.byteOffset||0)+(a.byteOffset||0),a.count*({VEC3:3,SCALAR:1}[a.type]));};
  const p=read(0),indices=read(4),caps=[0,0];let sideFaces=0;
  for(let i=0;i<indices.length;i+=3){
    const tri=[0,1,2].map(k=>Array.from(p.subarray(indices[i+k]*3,indices[i+k]*3+3)));
    for(const [zi,poly]of partitionBodyTriangle(tri))for(let k=1;k<poly.length-1;k++){
      const face=[poly[0],poly[k],poly[k+1]],zone=panelNames[zi];
      if(isTshirtSleeveInterior(zone,face)){assert(zi===2||zi===3);caps[zi-2]++;}
      if(zi<2)for(const [x,y,z]of face){const uv=tshirtSideWrapUv(zone,x,y,z,bounds);assert(uv.every(Number.isFinite));assert.equal(uv[1],panelUv(zone,x,y,z,bounds)[1]);sideFaces++;}
    }
  }
  assert(caps.every(n=>n>5000&&n<15000),'interior classification stays confined to sleeve end surfaces');
  assert(Math.abs(caps[0]-caps[1])/Math.max(...caps)<.15,'both sleeve interiors are treated consistently');
  console.log({caps,sideVertices:sideFaces});
}
console.log('Side wrap checks passed: central anchors and height preserved; both sides span texture depth; sleeve/collar UVs unchanged.');
