from pathlib import Path
p=Path('v20/editor.js')
s=p.read_text()
s=s.replace('tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=false;','tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=true;',1)
marker="function drawLayerStack(c,zone,b){"
helper="""function drawImageLayer(c,l,b){
  if(!l.image)return;
  const crop=l.crop||{left:0,top:0,right:0,bottom:0};
  const left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
  const sx=l.image.width*left,sy=l.image.height*top,sw=Math.max(1,l.image.width*(1-left-right)),sh=Math.max(1,l.image.height*(1-top-bottom));
  const base=Math.max(b.w/sw,b.h/sh),scale=base*(l.scale||1),iw=sw*scale,ih=sh*scale;
  c.scale(l.flipX?-1:1,l.flipY?-1:1);
  c.drawImage(l.image,sx,sy,sw,sh,-iw/2,-ih/2,iw,ih);
}
"""
if 'function drawImageLayer(c,l,b)' not in s:
    if marker not in s: raise SystemExit('drawLayerStack marker not found')
    s=s.replace(marker,helper+marker,1)
old="if(l.type==='image'&&l.image){const base=Math.max(b.w/l.image.width,b.h/l.image.height),scale=base*(l.scale||1),iw=l.image.width*scale,ih=l.image.height*scale;c.drawImage(l.image,-iw/2,-ih/2,iw,ih);}"
if old in s:s=s.replace(old,"if(l.type==='image'&&l.image){drawImageLayer(c,l,b);}",1)
old2="if(l.type==='image'&&l.image){const base=Math.max(r.w/l.image.width,r.h/l.image.height),scale=base*(l.scale||1),iw=l.image.width*scale,ih=l.image.height*scale;c.drawImage(l.image,-iw/2,-ih/2,iw,ih);}"
if old2 in s:s=s.replace(old2,"if(l.type==='image'&&l.image){drawImageLayer(c,l,r);}",1)
oldadd="const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),filename:filename||'artwork',src,image:img,x:0,y:0,scale:1,rotation:0,visible:true};"
newadd="const l={id:'layer-'+layerSeq++,type:'image',label:nextLabel(),filename:filename||'artwork',src,image:img,x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true};"
if oldadd in s:s=s.replace(oldadd,newadd,1)
anchor="$('productSelect').onchange=e=>selectProduct(e.target.value);"
tools="""function requireImageLayer(){const l=activeLayer();return l&&l.type==='image'?l:null;}
function flipActive(axis){const l=requireImageLayer();if(!l)return;snapshot();l[axis]=!l[axis];renderAll();}
function alignActive(){const l=activeLayer();if(!l)return;snapshot();l.x=0;l.y=0;renderAll();}
function duplicateActive(){const l=activeLayer();if(!l)return;snapshot();const copy={...l,id:'layer-'+layerSeq++,label:nextLabel(),x:(l.x||0)+6,y:(l.y||0)+6,crop:l.crop?{...l.crop}:undefined};zoneState().layers.push(copy);activeLayerId=copy.id;renderAll();}
function cloneActiveToAllZones(){const l=activeLayer();if(!l)return;snapshot();for(const z of product.zones){if(z===activeZone)continue;const target=zoneState(z);const copy={...l,id:'layer-'+layerSeq++,label:'Layer '+(target.layers.length+1),crop:l.crop?{...l.crop}:undefined};target.layers.push(copy);}renderAll();}
function cropActive(){const l=requireImageLayer();if(!l)return;const current=l.crop||{top:0,right:0,bottom:0,left:0};const fmt=v=>Math.round((Number(v)||0)*100);const entered=prompt('Crop percentages: top, right, bottom, left',fmt(current.top)+', '+fmt(current.right)+', '+fmt(current.bottom)+', '+fmt(current.left));if(entered===null)return;const a=entered.split(',').map(v=>Number(v.trim()));if(a.length!==4||a.some(v=>!Number.isFinite(v)||v<0||v>45)){alert('Use four percentages from 0 to 45, for example: 10, 5, 10, 5');return;}snapshot();l.crop={top:a[0]/100,right:a[1]/100,bottom:a[2]/100,left:a[3]/100};renderAll();}
function resetActive(){const l=activeLayer();if(!l)return;snapshot();Object.assign(l,{x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false});if(l.type==='image')l.crop={left:0,top:0,right:0,bottom:0};renderAll();}
$('flipXTool')?.addEventListener('click',()=>flipActive('flipX'));
$('flipYTool')?.addEventListener('click',()=>flipActive('flipY'));
$('alignTool')?.addEventListener('click',alignActive);
$('cloneAllTool')?.addEventListener('click',cloneActiveToAllZones);
$('cropTool')?.addEventListener('click',cropActive);
$('duplicateTool')?.addEventListener('click',duplicateActive);
$('resetTool')?.addEventListener('click',resetActive);

"""
if 'function duplicateActive()' not in s:
    if anchor not in s: raise SystemExit('event anchor not found')
    s=s.replace(anchor,tools+anchor,1)
p.write_text(s)
