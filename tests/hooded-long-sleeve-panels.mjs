import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const [file,threePath]=process.argv.slice(2);
assert.ok(file&&threePath,'Pass hooded long-sleeve GLB and Three.js module paths');
const THREE=await import(pathToFileURL(threePath));
const bytes=fs.readFileSync(file),jsonLength=bytes.readUInt32LE(12);
const json=JSON.parse(bytes.subarray(20,20+jsonLength));
const bin=bytes.subarray(28+jsonLength);
function attribute(id){
  const accessor=json.accessors[id],view=json.bufferViews[accessor.bufferView];
  const width={SCALAR:1,VEC2:2,VEC3:3}[accessor.type];
  const Type={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[accessor.componentType];
  const start=(view.byteOffset||0)+(accessor.byteOffset||0);
  const copy=Uint8Array.from(bin.subarray(start,start+accessor.count*width*Type.BYTES_PER_ELEMENT));
  return new THREE.BufferAttribute(new Type(copy.buffer),width);
}
const primitive=json.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
geometry.setAttribute('position',attribute(primitive.attributes.POSITION));
geometry.setAttribute('normal',attribute(primitive.attributes.NORMAL));
geometry.setAttribute('uv',attribute(primitive.attributes.TEXCOORD_0));
geometry.setIndex(attribute(primitive.indices));

let source=fs.readFileSync(new URL('../v20/hooded-long-sleeve-panels.js',import.meta.url),'utf8');
source=source
  .replace("'three'",JSON.stringify(pathToFileURL(threePath).href))
  .replace("'./panels.js'",JSON.stringify(new URL('../v20/panels.js',import.meta.url).href));
const module=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const texture=new THREE.Texture();
const material=new THREE.MeshStandardMaterial({map:texture,color:'#ffffff'});
const root=new THREE.Group(),sourceMesh=new THREE.Mesh(geometry,material);root.add(sourceMesh);
const panels=module.createHoodedLongSleevePanels(sourceMesh);
const group=root.getObjectByName('MQD_Hooded_Long_Sleeve_Zones');

assert.deepEqual(module.hoodedLongSleevePanelNames,['Front','Back','Left Sleeve','Right Sleeve','Hood']);
assert.deepEqual(module.hoodedLongSleevePanelNames.map(name=>module.hoodedLongSleeveArtworkTransform(name).flipX),[false,false,true,true,false],
  'only sleeve text needs the physical UV direction correction');
assert.equal(panels.size,5,'exactly five customer print zones are required');
assert.equal(group.children.length,7,'five zones plus drawstrings and hood lining are required');
assert.equal(sourceMesh.visible,false);
assert.equal(new Set(group.children.map(mesh=>mesh.material)).size,7,'every surface must own an independent material');
for(const [name,mesh] of panels){
  assert.equal(mesh.material.map,null,`${name} must not inherit another zone or the source atlas`);
  assert.equal(mesh.material.side,name==='Hood'?THREE.DoubleSide:THREE.FrontSide,`${name} must use its calibrated surface visibility`);
  assert.ok(mesh.geometry.getAttribute('position').count>0);
  assert.ok([...mesh.geometry.getAttribute('uv').array].every(Number.isFinite));
}
const drawstrings=group.getObjectByName('MQD_Hooded_Long_Drawstrings');
const lining=group.getObjectByName('MQD_Hooded_Long_Hood_Lining');
assert.equal(drawstrings.material.map,texture,'drawstrings must retain the original white/gray texture');
assert.equal(lining.material.map,texture,'hood lining must retain the original black texture');

function zoneAt(x,y,z){
  const vertex=[x,y,z,0,0,1,0,0];
  const parts=module.partitionHoodedLongSleeveTriangle([vertex,vertex,vertex]);
  assert.equal(parts.length,1);
  return parts[0][0];
}
assert.equal(zoneAt(0,0,.10),0,'front torso must be Front');
assert.equal(zoneAt(0,0,-.10),1,'rear torso must be Back');
assert.equal(zoneAt(.62,-.30,0),2,'positive-X arm must be Left Sleeve');
assert.equal(zoneAt(-.62,-.30,0),3,'negative-X arm must be Right Sleeve');
assert.equal(zoneAt(0,.55,-.10),4,'lower rear hood point must be Hood');
assert.equal(zoneAt(0,.58,.10),0,'front panel must rise above the old hood overlap');
assert.equal(zoneAt(0,.61,.02),0,'front hood color must stop close to the neckline');
assert.equal(zoneAt(0,.80,-.10),4,'rear-facing hood folds must receive the solid Hood color, not neutral lining');
assert.equal(zoneAt(0,.80,-.145),4,'rear hood shell must be Hood');
assert.equal(zoneAt(0,.80,-.05),6,'recessed hood opening must remain neutral lining');
assert.equal(zoneAt(-.121,.20,.08),5,'left drawstring must remain neutral');
assert.equal(zoneAt(.119,.20,.08),5,'right drawstring must remain neutral');
assert.equal(zoneAt(0,.20,.08),0,'center chest fabric must remain printable Front');

// The body separator is one continuous straight plane from shoulder to hem.
for(const y of[-.75,-.35,.05,.42]){
  const seam=.028-.045*y;
  assert.equal(zoneAt(.20,y,seam+.001),0,`front side of seam must remain Front at y=${y}`);
  assert.equal(zoneAt(.20,y,seam-.001),1,`rear side of seam must remain Back at y=${y}`);
}
assert.equal(zoneAt(.45,0,.08),2,'the sleeve must own its complete join without a body-color strip');

// Generated UVs preserve the 2D reading direction and vertical placement.
const front=panels.get('Front'),back=panels.get('Back');
for(const mesh of panels.values()){
  const p=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
  let low=Infinity,high=-Infinity,lowV=0,highV=0;
  for(let i=0;i<p.count;i++){
    if(p.getY(i)<low){low=p.getY(i);lowV=uv.getY(i);}
    if(p.getY(i)>high){high=p.getY(i);highV=uv.getY(i);}
  }
  assert.ok(highV>lowV+.9,'2D up/down placement must span the complete physical print zone');
}
const frontBox=front.geometry.boundingBox,backBox=back.geometry.boundingBox;
assert.ok(module.hoodedLongSleevePanelUv('Front',frontBox.min.x,0,.1,frontBox)[0]<.01);
assert.ok(module.hoodedLongSleevePanelUv('Back',backBox.min.x,0,-.1,backBox)[0]>.99,'Back text must read correctly from the rear');
for(const name of['Left Sleeve','Right Sleeve']){
  const box=panels.get(name).geometry.boundingBox,center=box.getCenter(new THREE.Vector3());
  const x=name==='Left Sleeve'?box.max.x:box.min.x;
  assert.ok(Math.abs(module.hoodedLongSleevePanelUv(name,x,center.y,center.z,box)[0]-.5)<1e-6,
    `${name} centered 2D text must land on the outside arm, not the inside seam`);
}
const hoodBox=panels.get('Hood').geometry.boundingBox,hoodCenter=hoodBox.getCenter(new THREE.Vector3());
assert.ok(Math.abs(module.hoodedLongSleevePanelUv('Hood',0,hoodCenter.y,hoodBox.min.z,hoodBox)[0]-.5)<1e-6,
  'centered Hood text must land on the rear exterior center');

function area(g){
  const p=g.getAttribute('position'),index=g.index,count=index?index.count:p.count;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let total=0;
  for(let i=0;i<count;i+=3){
    a.fromBufferAttribute(p,index?index.getX(i):i);
    b.fromBufferAttribute(p,index?index.getX(i+1):i+1);
    c.fromBufferAttribute(p,index?index.getX(i+2):i+2);
    total+=b.sub(a).cross(c.sub(a)).length()/2;
  }
  return total;
}
const splitArea=group.children.reduce((sum,mesh)=>sum+area(mesh.geometry),0);
assert.ok(Math.abs(splitArea-area(geometry))<1e-6,'exclusive clipped zones must conserve the complete garment surface');

for(const [name,active] of panels){
  for(const mesh of panels.values())mesh.material.color.set('#ffffff');
  active.material.color.set('#ff0000');
  for(const [other,mesh] of panels)
    assert.equal(mesh.material.color.getHexString(),other===name?'ff0000':'ffffff',`${name} may not influence ${other}`);
}

console.log('PASS hooded long-sleeve has five isolated zones, straight side seam, neutral strings/lining, and aligned UVs');
