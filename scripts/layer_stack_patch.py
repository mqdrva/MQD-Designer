from pathlib import Path
p=Path('v20/editor.js')
s=p.read_text()

old="""function renderLayerPanel(){
  const wrap=$('layers'),empty=$('emptyLayers'),controlsEl=$('layerControls'),textControls=$('textControls');
  wrap.innerHTML='';const arr=zoneState().layers;empty.classList.toggle('hidden',arr.length>0);
  arr.forEach(l=>{const d=document.createElement('div');d.className='layer'+(l.id===activeLayerId?' active':'');d.innerHTML=`<div class=\"layer-head\"><div><div class=\"layer-name\">${escapeHtml(l.label)}</div><div class=\"layer-meta\">${escapeHtml(activeZone)} · ${l.type==='image'?'Image':'Text'}${l.visible===false?' · hidden':''}</div></div><span>${l.type==='image'?'▧':'T'}</span></div>`;d.onclick=()=>{activeLayerId=l.id;renderLayerPanel();};wrap.appendChild(d);});
"""
new="""function renderLayerPanel(){
  const wrap=$('layers'),empty=$('emptyLayers'),controlsEl=$('layerControls'),textControls=$('textControls');
  wrap.innerHTML='';const arr=zoneState().layers;empty.classList.toggle('hidden',arr.length>0);
  // The layer at the TOP of this list is also the layer visually rendered on top.
  const panelOrder=[...arr].reverse();
  panelOrder.forEach(l=>{const d=document.createElement('div');d.className='layer'+(l.id===activeLayerId?' active':'');d.draggable=true;d.dataset.layerId=l.id;d.title='Drag to change layer order';d.innerHTML=`<div class=\"layer-head\"><div><div class=\"layer-name\">${escapeHtml(l.label)}</div><div class=\"layer-meta\">${escapeHtml(activeZone)} · ${l.type==='image'?'Image':'Text'}${l.visible===false?' · hidden':''}</div></div><span>↕ ${l.type==='image'?'▧':'T'}</span></div>`;
    d.onclick=()=>{activeLayerId=l.id;renderLayerPanel();drawEditor();};
    d.ondragstart=e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',l.id);d.classList.add('dragging-layer');};
    d.ondragend=()=>d.classList.remove('dragging-layer');
    d.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move';d.classList.add('layer-drop-target');};
    d.ondragleave=()=>d.classList.remove('layer-drop-target');
    d.ondrop=e=>{e.preventDefault();d.classList.remove('layer-drop-target');const moved=e.dataTransfer.getData('text/plain');if(!moved||moved===l.id)return;snapshot();const order=[...arr].reverse().map(x=>x.id),from=order.indexOf(moved),to=order.indexOf(l.id);if(from<0||to<0)return;const [id]=order.splice(from,1);order.splice(to,0,id);const byId=new Map(arr.map(x=>[x.id,x]));arr.splice(0,arr.length,...order.reverse().map(id=>byId.get(id)).filter(Boolean));activeLayerId=moved;renderAll();};
    wrap.appendChild(d);});
"""
if old not in s: raise SystemExit('renderLayerPanel block not found')
s=s.replace(old,new,1)

old="""function nextLabel(){return `Layer ${zoneState().layers.length+1}`;}
function addImage(src,filename){const img=new Image();img.onload=()=>{snapshot();const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),filename:filename||'artwork',src,image:img,x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true};zoneState().layers.push(l);activeLayerId=l.id;renderAll();};img.src=src;}
function addText(){const text=prompt('Text to add');if(!text)return;snapshot();const l={id:'layer-'+layerSeq++,type:'text',label:nextLabel(),text,x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111',font:'Inter',strokeColor:'#FFFFFF',strokeWidth:0,letterSpacing:0,bold:true,italic:false,align:'center'};zoneState().layers.push(l);activeLayerId=l.id;renderAll();}
"""
new="""const MAX_ZONE_LAYERS=6;
function canAddLayer(zone=activeZone){const z=zoneState(zone);if(z.layers.length>=MAX_ZONE_LAYERS){alert(`This print zone can have up to ${MAX_ZONE_LAYERS} layers.`);return false;}return true;}
function nextLabel(){return `Layer ${zoneState().layers.length+1}`;}
function addImage(src,filename){if(!canAddLayer())return;const img=new Image();img.onload=()=>{if(!canAddLayer())return;snapshot();const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),filename:filename||'artwork',src,image:img,x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true};zoneState().layers.push(l);activeLayerId=l.id;renderAll();};img.src=src;}
function addText(){if(!canAddLayer())return;const text=prompt('Text to add');if(!text)return;snapshot();const l={id:'layer-'+layerSeq++,type:'text',label:nextLabel(),text,x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111',font:'Inter',strokeColor:'#FFFFFF',strokeWidth:0,letterSpacing:0,bold:true,italic:false,align:'center'};zoneState().layers.push(l);activeLayerId=l.id;renderAll();}
"""
if old not in s: raise SystemExit('add layer block not found')
s=s.replace(old,new,1)

old="""function duplicateActive(){const l=activeLayer();if(!l)return;snapshot();const copy={...l,id:'layer-'+layerSeq++,label:nextLabel(),x:(l.x||0)+6,y:(l.y||0)+6,crop:l.crop?{...l.crop}:undefined};zoneState().layers.push(copy);activeLayerId=copy.id;renderAll();}
function cloneActiveToAllZones(){const l=activeLayer();if(!l)return;snapshot();for(const z of product.zones){if(z===activeZone)continue;const target=zoneState(z);const copy={...l,id:'layer-'+layerSeq++,label:'Layer '+(target.layers.length+1),crop:l.crop?{...l.crop}:undefined};target.layers.push(copy);}renderAll();}
"""
new="""function duplicateActive(){const l=activeLayer();if(!l||!canAddLayer())return;snapshot();const copy={...l,id:'layer-'+layerSeq++,label:nextLabel(),x:(l.x||0)+6,y:(l.y||0)+6,crop:l.crop?{...l.crop}:undefined};zoneState().layers.push(copy);activeLayerId=copy.id;renderAll();}
function cloneActiveToAllZones(){const l=activeLayer();if(!l)return;const available=product.zones.filter(z=>z!==activeZone&&zoneState(z).layers.length<MAX_ZONE_LAYERS);if(!available.length){alert('The other print zones are already at the 6-layer limit.');return;}snapshot();for(const z of available){const target=zoneState(z);const copy={...l,id:'layer-'+layerSeq++,label:'Layer '+(target.layers.length+1),crop:l.crop?{...l.crop}:undefined};target.layers.push(copy);}renderAll();}
"""
if old not in s: raise SystemExit('duplicate/clone block not found')
s=s.replace(old,new,1)

p.write_text(s)
