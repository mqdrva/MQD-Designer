import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [file,threePath]=process.argv.slice(2);assert.ok(file&&threePath,'Pass jacket GLB and Three.js module paths');
const THREE=await import(pathToFileURL(threePath));
const bytes=fs.readFileSync(file),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
function attr(id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],n={SCALAR:1,VEC3:3,VEC2:2}[a.type],Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];const start=(v.byteOffset||0)+(a.byteOffset||0);return new THREE.BufferAttribute(new Type(Uint8Array.from(bin.subarray(start,start+a.count*n*Type.BYTES_PER_ELEMENT)).buffer),n);}
const primitive=json.meshes[0].primitives[0],g=new THREE.BufferGeometry();g.setAttribute('position',attr(primitive.attributes.POSITION));g.setAttribute('normal',attr(primitive.attributes.NORMAL));g.setIndex(attr(primitive.indices));
let code=fs.readFileSync(new URL('../v20/hood-mask-panels.js',import.meta.url),'utf8').replace("'three'",JSON.stringify(pathToFileURL(threePath).href));
const {createHoodMaskPanels}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const root=new THREE.Group(),source=new THREE.Mesh(g,new THREE.MeshStandardMaterial());root.add(source);const panels=createHoodMaskPanels(source),all=source.parent.children.find(x=>x.name==='MQD_Hood_Mask_Panels').children;
assert.equal(panels.size,6);assert.equal(all.length,7);assert.equal(source.visible,false);
assert.equal(new Set(all.map(m=>m.material)).size,7);
const zones=new Map(all.map(m=>[m.name,m]));
for(const mesh of all){assert.ok(mesh.geometry.attributes.position.count>0);assert.ok([...mesh.geometry.attributes.uv.array].every(Number.isFinite));}
for(const [name,side] of [['Left Sleeve',1],['Right Sleeve',-1]]){
 const mesh=panels.get(name),p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
 const box=mesh.geometry.boundingBox,center=box.getCenter(new THREE.Vector3());
 let outer=-Infinity,inner=-Infinity,outerU=0,innerU=0;
 for(let i=0;i<p.count;i++){
  const radial=side*(p.getX(i)-center.x),zPenalty=Math.abs(p.getZ(i)-center.z)*10;
  if(radial-zPenalty>outer){outer=radial-zPenalty;outerU=uv.getX(i);}
  if(-radial-zPenalty>inner){inner=-radial-zPenalty;innerU=uv.getX(i);}
 }
 const wrapped=u=>((u%1)+1)%1;
 assert.ok(Math.abs(wrapped(outerU)-.5)<.08,`${name} artwork center must face outside`);
 assert.ok(wrapped(innerU)<.08||wrapped(innerU)>.92,`${name} inner seam must stay at texture edge`);
}
function area(geometry){let sum=0;const p=geometry.attributes.position,i=geometry.index,n=i?i.count:p.count;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();for(let k=0;k<n;k+=3){a.fromBufferAttribute(p,i?i.getX(k):k);b.fromBufferAttribute(p,i?i.getX(k+1):k+1);c.fromBufferAttribute(p,i?i.getX(k+2):k+2);sum+=b.sub(a).cross(c.sub(a)).length()/2;}return sum;}
assert.ok(Math.abs([...zones.values()].reduce((sum,m)=>sum+area(m.geometry),0)-area(g))<1e-6,'Clipped hood must conserve surface area');

for(const [name,mesh] of panels){for(const m of all)m.material.color.set('#ffffff');mesh.material.color.set('#ff0000');for(const m of all)assert.equal(m.material.color.getHexString(),m===mesh?'ff0000':'ffffff');}
if(process.env.MQD_RENDER){const rows=[];all.forEach((m,id)=>{const a=m.geometry.attributes.position.array;for(let k=0;k<a.length;k+=3)rows.push(a[k],a[k+1],a[k+2],id);});fs.writeFileSync('/tmp/mask-split.bin',Buffer.from(new Float32Array(rows).buffer));}
console.log('PASS six independent panels, neutral opening, conserved area and finite UVs');
