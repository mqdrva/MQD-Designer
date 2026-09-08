from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

css_anchor = '.template-card img{width:100%;height:110px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid #eee}.template-meta{font-size:11px;color:#666;margin-top:7px;line-height:1.35}'
css_extra = '''
.layer-list{display:grid;gap:7px;margin-top:8px}.layer-item{display:flex;align-items:center;justify-content:space-between;gap:8px;border:1px solid var(--line);border-radius:10px;padding:8px;background:#fff;cursor:pointer}.layer-item.active{border-color:#111;background:#f2f2f3}.layer-name{font-size:12px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.layer-zone{font-size:10px;color:var(--muted);margin-top:2px}.layer-controls{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#fafafa}.range-row{display:grid;grid-template-columns:64px 1fr 42px;align-items:center;gap:7px;margin-top:8px;font-size:11px}.range-row input[type=range]{width:100%}.layer-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.hint-box{font-size:11px;line-height:1.4;color:var(--muted);background:#f7f7f8;border-radius:10px;padding:9px}
'''
if css_anchor not in s:
    raise SystemExit('CSS anchor missing')
s = s.replace(css_anchor, css_anchor + css_extra, 1)

artwork_block = '<div class="section"><div class="label">Artwork</div><input id="artUpload" type="file" accept="image/png,image/jpeg,image/webp" class="input"><div class="row control"><button class="btn" id="addText">Add Text</button><button class="btn" id="reset">Reset</button></div></div>'
layer_ui = '''<div class="section"><div class="label">Layers — <span id="layerZoneLabel">Front</span></div><div id="layerEmpty" class="hint-box">Upload artwork or add text to this print zone. Layers in other zones stay separate.</div><div id="layerList" class="layer-list"></div><div id="layerControls" class="layer-controls hidden"><div style="font-size:12px;font-weight:800" id="selectedLayerName">Selected layer</div><div class="range-row"><span>Left / Right</span><input id="layerX" type="range" min="-100" max="100" value="0"><strong id="layerXVal">0</strong></div><div class="range-row"><span>Up / Down</span><input id="layerY" type="range" min="-100" max="100" value="0"><strong id="layerYVal">0</strong></div><div class="range-row"><span>Size</span><input id="layerScale" type="range" min="10" max="160" value="70"><strong id="layerScaleVal">70</strong></div><div class="range-row"><span>Rotate</span><input id="layerRotation" type="range" min="-180" max="180" value="0"><strong id="layerRotationVal">0°</strong></div><div class="layer-actions"><button class="btn" id="toggleLayer">Hide</button><button class="btn danger" id="deleteLayer">Delete</button></div></div></div>'''
if artwork_block not in s:
    raise SystemExit('Artwork block missing')
s = s.replace(artwork_block, artwork_block + layer_ui, 1)

import_anchor = "import {OrbitControls} from 'three/addons/controls/OrbitControls.js';"
if import_anchor not in s:
    raise SystemExit('Import anchor missing')
s = s.replace(import_anchor, import_anchor + "\nimport {DecalGeometry} from 'three/addons/geometries/DecalGeometry.js';", 1)

editor_code = r'''
const zoneLayerState={};
let activeLayerId=null;
let decalTarget=null;
let decalGroup=null;
let layerSeq=1;
function ensureZoneState(){if(!zoneLayerState[product.id])zoneLayerState[product.id]={};for(const z of product.zones)if(!zoneLayerState[product.id][z])zoneLayerState[product.id][z]=[];}
function currentZoneLayers(){ensureZoneState();return zoneLayerState[product.id][activeZone]||[];}
function allProductLayers(){ensureZoneState();return product.zones.flatMap(z=>zoneLayerState[product.id][z]||[]);}
function syncLegacyLayers(){layers=allProductLayers().map(l=>({id:l.id,type:l.type,zone:l.zone,name:l.name,text:l.text,x:l.x,y:l.y,scale:l.scale,rotation:l.rotation,visible:l.visible}));}
function clearDecals(){if(decalGroup){scene.remove(decalGroup);decalGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose())}})}decalGroup=new THREE.Group();decalGroup.name='MQD_ZONE_ARTWORK';scene.add(decalGroup);}
function findDecalTarget(){let best=null,bestScore=-1;garment?.traverse(o=>{if(!o.isMesh||!o.geometry)return;const b=new THREE.Box3().setFromObject(o),sz=b.getSize(new THREE.Vector3());const score=sz.x*sz.y*sz.z;if(score>bestScore){bestScore=score;best=o}});return best;}
function makeTextTexture(text){const c=document.createElement('canvas');c.width=1024;c.height=512;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.fillStyle='#111';x.font='bold 180px Inter, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,512,256,950);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
function layerTexture(layer){if(layer.texture)return layer.texture;if(layer.type==='text')layer.texture=makeTextTexture(layer.text||'Text');return layer.texture;}
function zoneProjection(layer){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());const nx=layer.x/100,ny=layer.y/100,sc=Math.max(.08,layer.scale/100),r=THREE.MathUtils.degToRad(layer.rotation||0);let pos=new THREE.Vector3(),ori=new THREE.Euler(),dims=new THREE.Vector3();const z=layer.zone;
if(z==='Back'){pos.set(c.x+nx*size.x*.28,c.y+ny*size.y*.28,box.min.z-size.z*.02);ori.set(0,Math.PI,r);dims.set(size.x*.58*sc,size.y*.64*sc,size.z*.35)}
else if(z==='Left Sleeve'){pos.set(box.min.x-size.x*.01,c.y+size.y*.19+ny*size.y*.13,c.z+nx*size.z*.18);ori.set(0,-Math.PI/2,r);dims.set(size.z*.95*sc,size.y*.34*sc,size.x*.26)}
else if(z==='Right Sleeve'){pos.set(box.max.x+size.x*.01,c.y+size.y*.19+ny*size.y*.13,c.z-nx*size.z*.18);ori.set(0,Math.PI/2,r);dims.set(size.z*.95*sc,size.y*.34*sc,size.x*.26)}
else if(z==='Collar'){pos.set(c.x+nx*size.x*.12,box.max.y+size.y*.005,c.z+ny*size.z*.12);ori.set(-Math.PI/2,0,r);dims.set(size.x*.28*sc,size.z*1.15*sc,size.y*.15)}
else{pos.set(c.x+nx*size.x*.28,c.y+ny*size.y*.28,box.max.z+size.z*.02);ori.set(0,0,r);dims.set(size.x*.58*sc,size.y*.64*sc,size.z*.35)}
return{pos,ori,dims};}
function rebuildLayerDecal(layer){if(!decalTarget||!decalGroup||!layer)return;if(layer.mesh){decalGroup.remove(layer.mesh);layer.mesh.geometry.dispose();layer.mesh.material.dispose();layer.mesh=null}if(layer.visible===false)return;const tex=layerTexture(layer);if(!tex)return;const q=zoneProjection(layer);try{const geo=new DecalGeometry(decalTarget,q.pos,q.ori,q.dims);const mat=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,roughness:.8,metalness:0});const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;layer.mesh=mesh;decalGroup.add(mesh)}catch(e){console.warn('Artwork projection failed',e)}}
function rebuildAllDecals(){if(!garment)return;if(!decalGroup)clearDecals();allProductLayers().forEach(rebuildLayerDecal);}
function selectLayer(id){activeLayerId=id;renderLayerEditor();}
function activeLayer(){return currentZoneLayers().find(l=>l.id===activeLayerId)||null;}
function renderLayerEditor(){ensureZoneState();const list=$('layerList'),empty=$('layerEmpty'),controlsEl=$('layerControls');if(!list)return;$('layerZoneLabel').textContent=activeZone;list.innerHTML='';const zs=currentZoneLayers();empty.classList.toggle('hidden',zs.length>0);zs.forEach(l=>{const row=document.createElement('div');row.className='layer-item'+(l.id===activeLayerId?' active':'');row.innerHTML=`<div style="min-width:0"><div class="layer-name">${escapeHtml(l.name||l.text||'Artwork')}</div><div class="layer-zone">${escapeHtml(l.zone)}${l.visible===false?' · hidden':''}</div></div><span>${l.type==='text'?'T':'▧'}</span>`;row.onclick=()=>selectLayer(l.id);list.appendChild(row)});const l=activeLayer();controlsEl.classList.toggle('hidden',!l);if(!l)return;$('selectedLayerName').textContent=l.name||l.text||'Selected layer';$('layerX').value=l.x;$('layerY').value=l.y;$('layerScale').value=l.scale;$('layerRotation').value=l.rotation;$('layerXVal').textContent=l.x;$('layerYVal').textContent=l.y;$('layerScaleVal').textContent=l.scale;$('layerRotationVal').textContent=l.rotation+'°';$('toggleLayer').textContent=l.visible===false?'Show':'Hide';}
function updateActiveLayer(prop,value){const l=activeLayer();if(!l)return;l[prop]=value;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor();updateStats();}
function addZoneLayer(layer){ensureZoneState();layer.id='layer-'+layerSeq++;layer.zone=activeZone;layer.x=0;layer.y=0;layer.scale=70;layer.rotation=0;layer.visible=true;zoneLayerState[product.id][activeZone].push(layer);activeLayerId=layer.id;syncLegacyLayers();rebuildLayerDecal(layer);renderLayerEditor();updateStats();}
function bindLayerControls(){[['layerX','x'],['layerY','y'],['layerScale','scale'],['layerRotation','rotation']].forEach(([id,p])=>{$(id)?.addEventListener('input',e=>updateActiveLayer(p,Number(e.target.value)))});$('deleteLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;if(l.mesh){decalGroup.remove(l.mesh);l.mesh.geometry.dispose();l.mesh.material.dispose()}const arr=currentZoneLayers(),i=arr.findIndex(x=>x.id===l.id);if(i>=0)arr.splice(i,1);activeLayerId=arr.at(-1)?.id||null;syncLegacyLayers();renderLayerEditor();updateStats()});$('toggleLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.visible=l.visible===false;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor()});}
'''
marker = 'const seed=['
if marker not in s:
    raise SystemExit('seed marker missing')
s = s.replace(marker, editor_code + '\n' + marker, 1)

old_render = "function renderZones(){\n $('zones').innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone'+(z===activeZone?' active':'');b.textContent=z;b.onclick=()=>{activeZone=z;renderZones();updateStats()};$('zones').appendChild(b)});\n}"
new_render = "function renderZones(){\n $('zones').innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone'+(z===activeZone?' active':'');b.textContent=z;b.onclick=()=>{activeZone=z;activeLayerId=currentZoneLayers().at(-1)?.id||null;renderZones();renderLayerEditor();updateStats()};$('zones').appendChild(b)});\n}"
if old_render not in s:
    raise SystemExit('renderZones missing')
s = s.replace(old_render, new_render, 1)

old_load = "new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitObject(garment);prepareDesignTexture();},undefined,e=>console.error(e));"
new_load = "new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitObject(garment);prepareDesignTexture();decalTarget=findDecalTarget();clearDecals();rebuildAllDecals();renderLayerEditor();},undefined,e=>console.error(e));"
if old_load not in s:
    raise SystemExit('load garment anchor missing')
s = s.replace(old_load, new_load, 1)

pattern = r"function addImage\(src\)\{.*?\}\n\$\('artUpload'\)\.addEventListener\('change',e=>\{const f=e\.target\.files\[0\];if\(f\)addImage\(URL\.createObjectURL\(f\)\)\}\);"
replacement = r'''function addImage(src,fileName='Artwork'){const img=new Image();img.onload=()=>{const tex=new THREE.Texture(img);tex.colorSpace=THREE.SRGBColorSpace;tex.needsUpdate=true;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();addZoneLayer({type:'image',name:fileName,texture:tex,src});const preview=$('previewImage'),empty=$('previewEmpty');if(preview){preview.src=src;preview.style.display='block'}if(empty)empty.style.display='none';};img.src=src}
$('artUpload').addEventListener('change',e=>{const f=e.target.files[0];if(f)addImage(URL.createObjectURL(f),f.name)});'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('addImage replace failed')

pattern = r"\$\('addText'\)\.onclick=.*?;\n\$\('reset'\)\.onclick=.*?;"
replacement = r'''$('addText').onclick=()=>{const text=prompt('Text to add');if(!text)return;addZoneLayer({type:'text',name:text,text});};
$('reset').onclick=()=>{ensureZoneState();const arr=currentZoneLayers();arr.forEach(l=>{if(l.mesh){decalGroup?.remove(l.mesh);l.mesh.geometry.dispose();l.mesh.material.dispose()}});zoneLayerState[product.id][activeZone]=[];activeLayerId=null;syncLegacyLayers();const preview=$('previewImage'),empty=$('previewEmpty');if(preview){preview.removeAttribute('src');preview.style.display='none'}if(empty)empty.style.display='flex';renderLayerEditor();updateStats()};'''
s, n = re.subn(pattern, replacement, s, count=1, flags=re.S)
if n != 1:
    raise SystemExit('text/reset replace failed')

old_select = "function selectProduct(id){product=catalog.find(p=>p.id===id)||catalog[0];activeZone=product.zones[0];layers=[];renderCatalog();renderZones();updateStats();loadGarment()}"
new_select = "function selectProduct(id){product=catalog.find(p=>p.id===id)||catalog[0];activeZone=product.zones[0];ensureZoneState();activeLayerId=currentZoneLayers().at(-1)?.id||null;syncLegacyLayers();renderCatalog();renderZones();renderLayerEditor();updateStats();loadGarment()}"
if old_select not in s:
    raise SystemExit('selectProduct missing')
s = s.replace(old_select, new_select, 1)

init_anchor = 'renderCatalog();renderZones();renderSwatches();updateStats();loadGarment();'
if init_anchor not in s:
    raise SystemExit('init anchor missing')
s = s.replace(init_anchor, 'bindLayerControls();ensureZoneState();renderCatalog();renderZones();renderSwatches();renderLayerEditor();updateStats();loadGarment();', 1)

p.write_text(s, encoding='utf-8')
