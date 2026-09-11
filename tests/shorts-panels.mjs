import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [file,threePath]=process.argv.slice(2);
assert.ok(file&&threePath,'Pass Shorts GLB and Three.js module paths');
const THREE=await import(pathToFileURL(threePath));
const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+jsonLength)),bin=bytes.subarray(28+jsonLength);
function attribute(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],components={SCALAR:1,VEC2:2,VEC3:3}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],start=(v.byteOffset||0)+(a.byteOffset||0);return new THREE.BufferAttribute(new Type(Uint8Array.from(bin.subarray(start,start+a.count*components*Type.BYTES_PER_ELEMENT)).buffer),components);}
const primitive=json.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',attribute(primitive.attributes.POSITION));geometry.setAttribute('normal',attribute(primitive.attributes.NORMAL));geometry.setAttribute('uv',attribute(primitive.attributes.TEXCOORD_0));geometry.setIndex(attribute(primitive.indices));geometry.computeBoundingBox();
let code=fs.readFileSync(new URL('../v20/shorts-panels.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(pathToFileURL(threePath).href));
const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=new THREE.Group(),source=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());root.add(source);
const panels=module.createShortsPanels(source),group=root.getObjectByName('MQD_Shorts_Panels');
assert.equal(panels.size,2);assert.deepEqual([...panels.keys()],['Front','Back']);assert.equal(source.visible,false);assert.ok(group);
assert.deepEqual(group.children.map(mesh=>mesh.name),['Shorts_Front','Shorts_Back','Shorts_Trim']);
assert.notEqual(panels.get('Front').material,panels.get('Back').material,'zones need independent materials');

const seamZ=(geometry.boundingBox.min.z+geometry.boundingBox.max.z)/2,epsilon=2e-6;
for(const [zone,mesh] of panels){
  const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
  assert.ok(p.count>0);assert.equal(p.count,uv.count);let seamVertices=0;
  for(let i=0;i<p.count;i++){
    assert.ok(zone==='Front'?p.getZ(i)>=seamZ-epsilon:p.getZ(i)<=seamZ+epsilon,`${zone} crossed the seam`);
    if(Math.abs(p.getZ(i)-seamZ)<epsilon)seamVertices++;
    assert.ok(Number.isFinite(uv.getX(i))&&Number.isFinite(uv.getY(i)));
    assert.ok(uv.getX(i)>=-epsilon&&uv.getX(i)<=1+epsilon&&uv.getY(i)>=-epsilon&&uv.getY(i)<=1+epsilon);
  }
  assert.ok(seamVertices>0,`${zone} must terminate on the shared straight seam`);
}

function area(g){const p=g.getAttribute('position'),index=g.index,count=index?index.count:p.count,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let total=0;for(let i=0;i<count;i+=3){a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);total+=b.sub(a).cross(c.sub(a)).length()/2;}return total;}
const sourceArea=area(geometry),outputArea=group.children.reduce((sum,mesh)=>sum+area(mesh.geometry),0);
assert.ok(Math.abs(outputArea-sourceArea)/sourceArea<1e-6,'panel split must conserve all garment surface area');

const crossing=[[-1,0,seamZ-.2,0,0,1],[1,0,seamZ+.2,0,0,1],[0,1,seamZ+.2,0,0,1]];
const partition=module.partitionShortsTriangle(crossing,seamZ);assert.deepEqual(partition.map(x=>x[0]),['Front','Back']);
const seamPoints=partition.flatMap(([,poly])=>poly).filter(v=>Math.abs(v[2]-seamZ)<epsilon);assert.ok(seamPoints.length>=4);assert.ok(seamPoints.every(v=>Math.abs(v[2]-seamZ)<epsilon));
const b=geometry.boundingBox;
assert.deepEqual(module.shortsPanelUv('Front',b.min.x,b.max.y,b),[0,1]);
assert.deepEqual(module.shortsPanelUv('Back',b.max.x,b.max.y,b),[0,1]);
assert.equal(module.shortsTemplatePolygons.Front.length,2);assert.equal(module.shortsTemplatePolygons.Back.length,2);
for(const polygons of Object.values(module.shortsTemplatePolygons))for(const polygon of polygons)for(const point of polygon)assert.ok(point.every(value=>value>=0&&value<=1));

const mutated=geometry.clone();mutated.setAttribute('position',new THREE.BufferAttribute(geometry.getAttribute('position').array.slice(0,-3),3));const badRoot=new THREE.Group(),badSource=new THREE.Mesh(mutated,new THREE.MeshStandardMaterial());badRoot.add(badSource);const previousError=console.error;console.error=()=>{};assert.equal(module.createShortsPanels(badSource),null);console.error=previousError;
console.log('PASS Shorts Front/Back are isolated by one straight seam with readable, normalized 2D-to-3D UVs');
