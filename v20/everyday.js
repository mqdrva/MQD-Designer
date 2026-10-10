import { PRODUCT_OPTIONS, sizesForProduct } from './everyday-catalog.js';
import { artworkLayers, artworkBounds, TEXT_FONTS } from './everyday-layers.js';
import { connectEverydayAccount } from './everyday-account.js';
import { VIEWS, ZONES, COLORS, colorsForProduct, SIZES, PRINT_METHODS, fitArtwork, constrainPlacement, resizeArtwork } from './everyday-contract.js';
import { PRODUCTS, zoneFor, guideFor, photoKey, bitmap, drawPreview, COLOR_PREVIEW } from './everyday-preview-renderer.js';
import { connectEverydayCheckout } from './everyday-checkout.js';
const $ = id => document.getElementById(id);
const canvas = $('preview'), ctx = canvas.getContext('2d');
let draft = { schemaVersion: 1, product: 'everyday-tshirt', color: 'White', size: 'L', quantity: 1, printMethod: 'transfer', artwork: {}, photos: {} };
let selectedLayer = 'image';
let view = 'front', drag = null, revision = 0, busy = true;
let checkout = { refresh() {} };
const MAX_BYTES = 20 * 1024 * 1024;
const status = message => { $('status').textContent = message; };
function assetKey() { return photoKey(draft, view); }
function guide() { return guideFor(draft, view); }
async function readImage(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.');
  if (file.size > MAX_BYTES) throw new Error('Choose an image smaller than 20 MB.');
  const image = await bitmap(file);
  if (image.width * image.height > 40000000) throw new Error('Choose an image under 40 megapixels.');
  return image;
}
function syncChoices(id, choices, value, nativeId, swatches = false) {
  const group = $(id);
  if (group.children.length !== choices.length || choices.some(([key], i) => group.children[i].dataset.value !== key)) {
    group.replaceChildren(...choices.map(([key, label]) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn choice-button'; button.dataset.value = key;
      if (swatches) { button.className += ' color-swatch'; button.style.setProperty('--swatch', COLOR_PREVIEW[key]); button.setAttribute('aria-label', label); button.title = label; }
      else button.textContent = label;
      button.onclick = () => { if (busy) return; $(nativeId).value = key; $(nativeId).onchange(); };
      return button;
    }));
  }
  for (const button of group.children) { button.setAttribute('aria-pressed', String(button.dataset.value === value)); button.disabled = busy; }
}
function syncOptions() {
  syncChoices('productChoices', Object.entries(PRODUCTS).map(([id, p]) => [id, p.name]), draft.product, 'product');
  syncChoices('colorChoices', colorsForProduct(draft.product).map(color => [color, color]), draft.color, 'color', true);
  syncChoices('sizeChoices', sizesForProduct(draft.product, draft.color).map(size => [size, size]), draft.size, 'size');
  $('colorName').textContent = draft.color;
  if ($('productDescription')) $('productDescription').textContent = PRODUCT_OPTIONS[draft.product].description;
  if ($('sizeAvailability')) { const sizes = sizesForProduct(draft.product, draft.color); $('sizeAvailability').textContent = `${sizes[0]}–${sizes.at(-1)} in ${draft.color}. Sizes vary by garment and color.`; }
  $('quantityMinus').disabled = busy || Number($('quantity').value) <= 1;
  $('quantityPlus').disabled = busy || Number($('quantity').value) >= 99;
}
function selected() {
  const layers = artworkLayers(draft.artwork[view]);
  let layer = layers.find(item => item.id === selectedLayer);
  if (!layer) { layer = layers[0]; selectedLayer = layer?.id || 'image'; }
  return layer;
}
function controls() {
  syncOptions();
  const art = draft.artwork[view], zone = zoneFor(draft, view), layer = selected(), item = layer?.data;
  $('zoneLabel').textContent = `${zone.label} · Maximum ${zone.width} × ${zone.height} inches`;
  $('artName').textContent = layer ? `${layer.kind === 'text' ? 'Text: ' : ''}${layer.name}` : 'No print';
  $('artworkHeading').textContent = `${zone.label} artwork`;
  $('layers').replaceChildren(...artworkLayers(art).map(entry => { const button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.textContent = `${entry.kind === 'image' ? 'Image' : 'Text'}: ${entry.name}`; button.setAttribute('aria-pressed', String(entry.id === selectedLayer)); button.onclick = () => { selectedLayer = entry.id; render(); }; return button; }));
  for (const id of ['remove','smaller','larger','centerArtwork']) $(id).disabled = !item;
  $('remove').textContent = layer?.kind === 'text' ? `Remove text from ${zone.label.toLowerCase()}` : `Remove from ${zone.label.toLowerCase()}`;
  $('textTools').hidden = layer?.kind !== 'text';
  if (layer?.kind === 'text') {
    const fields = { textContent: 'text', textFont: 'font', textColor: 'color', textOutline: 'outline', textOutlineColor: 'outlineColor', textAlign: 'align' };
    for (const [id,key] of Object.entries(fields)) if (document.activeElement !== $(id)) $(id).value = item[key];
    $('textBold').checked = item.bold; $('textItalic').checked = item.italic;
  }
  $('addText').disabled = (art?.texts?.length || 0) >= 5;
  $('review').replaceChildren(...VIEWS.map(v => { const li = document.createElement('li'), layers = artworkLayers(draft.artwork[v]); li.textContent = `${zoneFor(draft, v).label}: ${layers.length ? layers.map(item => `${item.name} (${item.data.placement.width.toFixed(2)} × ${item.data.placement.height.toFixed(2)} in)`).join(' + ') : 'No print'}`; return li; }));
  for (const button of $('views').children) { button.textContent = zoneFor(draft, button.dataset.view).label; button.setAttribute('aria-pressed', String(button.dataset.view === view)); }
}
function drawSelection() {
  const layer = selected(); if (!layer) return;
  const p = layer.data.placement, box = guide(), x = box.x + p.x * box.scale, y = box.y + p.y * box.scale, w = p.width * box.scale, h = p.height * box.scale;
  ctx.save(); ctx.setLineDash([]); ctx.strokeStyle = '#1769df'; ctx.lineWidth = 2; ctx.strokeRect(x,y,w,h);
  for (const [cx,cy] of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]) { ctx.fillStyle = '#fff'; ctx.fillRect(cx-5,cy-5,10,10); ctx.strokeRect(cx-5,cy-5,10,10); } ctx.restore();
}
async function render() {
  const current = ++revision, snapshot = structuredClone(draft), selectedView = view;
  controls();
  checkout.refresh();
  try {
    const frame = document.createElement('canvas'); frame.width = 800; frame.height = 900;
    await drawPreview(frame, snapshot, selectedView, { guides: true });
    if (current !== revision) return;
    ctx.clearRect(0, 0, 800, 900); ctx.drawImage(frame, 0, 0); drawSelection(); $('emptyPhoto').hidden = true;
  } catch { if (current === revision) { $('emptyPhoto').hidden = false; status('The garment preview could not load. Refresh or add a development photo.'); } }
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mymerchnow-everyday-preview', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function databaseTask(write = false) {
  const db = await openDatabase();
  try { return await new Promise((resolve, reject) => {
    const transaction = db.transaction('drafts', write ? 'readwrite' : 'readonly');
    const request = write ? transaction.objectStore('drafts').put(draft, 'pilot') : transaction.objectStore('drafts').get('pilot');
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error);
  }); } finally { db.close(); }
}
function selection() {
  draft.color = $('color').value; draft.size = $('size').value;
  draft.printMethod = $('printMethod')?.value || draft.printMethod || 'transfer';
  if (!Object.hasOwn(PRINT_METHODS, draft.printMethod)) throw new Error('Choose an approved print method.');
  if (!sizesForProduct(draft.product, draft.color).includes(draft.size)) throw new Error('Choose an approved Everyday size.');
  const quantity = Number($('quantity').value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('Quantity must be a whole number from 1 to 99.');
  draft.quantity = quantity;
}
async function save() {
  try { selection(); await databaseTask(true); status('Draft and original uploads saved on this device.'); }
  catch (error) { status(`Draft was not saved: ${error.message}`); }
}
for (const v of VIEWS) {
  const button = document.createElement('button'); button.className = 'btn'; button.type = 'button'; button.dataset.view = v; button.textContent = ZONES[v].label;
  button.onclick = () => { view = v; selectedLayer = 'image'; drag = null; render(); }; $('views').append(button);
}
function updateColors() {
  const colors = colorsForProduct(draft.product);
  if (!colors.includes(draft.color)) draft.color = draft.color === 'Dark Heather' ? 'Charcoal' : draft.color === 'Forest' ? 'Forest Green' : draft.color === 'Forest Green' ? 'Forest' : 'White';
  $('color').replaceChildren();
  for (const color of colors) $('color').add(new Option(color, color));
  $('color').value = draft.color;
}
function updateSizes() {
  const sizes = sizesForProduct(draft.product, draft.color);
  if (!sizes.includes(draft.size)) draft.size = 'L';
  $('size').replaceChildren();
  for (const size of sizes) $('size').add(new Option(size, size));
  $('size').value = draft.size;
}
updateColors(); updateSizes();
for (const [id, product] of Object.entries(PRODUCTS)) $('product').add(new Option(product.name, id));
function applyLimits() { for (const v of VIEWS) for (const layer of artworkLayers(draft.artwork[v])) layer.data.placement = constrainPlacement(layer.data.placement, zoneFor(draft, v)); }
$('product').onchange = () => { draft.product = $('product').value; updateColors(); updateSizes(); applyLimits(); drag = null; status('Garment changed. Artwork fitted to its proposed print limits; review dimensions.'); render(); };
$('color').onchange = () => { draft.color = $('color').value; updateSizes(); applyLimits(); drag = null; render(); };
$('size').onchange = () => { draft.size = $('size').value; applyLimits(); status('Size changed. Review artwork dimensions against the proposed limits.'); render(); };
$('quantity').onchange = () => { try { selection(); checkout.refresh(); } catch (error) { status(error.message); } syncOptions(); };
for (const [id, delta] of [['quantityMinus', -1], ['quantityPlus', 1]]) $(id).onclick = () => {
  if (busy) return;
  const current = Number($('quantity').value);
  $('quantity').value = Math.min(99, Math.max(1, (Number.isInteger(current) ? current : draft.quantity) + delta));
  $('quantity').onchange();
};
$('uploadArtwork').onclick = () => { if (!busy) $('upload').click(); };
if ($('printMethod')) $('printMethod').onchange = () => { try { selection(); checkout.refresh(); status(`${PRINT_METHODS[draft.printMethod]} selected. Review your updated price.`); } catch (error) { status(error.message); } };
$('saveDraft').onclick = save;
if ($('resetPhotos')) $('resetPhotos').onclick = () => { draft.photos = {}; status('Standard garment previews restored.'); render(); };
for (const [id, photoMode] of [['upload', false], ['photo', true]]) $(id).onchange = async event => {
  const file = event.target.files[0], targetView = view, key = assetKey(), targetProduct = draft.product;
  try {
    const image = await readImage(file);
    if (draft.product !== targetProduct) throw new Error('Garment changed during upload. Please select the image again.');
    if (photoMode) draft.photos[key] = file;
    else { draft.artwork[targetView] = { ...draft.artwork[targetView], name: file.name, file, placement: fitArtwork(image.width, image.height, zoneFor(draft, targetView)) }; selectedLayer = 'image'; }
    status(photoMode ? 'Photo added. Guide calibration remains provisional.' : 'Original artwork retained. Adjust its print size and position.'); render();
  } catch (error) { status(error.message); }
  finally { event.target.value = ''; }
};
function removeSelected() {
  const layer = selected(), art = draft.artwork[view]; if (!layer) return;
  if (layer.kind === 'image') { delete art.file; delete art.name; }
  else art.texts = art.texts.filter(item => item.id !== layer.id);
  if (!artworkLayers(art).length) delete draft.artwork[view];
  selectedLayer = 'image'; status(`Selected item removed from ${zoneFor(draft, view).label.toLowerCase()}. Other zones are unchanged.`); render();
}
$('remove').onclick = removeSelected;
for (const font of TEXT_FONTS) $('textFont').add(new Option(font, font));
$('addText').onclick = () => {
  const art = draft.artwork[view] ||= { texts: [] }; art.texts ||= [];
  if (art.texts.length >= 5) return;
  const zone = zoneFor(draft, view), width = Math.min(zone.width * .8, 8), height = Math.min(zone.height, width * .3);
  const text = { id: crypto.randomUUID(), text: 'Your text', font: 'Inter', color: '#111111', outline: 0, outlineColor: '#ffffff', bold: true, italic: false, align: 'center', placement: { x: (zone.width-width)/2, y: .25, width, height } };
  text.placement = constrainPlacement(text.placement, zone); art.texts.push(text); selectedLayer = text.id;
  render(); $('textContent').focus?.();
};
for (const [id,key] of Object.entries({ textContent:'text', textFont:'font', textColor:'color', textOutline:'outline', textOutlineColor:'outlineColor', textAlign:'align', textBold:'bold', textItalic:'italic' })) $(id).oninput = () => {
  const item = selected(); if (item?.kind !== 'text') return;
  const value = key === 'bold' || key === 'italic' ? $(id).checked : key === 'outline' ? Number($(id).value) : $(id).value;
  if (key === 'text' && (!value.trim() || value.length > 200 || value.split('\n').length > 6)) { status('Text must have 1–200 characters, with at most six lines.'); return; }
  if (key === 'outline' && (!Number.isFinite(value) || value < 0 || value > 10)) return;
  item.data[key] = value; render();
};
function scaleSelected(factor) { const layer = selected(); if (!layer) return; layer.data.placement = resizeArtwork(layer.data.placement, Math.max(.1, layer.data.placement.width * factor), zoneFor(draft, view)); render(); }
$('smaller').onclick = () => scaleSelected(.9); $('larger').onclick = () => scaleSelected(1.1);
$('centerArtwork').onclick = () => { const layer = selected(); if (!layer) return; const p = layer.data.placement, zone = zoneFor(draft, view); layer.data.placement = { ...p, x:(zone.width-p.width)/2, y:(zone.height-p.height)/2 }; render(); };
function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 800 / rect.width, y: (event.clientY - rect.top) * 900 / rect.height }; }
canvas.onpointerdown = event => {
  if (busy || $('upload').disabled) return;
  const p = point(event), box = guide(), current = selected();
  if (current) {
    const a = current.data.placement;
    for (const [right,bottom] of [[false,false],[true,false],[false,true],[true,true]]) {
      const cx = box.x + (a.x + (right ? a.width : 0))*box.scale, cy = box.y + (a.y + (bottom ? a.height : 0))*box.scale;
      if (Math.hypot(p.x-cx,p.y-cy) <= 14) { drag = { mode:'resize', right, bottom, original:{...a}, id:current.id, view }; canvas.setPointerCapture(event.pointerId); return; }
    }
  }
  const x = (p.x-box.x)/box.scale, y = (p.y-box.y)/box.scale;
  const layer = artworkLayers(draft.artwork[view]).reverse().find(item => { const a = item.data.placement; return x >= a.x && x <= a.x+a.width && y >= a.y && y <= a.y+a.height; });
  if (!layer) return;
  selectedLayer = layer.id; drag = { mode:'move', x:x-layer.data.placement.x, y:y-layer.data.placement.y, id:layer.id, view }; canvas.setPointerCapture(event.pointerId); render();
};
canvas.onpointermove = event => {
  if (!drag || drag.view !== view) return;
  const layer = artworkLayers(draft.artwork[view]).find(item => item.id === drag.id); if (!layer) return;
  const p = point(event), box = guide(), zone = zoneFor(draft, view), x = (p.x-box.x)/box.scale, y = (p.y-box.y)/box.scale;
  if (drag.mode === 'move') layer.data.placement = constrainPlacement({ ...layer.data.placement, x:x-drag.x, y:y-drag.y }, zone);
  else {
    const a = drag.original, anchorX = a.x+(drag.right?0:a.width), anchorY = a.y+(drag.bottom?0:a.height), ratio = a.height/a.width;
    const wanted = Math.max(.1, Math.max((x-anchorX)*(drag.right?1:-1), (y-anchorY)*(drag.bottom?1:-1)/ratio));
    const width = Math.min(wanted, drag.right ? zone.width-anchorX : anchorX, (drag.bottom ? zone.height-anchorY : anchorY)/ratio), height = width*ratio;
    if (width > 0) layer.data.placement = { x:drag.right?anchorX:anchorX-width, y:drag.bottom?anchorY:anchorY-height, width, height };
  }
  connectEverydayAccount({ saveDraft: async () => { selection(); await databaseTask(true); }, status });
  render();
};
canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = () => { drag = null; };
canvas.onkeydown = event => {
  const layer = selected(); if (!layer) return;
  if (['+','=','-'].includes(event.key)) { event.preventDefault(); scaleSelected(event.key === '-' ? .9 : 1.1); return; }
  const delta = { ArrowLeft:[-.05,0], ArrowRight:[.05,0], ArrowUp:[0,-.05], ArrowDown:[0,.05] }[event.key]; if (!delta) return;
  event.preventDefault(); const p = layer.data.placement; layer.data.placement = constrainPlacement({ ...p, x:p.x+delta[0], y:p.y+delta[1] }, zoneFor(draft,view)); render();
};
$('downloadPreview').onclick = async () => {
  const button = $('downloadPreview'), snapshot = structuredClone(draft), selectedView = view;
  button.disabled = true;
  try {
    const frame = document.createElement('canvas'); frame.width = 800; frame.height = 900;
    await drawPreview(frame, snapshot, selectedView);
    const blob = await new Promise((resolve, reject) => frame.toBlob(value => value ? resolve(value) : reject(new Error('Preview export failed.')), 'image/png'));
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = `${snapshot.product}-${snapshot.color.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${selectedView}.png`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    status(`${zoneFor(snapshot, selectedView).label} PNG downloaded.`);
  } catch (error) { status(`PNG was not downloaded: ${error.message}`); }
  finally { button.disabled = false; }
};
// Avoid edits while restoring so asynchronous storage cannot overwrite new uploads.
const inputs = [...document.querySelectorAll('button,input,select,textarea')]; inputs.forEach(input => input.disabled = true);
try {
  const saved = await databaseTask();
  if (saved?.schemaVersion === 1 && PRODUCTS[saved.product] && [...COLORS, 'Dark Heather', 'Forest', 'Light Blue', 'Sand'].includes(saved.color) && saved.artwork && saved.photos && SIZES.includes(saved.size) && Number.isInteger(saved.quantity) && saved.quantity > 0 && saved.quantity <= 999) {
    saved.quantity = Math.min(99, saved.quantity);
    saved.printMethod = Object.hasOwn(PRINT_METHODS, saved.printMethod) ? saved.printMethod : 'transfer';
    for (const v of VIEWS) for (const layer of artworkLayers(saved.artwork[v])) layer.data.placement = constrainPlacement(layer.data.placement, zoneFor(saved, v));
    // Preserve early pilot photo uploads under the product-specific key format.
    for (const [key, photo] of Object.entries(saved.photos)) if (key.split(':').length === 2) saved.photos[`${saved.product}:${key}`] = photo;
    draft = saved; $('product').value = draft.product; updateColors(); updateSizes(); $('size').value = draft.size; $('quantity').value = draft.quantity; if ($('printMethod')) $('printMethod').value = draft.printMethod; status('Saved device draft restored.');
  }
} catch { status('Device draft storage is unavailable. You can still preview, but saving may fail.'); }
finally {
  busy = false; inputs.forEach(input => input.disabled = false);
  checkout = connectEverydayCheckout({ getDraft: () => { selection(); return draft; }, saveDraft: () => databaseTask(true), status });
  connectEverydayAccount({ saveDraft: async () => { selection(); await databaseTask(true); }, status });
  render();
}
