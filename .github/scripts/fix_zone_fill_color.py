from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

repls=[]
repls.append((
'<div class="section"><div class="label">Garment color</div><div id="swatches" class="swatches"></div></div>',
'<div class="section"><div class="label">Selected area background</div><div id="swatches" class="swatches"></div></div>'
))
repls.append((
'.layer-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}',
'.layer-actions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-top:10px}'
))
repls.append((
'<div class="layer-actions"><button class="btn" id="toggleLayer">Hide</button><button class="btn danger" id="deleteLayer">Delete</button></div>',
'<div class="layer-actions"><button class="btn" id="fillLayer">Fill Area</button><button class="btn" id="toggleLayer">Hide</button><button class="btn danger" id="deleteLayer">Delete</button></div>'
))
repls.append((
"function syncLegacyLayers(){layers=allProductLayers().map(l=>({id:l.id,type:l.type,zone:l.zone,name:l.name,text:l.text,x:l.x,y:l.y,scale:l.scale,rotation:l.rotation,visible:l.visible}));}",
"function syncLegacyLayers(){layers=allProductLayers().map(l=>({id:l.id,type:l.type,zone:l.zone,name:l.name,text:l.text,color:l.color,x:l.x,y:l.y,scale:l.scale,rotation:l.rotation,visible:l.visible}));}"
))
repls.append((
"function layerTexture(layer){if(layer.texture)return layer.texture;if(layer.type==='text')layer.texture=makeTextTexture(layer.text||'Text');return layer.texture;}",
"function makeColorTexture(color){const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');x.fillStyle=color;x.fillRect(0,0,32,32);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}\nfunction layerTexture(layer){if(layer.texture)return layer.texture;if(layer.type==='text')layer.texture=makeTextTexture(layer.text||'Text');if(layer.type==='background')layer.texture=makeColorTexture(layer.color||'#ffffff');return layer.texture;}"
))
repls.append((
"function addZoneLayer(layer){ensureZoneState();layer.id='layer-'+layerSeq++;layer.zone=activeZone;layer.x=0;layer.y=0;layer.scale=70;layer.rotation=0;layer.visible=true;zoneLayerState[product.id][activeZone].push(layer);activeLayerId=layer.id;syncLegacyLayers();rebuildLayerDecal(layer);renderLayerEditor();updateStats();}",
"function addZoneLayer(layer){ensureZoneState();layer.id='layer-'+layerSeq++;layer.zone=activeZone;layer.x=0;layer.y=0;layer.scale=layer.type==='background'?140:(layer.type==='image'?100:70);layer.rotation=0;layer.visible=true;if(layer.type==='background')zoneLayerState[product.id][activeZone].unshift(layer);else zoneLayerState[product.id][activeZone].push(layer);activeLayerId=layer.id;syncLegacyLayers();rebuildLayerDecal(layer);renderLayerEditor();updateStats();}"
))
repls.append((
"function renderSwatches(){ $('swatches').innerHTML='';colors.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+(i===0?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{garment?.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.color)m.color.set(c)})}});Array.from(document.querySelectorAll('.swatch')).forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('swatches').appendChild(b)})}",
"function setZoneBackground(c){ensureZoneState();let bg=currentZoneLayers().find(l=>l.type==='background');if(!bg){bg={type:'background',name:'Background',color:c};addZoneLayer(bg)}else{bg.color=c;if(bg.texture){bg.texture.dispose();bg.texture=null}rebuildLayerDecal(bg);syncLegacyLayers();renderLayerEditor();updateStats()}}\nfunction renderSwatches(){ $('swatches').innerHTML='';const bg=currentZoneLayers().find(l=>l.type==='background');colors.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+((bg?.color||colors[0])===c?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{setZoneBackground(c);Array.from(document.querySelectorAll('.swatch')).forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('swatches').appendChild(b)})}"
))
repls.append((
"$('toggleLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.visible=l.visible===false;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor()});}",
"$('fillLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.x=0;l.y=0;l.rotation=0;l.scale=(l.zone==='Left Sleeve'||l.zone==='Right Sleeve'||l.zone==='Collar')?115:140;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor();updateStats()});$('toggleLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.visible=l.visible===false;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor()});}"
))

for old,new in repls:
    if old not in s:
        raise SystemExit('Missing expected block: '+old[:80])
    s=s.replace(old,new,1)

# Put background decals behind artwork decals.
old="const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=10;layer.mesh=mesh;decalGroup.add(mesh)"
new="const mesh=new THREE.Mesh(geo,mat);mesh.renderOrder=layer.type==='background'?5:10;layer.mesh=mesh;decalGroup.add(mesh)"
if old not in s:
    raise SystemExit('Missing decal render-order block')
s=s.replace(old,new,1)

# Refresh swatches when the user changes zones so each area shows its own background.
old="b.onclick=()=>{activeZone=z;activeLayerId=currentZoneLayers().at(-1)?.id||null;renderZones();renderLayerEditor();updateStats()}"
new="b.onclick=()=>{activeZone=z;activeLayerId=currentZoneLayers().filter(l=>l.type!=='background').at(-1)?.id||currentZoneLayers().at(-1)?.id||null;renderZones();renderSwatches();renderLayerEditor();updateStats()}"
if old not in s:
    raise SystemExit('Missing zone click block')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
print('zone fill/color patch applied')
