from pathlib import Path
import re

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# 1) Background colors are state, never artwork layers.
old_state=r"const zoneLayerState=\{\};\s*let activeLayerId=null;\s*let decalTarget=null;\s*let decalGroup=null;\s*let layerSeq=1;\s*function ensureZoneState\(\)\{.*?\}\s*function currentZoneLayers\(\)\{.*?\}\s*function allProductLayers\(\)\{.*?\}\s*function syncLegacyLayers\(\)\{.*?\}\n"
new_state="""const zoneLayerState={};
const zoneBackgroundState={};
let activeLayerId=null;
let decalTarget=null;
let decalGroup=null;
let layerSeq=1;
function ensureZoneBackgroundState(){if(!zoneBackgroundState[product.id])zoneBackgroundState[product.id]={};for(const z of product.zones)if(!zoneBackgroundState[product.id][z])zoneBackgroundState[product.id][z]='#FFFFFF';return zoneBackgroundState[product.id];}
function ensureZoneState(){if(!zoneLayerState[product.id])zoneLayerState[product.id]={};ensureZoneBackgroundState();for(const z of product.zones){if(!zoneLayerState[product.id][z])zoneLayerState[product.id][z]=[];const arr=zoneLayerState[product.id][z];for(let i=arr.length-1;i>=0;i--){const l=arr[i];if(l.type==='background'){zoneBackgroundState[product.id][z]=normalizeHex(l.color||'#FFFFFF')||'#FFFFFF';if(l.mesh&&decalGroup){decalGroup.remove(l.mesh);l.mesh.geometry?.dispose();l.mesh.material?.dispose();}l.texture?.dispose?.();arr.splice(i,1);}}}}
function currentZoneLayers(){ensureZoneState();return zoneLayerState[product.id][activeZone]||[];}
function allProductLayers(){ensureZoneState();return product.zones.flatMap(z=>zoneLayerState[product.id][z]||[]).filter(l=>l.type!=='background');}
function syncLegacyLayers(){layers=allProductLayers().map(l=>({id:l.id,type:l.type,zone:l.zone,name:l.name,text:l.text,x:l.x,y:l.y,scale:l.scale,rotation:l.rotation,visible:l.visible}));}
"""
s,n=re.subn(old_state,new_state,s,count=1,flags=re.S)
if n!=1: raise SystemExit('state block not found')

# 2) Add geometry-based zone background coloring. This colors the garment surface itself,
# instead of projecting a rectangular color decal.
marker='function renderZones(){'
helper="""function zoneColorValue(zone){ensureZoneBackgroundState();return normalizeHex(zoneBackgroundState[product.id][zone]||'#FFFFFF')||'#FFFFFF';}
function applyZoneBackgroundColors(){
 if(!garment)return;
 ensureZoneBackgroundState();
 garment.traverse(o=>{
  if(!o.isMesh||!o.geometry)return;
  const g=o.geometry;const pos=g.getAttribute('position');if(!pos)return;
  let normal=g.getAttribute('normal');if(!normal){g.computeVertexNormals();normal=g.getAttribute('normal')}
  g.computeBoundingBox();const b=g.boundingBox;const sx=Math.max(.0001,b.max.x-b.min.x),sy=Math.max(.0001,b.max.y-b.min.y);const cx=(b.max.x+b.min.x)/2;
  let col=g.getAttribute('color');if(!col||col.count!==pos.count){col=new THREE.BufferAttribute(new Float32Array(pos.count*3),3);g.setAttribute('color',col)}
  const white=new THREE.Color('#FFFFFF'),frontC=new THREE.Color(zoneColorValue('Front')),backC=new THREE.Color(zoneColorValue('Back')),leftC=new THREE.Color(zoneColorValue('Left Sleeve')),rightC=new THREE.Color(zoneColorValue('Right Sleeve')),collarC=new THREE.Color(zoneColorValue('Collar'));
  const torsoHalf=sx*.29, neckHalfX=sx*.19, neckStart=b.max.y-sy*.19;
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),nz=normal?normal.getZ(i):0;let c=white;
   const inTorso=Math.abs(x-cx)<=torsoHalf;
   const inNeckPocket=(y>=neckStart&&Math.abs(x-cx)<=neckHalfX);
   if(product.zones.includes('Collar')&&inNeckPocket&&y>b.max.y-sy*.14)c=collarC;
   else if(product.zones.includes('Front')&&inTorso&&nz>=0.0&&!inNeckPocket)c=frontC;
   else if(product.zones.includes('Back')&&inTorso&&nz<0.0&&!inNeckPocket)c=backC;
   else if(product.zones.includes('Left Sleeve')&&x<cx-torsoHalf)c=leftC;
   else if(product.zones.includes('Right Sleeve')&&x>cx+torsoHalf)c=rightC;
   col.setXYZ(i,c.r,c.g,c.b);
  }
  col.needsUpdate=true;
  const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{m.vertexColors=true;if(m.color)m.color.set('#FFFFFF');m.needsUpdate=true});
 });
}
function applyDecalZoneMask(mat,layer){
 if(!garment||!layer||layer.zone!=='Front')return;
 const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const neckCenterY=box.max.y-size.y*.075,neckHalfY=size.y*.125,neckHalfX=size.x*.20,torsoHalfX=size.x*.30;
 mat.onBeforeCompile=shader=>{
  shader.uniforms.mqdCenterX={value:center.x};shader.uniforms.mqdTorsoHalfX={value:torsoHalfX};shader.uniforms.mqdNeckCenterY={value:neckCenterY};shader.uniforms.mqdNeckHalfX={value:neckHalfX};shader.uniforms.mqdNeckHalfY={value:neckHalfY};
  shader.vertexShader='varying vec3 vMqdWorldPos;\\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\\nvMqdWorldPos=(modelMatrix*vec4(position,1.0)).xyz;');
  shader.fragmentShader='varying vec3 vMqdWorldPos;\\nuniform float mqdCenterX;\\nuniform float mqdTorsoHalfX;\\nuniform float mqdNeckCenterY;\\nuniform float mqdNeckHalfX;\\nuniform float mqdNeckHalfY;\\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>\nif(abs(vMqdWorldPos.x-mqdCenterX)>mqdTorsoHalfX) discard;\nfloat mqdNX=(vMqdWorldPos.x-mqdCenterX)/mqdNeckHalfX;\nfloat mqdNY=(vMqdWorldPos.y-mqdNeckCenterY)/mqdNeckHalfY;\nif((mqdNX*mqdNX+mqdNY*mqdNY)<1.0) discard;`);
 };
 mat.customProgramCacheKey=()=>`mqd-front-mask-v2`;
 mat.needsUpdate=true;
}
"""
if marker not in s: raise SystemExit('renderZones marker not found')
s=s.replace(marker,helper+marker,1)

# 3) Replace background-as-layer functions.
s,n=re.subn(r"function setZoneBackground\(c\)\{.*?\}\nfunction normalizeHex", """function setZoneBackground(c){const hex=normalizeHex(c);if(!hex)return;ensureZoneBackgroundState();zoneBackgroundState[product.id][activeZone]=hex;applyZoneBackgroundColors();syncZoneColorInputs();updateStats();}\nfunction normalizeHex""", s, count=1, flags=re.S)
if n!=1: raise SystemExit('setZoneBackground not found')
s,n=re.subn(r"function syncZoneColorInputs\(\)\{.*?\}\nfunction renderSwatches", """function syncZoneColorInputs(){ensureZoneBackgroundState();const c=zoneColorValue(activeZone);const picker=$('zoneColorPicker'),hex=$('zoneHex');if(picker)picker.value=c.toLowerCase();if(hex)hex.value=c;}\nfunction renderSwatches""", s, count=1, flags=re.S)
if n!=1: raise SystemExit('syncZoneColorInputs not found')
s,n=re.subn(r"function renderSwatches\(\)\{.*?\}\nfunction updateStats", """function renderSwatches(){ $('swatches').innerHTML='';const current=zoneColorValue(activeZone);colors.forEach(c=>{const b=document.createElement('button');b.className='swatch'+(current.toLowerCase()===c.toLowerCase()?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{setZoneBackground(c);renderSwatches()};$('swatches').appendChild(b)});syncZoneColorInputs()}\nfunction updateStats""", s, count=1, flags=re.S)
if n!=1: raise SystemExit('renderSwatches not found')

# 4) Apply geometry backgrounds whenever a garment loads.
old="prepareDesignTexture();decalTarget=findDecalTarget();clearDecals();rebuildAllDecals();renderLayerEditor();"
new="prepareDesignTexture();applyZoneBackgroundColors();decalTarget=findDecalTarget();clearDecals();rebuildAllDecals();renderLayerEditor();"
if old not in s: raise SystemExit('load garment hook not found')
s=s.replace(old,new,1)

# 5) Mask Front decals away from collar and sleeves.
oldmat="const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.8,metalness:0});const mesh=new THREE.Mesh(geo,mat);"
newmat="const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.8,metalness:0});applyDecalZoneMask(mat,layer);const mesh=new THREE.Mesh(geo,mat);"
if oldmat not in s: raise SystemExit('decal material block not found')
s=s.replace(oldmat,newmat,1)

# 6) Color picker: don't rebuild a 280k-vertex garment on every pointer tick.
# Update the hex display live, then apply on the color input's change event.
s,n=re.subn(r"let zoneColorPickerRaf=0;\s*\$\('zoneColorPicker'\)\?\.addEventListener\('input',.*?\);\s*\$\('zoneColorPicker'\)\?\.addEventListener\('change',", """$('zoneColorPicker')?.addEventListener('input',e=>{$('zoneHex').value=e.target.value.toUpperCase()});\n$('zoneColorPicker')?.addEventListener('change',""", s, count=1, flags=re.S)
if n!=1: raise SystemExit('color picker handlers not found')

# 7) Make layer UI explicitly artwork-only and count only artwork.
s=s.replace("const zs=currentZoneLayers();empty.classList.toggle('hidden',zs.length>0);", "const zs=currentZoneLayers().filter(l=>l.type!=='background');empty.classList.toggle('hidden',zs.length>0);", 1)
s=s.replace("$('layerCount').textContent=layers.length;", "$('layerCount').textContent=allProductLayers().length;", 1)

# Preserve separate background HEX values in design JSON/export metadata.
s=s.replace("const data={product:{id:product.id,name:product.name,category:product.category,price:product.price},activeZone,layers,createdAt:new Date().toISOString()};", "const data={product:{id:product.id,name:product.name,category:product.category,price:product.price},activeZone,layers,zoneBackgrounds:{...(zoneBackgroundState[product.id]||{})},createdAt:new Date().toISOString()};", 1)
s=s.replace("zones:product.zones,\n   generatedAt", "zones:product.zones,\n   zoneBackgrounds:{...(zoneBackgroundState[product.id]||{})},\n   generatedAt", 1)

p.write_text(s,encoding='utf-8')
print('patched index.html')
