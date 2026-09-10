from pathlib import Path

panel = Path('v20/fleece-hoodie-panels.js')
panel.write_text("""import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. Calibrated against the supplied fleece-hoodie.glb.
// The hoodie is one 500,000-triangle mesh, so these rules split it into five
// mutually-exclusive physical surfaces before any color or artwork is applied.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// The hood occupies the upper central head volume. The ellipse excludes the
// upper chest/shoulders while retaining the rear and side walls of the hood.
const hoodRule={zone:4,tests:[
  v=>v[1]-.385,
  v=>1-(v[0]/.34)**2-((v[2]+.06)/.38)**2
]};

// Long fleece sleeves angle away from the torso. Widen the body-side boundary
// toward the cuff so sleeve color cannot spill down the torso side wall.
const sleeveEdge=y=>y>=0 ? .405-.04*y : .425-.175*y;
const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
  {zone:0,tests:[v=>v[2]+.025+.11*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
""")

test = Path('tests/fleece-hoodie-zones.mjs')
test.write_text("""import assert from 'node:assert/strict';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from '../v20/fleece-hoodie-panels.js';

function zoneAt(x,y,z){
  const v=[x,y,z,0,0,1];
  const parts=partitionFleeceHoodieTriangle([v,v,v]);
  assert.equal(parts.length,1);
  return parts[0][0];
}

assert.deepEqual(hoodiePanelNames,['Front','Back','Left Sleeve','Right Sleeve','Hood']);
assert.equal(zoneAt(0,.70,-.10),4,'upper center must be Hood');
assert.equal(zoneAt(0,0,.30),0,'front torso must be Front');
assert.equal(zoneAt(0,0,-.30),1,'rear torso must be Back');
assert.equal(zoneAt(.68,-.40,.05),2,'positive-X arm must be Left Sleeve');
assert.equal(zoneAt(-.68,-.40,.05),3,'negative-X arm must be Right Sleeve');
assert.equal(zoneAt(.33,.50,.35),0,'front shoulder must not be captured by Hood');

const crossing=partitionFleeceHoodieTriangle([
  [-.05,0,-.08,0,0,1],[.05,0,-.08,0,0,1],[0,0,.08,0,0,1]
]);
assert.ok(crossing.length>=2,'front/back crossing triangle should be clipped, not overlap');
for(const [zone,poly] of crossing){
  assert.ok(zone>=0&&zone<5);
  assert.ok(poly.length>=3);
}
console.log('Fleece Hoodie five-zone isolation tests passed.');
""")

p = Path('v20/editor.js')
s = p.read_text()

import_anchor = "import {partitionLongSleevePoloTriangle} from './long-sleeve-polo-panels.js';"
hoodie_import = "import {partitionFleeceHoodieTriangle,hoodiePanelNames} from './fleece-hoodie-panels.js';"
if hoodie_import not in s:
    if import_anchor not in s:
        raise SystemExit('import anchor not found')
    s = s.replace(import_anchor, import_anchor + "\n" + hoodie_import, 1)

vars_old = "let tshirtZoneGroup=null;\nconst tshirtZoneMeshes=new Map();"
vars_new = vars_old + "\nlet fleeceHoodieZoneGroup=null;\nconst fleeceHoodieZoneMeshes=new Map();"
if "const fleeceHoodieZoneMeshes=new Map();" not in s:
    if vars_old not in s:
        raise SystemExit('zone mesh variable anchor not found')
    s = s.replace(vars_old, vars_new, 1)

cal_anchor = "const MQD_LONG_SLEEVE_POLO_CALIBRATION='isolated-long-sleeve-polo-v2-exclusive-zones';"
cal_line = "const MQD_FLEECE_HOODIE_CALIBRATION='isolated-fleece-hoodie-v1-exclusive-five-zones';"
if cal_line not in s:
    if cal_anchor not in s:
        raise SystemExit('calibration anchor not found')
    s = s.replace(cal_anchor, cal_anchor + "\n// Fleece Hoodie only: frozen garments above do not enter this renderer.\n" + cal_line, 1)

split_code = r"""
function splitFleeceHoodieGeometry(sourceMesh){
 const geometry=sourceMesh.geometry;if(!geometry?.getAttribute('position')||!sourceMesh.parent)return false;
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const pos=geometry.getAttribute('position'),normal=geometry.getAttribute('normal'),index=geometry.index;
 const buffers=hoodiePanelNames.map(()=>({P:[],N:[]}));
 const count=index?index.count:pos.count;
 for(let t=0;t<count;t+=3){
  const triangle=[0,1,2].map(k=>{const i=index?index.getX(t+k):t+k;return[pos.getX(i),pos.getY(i),pos.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i)];});
  const parts=partitionFleeceHoodieTriangle(triangle);
  for(const [zi,poly] of parts){
   const out=buffers[zi];
   for(let k=1;k<poly.length-1;k++)for(const v of[poly[0],poly[k],poly[k+1]]){
    out.P.push(v[0],v[1],v[2]);
    const length=Math.hypot(v[3],v[4],v[5])||1;out.N.push(v[3]/length,v[4]/length,v[5]/length);
   }
  }
 }
 if(buffers.some(b=>!b.P.length))return false;
 const group=new THREE.Group();group.name='MQD_Fleece_Hoodie_Zones';group.position.copy(sourceMesh.position);group.quaternion.copy(sourceMesh.quaternion);group.scale.copy(sourceMesh.scale);
 const base=Array.isArray(sourceMesh.material)?sourceMesh.material[0]:sourceMesh.material;
 buffers.forEach((b,zi)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.N,3));g.computeBoundingBox();g.computeBoundingSphere();
  const m=base?.clone?base.clone():new THREE.MeshStandardMaterial();
  for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in m)m[key]=null;
  if(m.color)m.color.set(zoneState(hoodiePanelNames[zi]).background||'#FFFFFF');m.roughness=.88;m.metalness=0;m.transparent=false;m.opacity=1;m.needsUpdate=true;
  const mesh=new THREE.Mesh(g,m);mesh.name='MQD_Hoodie_'+hoodiePanelNames[zi].replace(/\s+/g,'_');group.add(mesh);fleeceHoodieZoneMeshes.set(hoodiePanelNames[zi],mesh);
 });
 sourceMesh.parent.add(group);fleeceHoodieZoneGroup=group;sourceMesh.visible=false;garment.updateMatrixWorld(true);return true;
}

function updateFleeceHoodieZoneColors(){
 if(product.id!=='fleece-hoodie'||!fleeceHoodieZoneMeshes.size)return false;
 product.zones.forEach(zone=>{const mesh=fleeceHoodieZoneMeshes.get(zone);if(!mesh)return;if(mesh.material?.color)mesh.material.color.set(zoneState(zone).background||'#FFFFFF');mesh.material.needsUpdate=true;});
 return true;
}
function rebuildFleeceHoodiePreview(){
 if(product.id!=='fleece-hoodie'||!fleeceHoodieZoneMeshes.size)return false;
 clearDecals();updateFleeceHoodieZoneColors();garment.updateMatrixWorld(true);
 product.zones.forEach(zone=>{
  const z=stateFor().zones[zone];if(!z?.layers?.some(l=>l.visible!==false))return;
  const target=fleeceHoodieZoneMeshes.get(zone);if(!target)return;
  const canvas=makeCleanZoneArtworkCanvas(zone,1600),tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();tex.minFilter=THREE.LinearMipmapLinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;
  const q=zonePlacement(zone);
  try{const geo=new DecalGeometry(target,q.p,q.r,q.d);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.82,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;decalGroup.add(mesh);}catch(e){tex.dispose();console.warn('Fleece Hoodie decal failed',zone,e);}
 });
 return true;
}
"""

split_anchor = "function disposeZoneTexture(mesh){"
if "function splitFleeceHoodieGeometry(sourceMesh)" not in s:
    if split_anchor not in s:
        raise SystemExit('split insertion anchor not found')
    s = s.replace(split_anchor, split_code + "\n" + split_anchor, 1)

preview_old = "function rebuildGarmentPreview(){if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)&&tshirtZoneMeshes.size){clearDecals();updateTshirtZoneTextures();return;}rebuildDecals();}"
preview_new = "function rebuildGarmentPreview(){if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)&&tshirtZoneMeshes.size){clearDecals();updateTshirtZoneTextures();return;}if(product.id==='fleece-hoodie'&&fleeceHoodieZoneMeshes.size){rebuildFleeceHoodiePreview();return;}rebuildDecals();}"
if preview_old in s:
    s = s.replace(preview_old, preview_new, 1)
elif preview_new not in s:
    raise SystemExit('preview selector not found')

clear_old = "tshirtZoneMeshes.clear();tshirtZoneGroup=null;clearDecals();preloadTemplates();"
clear_new = "tshirtZoneMeshes.clear();tshirtZoneGroup=null;fleeceHoodieZoneMeshes.clear();fleeceHoodieZoneGroup=null;clearDecals();preloadTemplates();"
if clear_old in s:
    s = s.replace(clear_old, clear_new, 1)
elif clear_new not in s:
    raise SystemExit('load clear anchor not found')

load_old = "if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)){const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);}rebuildGarmentPreview();"
load_new = "if(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo'].includes(product.id)){const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);}if(product.id==='fleece-hoodie'){const source=findPrimaryMesh(garment);if(source)splitFleeceHoodieGeometry(source);}rebuildGarmentPreview();"
if load_old in s:
    s = s.replace(load_old, load_new, 1)
elif load_new not in s:
    raise SystemExit('load split anchor not found')

p.write_text(s)
