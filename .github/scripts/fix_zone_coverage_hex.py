from pathlib import Path

p=Path('index.html')
s=p.read_text(encoding='utf-8')

# Expand decal projection depth/coverage so Front/Back artwork follows the full body panel curvature.
s=s.replace("if(z==='Back'){pos.set(c.x+nx*size.x*.28,c.y+ny*size.y*.28,box.min.z-size.z*.02);ori.set(0,Math.PI,r);dims.set(size.x*.58*sc,size.y*.64*sc,size.z*.35)}",
            "if(z==='Back'){pos.set(c.x+nx*size.x*.25,c.y+ny*size.y*.30,box.min.z-size.z*.08);ori.set(0,Math.PI,r);dims.set(size.x*.56*sc,size.y*.92*sc,size.z*1.6)}")
s=s.replace("else{pos.set(c.x+nx*size.x*.28,c.y+ny*size.y*.28,box.max.z+size.z*.02);ori.set(0,0,r);dims.set(size.x*.58*sc,size.y*.64*sc,size.z*.35)}",
            "else{pos.set(c.x+nx*size.x*.25,c.y+ny*size.y*.30,box.max.z+size.z*.08);ori.set(0,0,r);dims.set(size.x*.56*sc,size.y*.92*sc,size.z*1.6)}")

# Add color wheel + editable hex input under zone background controls.
old='<div class="section"><div class="label">Selected area background</div><div id="swatches" class="swatches"></div></div>'
new='''<div class="section"><div class="label">Selected area background</div><div id="swatches" class="swatches"></div><div class="row control" style="align-items:center"><input id="zoneColorPicker" type="color" value="#ffffff" style="height:42px;padding:3px;border:1px solid #d9d9dd;border-radius:10px;background:#fff"><input id="zoneHex" class="input" value="#FFFFFF" maxlength="7" aria-label="Background hex color"></div><div class="small" style="margin-top:7px">Color applies only to the selected print zone.</div></div>'''
if old not in s: raise SystemExit('background UI anchor missing')
s=s.replace(old,new,1)

# Add helpers and keep color picker/hex synchronized per zone.
old_func="function renderSwatches(){ $('swatches').innerHTML='';const bg=currentZoneLayers().find(l=>l.type==='background');colors.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+((bg?.color||colors[0])===c?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{setZoneBackground(c);Array.from(document.querySelectorAll('.swatch')).forEach(x=>x.classList.remove('active'));b.classList.add('active')};$('swatches').appendChild(b)})}"
new_func="""function normalizeHex(v){v=String(v||'').trim().toUpperCase();if(!v.startsWith('#'))v='#'+v;return /^#[0-9A-F]{6}$/.test(v)?v:null}
function syncZoneColorInputs(){const bg=currentZoneLayers().find(l=>l.type==='background');const c=normalizeHex(bg?.color||'#FFFFFF')||'#FFFFFF';const picker=$('zoneColorPicker'),hex=$('zoneHex');if(picker)picker.value=c.toLowerCase();if(hex)hex.value=c;}
function renderSwatches(){ $('swatches').innerHTML='';const bg=currentZoneLayers().find(l=>l.type==='background');colors.forEach((c,i)=>{const b=document.createElement('button');b.className='swatch'+((bg?.color||colors[0]).toLowerCase()===c.toLowerCase()?' active':'');b.style.background=c;b.title=c;b.onclick=()=>{setZoneBackground(c);Array.from(document.querySelectorAll('.swatch')).forEach(x=>x.classList.remove('active'));b.classList.add('active');syncZoneColorInputs()};$('swatches').appendChild(b)});syncZoneColorInputs()}"""
if old_func not in s: raise SystemExit('renderSwatches anchor missing')
s=s.replace(old_func,new_func,1)

# Wire native color wheel and HEX field.
anchor="$('artUpload').addEventListener('change',e=>{const f=e.target.files[0];if(f)addImage(URL.createObjectURL(f),f.name)});"
extra="""
$('zoneColorPicker')?.addEventListener('input',e=>{const c=e.target.value.toUpperCase();setZoneBackground(c);$('zoneHex').value=c;renderSwatches()});
$('zoneHex')?.addEventListener('change',e=>{const c=normalizeHex(e.target.value);if(!c){syncZoneColorInputs();return}setZoneBackground(c);$('zoneColorPicker').value=c.toLowerCase();renderSwatches()});
"""
if anchor not in s: raise SystemExit('upload anchor missing')
s=s.replace(anchor,anchor+extra,1)

# Make Fill Area a true full-panel preset for image/text layers.
old_fill="$('fillLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.x=0;l.y=0;l.scale=155;l.rotation=0;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor();updateStats()});"
new_fill="$('fillLayer')?.addEventListener('click',()=>{const l=activeLayer();if(!l)return;l.x=0;l.y=0;l.scale=112;l.rotation=0;rebuildLayerDecal(l);syncLegacyLayers();renderLayerEditor();updateStats()});"
if old_fill in s:s=s.replace(old_fill,new_fill,1)

# Background layers should always use full-panel coverage independent of artwork size controls.
old_proj="function zoneProjection(layer){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());const nx=layer.x/100,ny=layer.y/100,sc=Math.max(.08,layer.scale/100),r=THREE.MathUtils.degToRad(layer.rotation||0);"
new_proj="function zoneProjection(layer){const box=new THREE.Box3().setFromObject(garment),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());const nx=layer.x/100,ny=layer.y/100,sc=layer.type==='background'?1.12:Math.max(.08,layer.scale/100),r=THREE.MathUtils.degToRad(layer.rotation||0);"
if old_proj not in s: raise SystemExit('zoneProjection anchor missing')
s=s.replace(old_proj,new_proj,1)

p.write_text(s,encoding='utf-8')
