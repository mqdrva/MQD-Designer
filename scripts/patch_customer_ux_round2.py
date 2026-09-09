from pathlib import Path

p = Path('v20/editor.js')
s = p.read_text()

# 1) Add 2D text overlay, safe-area guide, completion styling, and print-quality helpers.
needle = "function drawLayerStack(c,zone,b){\n  const z=zoneState(zone);c.fillStyle=z.background||'#FFFFFF';c.fillRect(b.x,b.y,b.w,b.h);"
insert = """function editorDesignBounds(zone,r,rec=ensureTemplateImage(zone)){
  let b={...r};
  if(rec?.img&&rec?.bounds){
    const sw=rec.img.naturalWidth||rec.img.width,sh=rec.img.naturalHeight||rec.img.height,sb=scaleBounds(rec.bounds,sw,sh,r.w,r.h);
    b={x:r.x+sb.x,y:r.y+sb.y,w:sb.w,h:sb.h};
  }
  return b;
}
function drawEditorTextOverlay(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec),z=zoneState(zone);
  (z.layers||[]).forEach(l=>{if(l.visible===false||l.type!=='text')return;c.save();const cx=b.x+b.w/2+(l.x||0)*b.w/200,cy=b.y+b.h/2+(l.y||0)*b.h/200;c.translate(cx,cy);c.rotate((l.rotation||0)*Math.PI/180);drawTextLayer(c,l,b);c.restore();});
}
function drawSafeAreaGuide(c,zone,r,rec){
  const b=editorDesignBounds(zone,r,rec),ix=Math.max(9,b.w*.075),iy=Math.max(9,b.h*.075),x=b.x+ix,y=b.y+iy,w=Math.max(10,b.w-ix*2),h=Math.max(10,b.h-iy*2);
  c.save();c.strokeStyle='#FF8A00';c.lineWidth=2;c.setLineDash([9,7]);c.strokeRect(x,y,w,h);c.setLineDash([]);c.fillStyle='#B85F00';c.font='700 10px Inter, sans-serif';c.textAlign='left';c.textBaseline='top';c.fillText('SAFE AREA',x+5,y+5);c.restore();
}
function imageLayerEstimatedDpi(l,zone=activeZone){
  if(!l||l.type!=='image'||!l.image)return null;const t=product.templates?.[zone],rec=ensureTemplateImage(zone);let tw=t?.width||0,th=t?.height||0;
  if(rec?.bounds){tw=rec.bounds.w;th=rec.bounds.h;}if(!tw||!th)return null;
  const iw=Math.max(1,l.image.naturalWidth||l.image.width),ih=Math.max(1,l.image.naturalHeight||l.image.height),base=Math.max(tw/iw,th/ih)*Math.max(.01,Number(l.scale)||1);
  return 300/Math.max(.0001,base);
}
function zoneQuality(zone=activeZone){
  const z=zoneState(zone),images=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='image'&&l.image),texts=(z.layers||[]).filter(l=>l.visible!==false&&l.type==='text');
  if(!images.length){if(texts.length)return{tone:'good',label:'Text quality ✓',note:'Text is rendered at the production template resolution.'};return{tone:'neutral',label:'No image to check',note:'Add an image to see estimated print resolution.'};}
  const values=images.map(l=>imageLayerEstimatedDpi(l,zone)).filter(Number.isFinite);if(!values.length)return{tone:'neutral',label:'Resolution unavailable',note:'Source pixel dimensions could not be read.'};
  const dpi=Math.round(Math.min(...values));if(dpi>=240)return{tone:'good',label:`≈ ${dpi} DPI ✓`,note:'Good print resolution at the current design size.'};if(dpi>=150)return{tone:'warn',label:`≈ ${dpi} DPI`,note:'Usable, but increasing the image size further may soften the print.'};return{tone:'bad',label:`≈ ${dpi} DPI ⚠`,note:'Low resolution — this image may print blurry at the current size.'};
}
function ensureCustomerUx(){
  if(!document.getElementById('mqdUxStyles')){const style=document.createElement('style');style.id='mqdUxStyles';style.textContent=`.zone-icon{position:relative}.zone-icon.complete::after{content:'✓';position:absolute;right:4px;top:4px;width:14px;height:14px;border-radius:50%;background:#18a558;color:#fff;font-size:9px;font-weight:900;display:grid;place-items:center;box-shadow:0 0 0 2px #fff}.guide-legend{font-size:9px;color:#777;text-align:center;margin-top:-2px;margin-bottom:7px}.guide-legend .cut{color:#EB232D;font-weight:800}.guide-legend .safe{color:#D66F00;font-weight:800}.quality-card{border:1px solid #e5e5e5;border-radius:8px;background:#fafafa;padding:9px;margin-top:8px}.quality-card .q-label{font-size:9px;color:#888}.quality-card .q-value{font-size:13px;font-weight:800;margin-top:3px}.quality-card .q-note{font-size:9px;color:#777;line-height:1.35;margin-top:3px}.quality-card.good .q-value{color:#157c3f}.quality-card.warn .q-value{color:#9a6100}.quality-card.bad .q-value{color:#b42318}`;document.head.appendChild(style);}
  if(!document.getElementById('guideLegend')){const title=document.querySelector('.zone-title');if(title){const d=document.createElement('div');d.id='guideLegend';d.className='guide-legend';d.innerHTML='<span class="cut">Red</span> = cut / bleed edge &nbsp;·&nbsp; <span class="safe">Orange</span> = keep important text & logos inside';title.insertAdjacentElement('afterend',d);}}
  if(!document.getElementById('printQualityCard')){const status=$('statusProduct')?.closest('.section');if(status){const d=document.createElement('div');d.id='printQualityCard';d.className='section quality-card neutral';d.innerHTML='<div class="q-label">Estimated print quality</div><div id="printQualityValue" class="q-value">—</div><div id="printQualityNote" class="q-note">Select or add artwork to check resolution.</div>';status.insertAdjacentElement('beforebegin',d);}}
}
function renderPrintQuality(){ensureCustomerUx();const q=zoneQuality(activeZone),card=$('printQualityCard'),value=$('printQualityValue'),note=$('printQualityNote');if(!card||!value||!note)return;card.classList.remove('good','warn','bad','neutral');card.classList.add(q.tone);value.textContent=q.label;note.textContent=q.note+' Estimated against a 300-DPI production target.';}

function drawLayerStack(c,zone,b){
  const z=zoneState(zone);c.fillStyle=z.background||'#FFFFFF';c.fillRect(b.x,b.y,b.w,b.h);"""
if needle not in s:
    raise SystemExit('drawLayerStack insertion target not found')
s = s.replace(needle, insert, 1)

# 2) Replace the editor helper overlay so customer artwork is not visually buried,
#    then explicitly redraw text in the visible 2D design frame and add a safe guide.
old = """    // Keep the familiar product-template details faint, but do not rely on
    // multiply blending for the red production seam lines.
    targetCtx.save();
    targetCtx.globalAlpha=.34;
    targetCtx.globalCompositeOperation='multiply';
    targetCtx.drawImage(rec.img,r.x,r.y,r.w,r.h);
    targetCtx.restore();

    // Production cut/sew lines are always drawn last in true red so they stay
    // visible over black, white, artwork or any other customer background.
"""
new = """    // Show the helper artwork only before the customer starts designing.
    // Once a zone has content, customer artwork/text gets visual priority.
    if(!zoneHasContent(activeZone)){
      targetCtx.save();
      targetCtx.globalAlpha=.34;
      targetCtx.globalCompositeOperation='multiply';
      targetCtx.drawImage(rec.img,r.x,r.y,r.w,r.h);
      targetCtx.restore();
    }

    // The physical sleeve/collar masks can contain blank internal regions.
    // Redraw text in the editor design frame so it is always easy to see and edit,
    // while the 3D/production rendering remains unchanged.
    drawEditorTextOverlay(targetCtx,activeZone,r,rec);
    drawSafeAreaGuide(targetCtx,activeZone,r,rec);

    // Production cut/sew lines are always drawn last in true red so they stay
    // visible over black, white, artwork or any other customer background.
"""
if old not in s:
    raise SystemExit('2D helper overlay target not found')
s = s.replace(old, new, 1)

# 3) Zone completion indicator.
old = "function renderZones(){const rail=$('zoneRail');rail.innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone-icon'+(z===activeZone?' active':'');b.innerHTML=escapeHtml(zoneIconLabel(z)).replace('\\n','<br>');b.onclick=()=>selectZone(z);rail.appendChild(b);});}"
new = "function renderZones(){const rail=$('zoneRail');rail.innerHTML='';product.zones.forEach(z=>{const b=document.createElement('button');b.className='zone-icon'+(z===activeZone?' active':'')+(zoneHasContent(z)?' complete':'');b.innerHTML=escapeHtml(zoneIconLabel(z)).replace('\\n','<br>');b.title=zoneHasContent(z)?z+' — design added':z+' — not designed yet';b.onclick=()=>selectZone(z);rail.appendChild(b);});}"
if old not in s:
    raise SystemExit('renderZones target not found')
s = s.replace(old, new, 1)

# 4) Keep quality guidance live while resizing an image.
old = "function renderAll(){renderProducts();renderZones();renderLayerPanel();renderStatus();drawEditor();rebuildGarmentPreview();}"
new = "function renderAll(){ensureCustomerUx();renderProducts();renderZones();renderLayerPanel();renderStatus();renderPrintQuality();drawEditor();rebuildGarmentPreview();}"
if old not in s:
    raise SystemExit('renderAll target not found')
s = s.replace(old, new, 1)

old = "function updateLayer(prop,val){const l=activeLayer();if(!l)return;l[prop]=val;renderLayerPanel();drawEditor();rebuildGarmentPreview();}"
new = "function updateLayer(prop,val){const l=activeLayer();if(!l)return;l[prop]=val;renderLayerPanel();renderPrintQuality();drawEditor();rebuildGarmentPreview();}"
if old not in s:
    raise SystemExit('updateLayer target not found')
s = s.replace(old, new, 1)

p.write_text(s)
print('Patched v20/editor.js')
