import assert from 'node:assert/strict';
import * as THREE from 'three';
import {refineTshirtCollar} from '../v20/tshirt-collar-shell.js';
const group=new THREE.Group(),outer=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial()),old=new THREE.Mesh();group.add(outer,old);const liner=refineTshirtCollar(outer,old,THREE);
assert.equal(liner.children.length,1);assert.notEqual(liner.children[0].material,liner.material,'inside fabric is independent of collar color');const fabric=liner.children[0].material;const originalColor=fabric.color.getHex();for(const color of ['#000000','#FF0000','#00FF00']){liner.material.color.set(color);assert.equal(fabric.color.getHex(),originalColor,'collar color must not recolor the shirt inside');}assert.equal(fabric.map,null);const innerPositions=liner.children[0].geometry.attributes.position;assert(innerPositions.getY(innerPositions.count-1)<.55,'interior is recessed, not a shallow cap');assert.equal(old.visible,false);assert.equal(liner.material.map,null);assert(liner.userData.neutralNeckInterior);assert.equal(liner.material.transparent,false);
const edges=new Map();
for(const mesh of [outer,liner]){const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv;assert(p.array.every(Number.isFinite));assert(uv.array.every(Number.isFinite));const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(k=>g.index.getX(i+k));for(let j=0;j<3;j++){const e=[key(ids[j]),key(ids[(j+1)%3])].sort().join('|');edges.set(e,(edges.get(e)||0)+1);}}}
assert([...edges.values()].every(n=>n===2),'combined shell is closed, including angular seam');
const p=outer.geometry.attributes.position;for(let i=0;i<128;i++){const a=new THREE.Vector3().fromBufferAttribute(p,i*4+1),b=new THREE.Vector3().fromBufferAttribute(p,i*4+2);assert(Math.abs(a.distanceTo(b)-.006)<1e-6,'consistent material thickness');}
console.log('PASS: closed collar band, consistent thickness, neutral opaque liner, finite UVs');

// The facing must taper inward below the band, never flare through the body.
for(let i=0;i<128;i++){const radius=j=>Math.hypot(innerPositions.getX(j),innerPositions.getZ(j)+.07);assert(radius(i+128)<radius(i)*.56,'lining stays inset beneath the collar');}
