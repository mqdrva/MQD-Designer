import { VIEWS, ZONES, COLORS, colorsForProduct, SIZES, PRINT_METHODS, fitArtwork, constrainPlacement, resizeArtwork, orderSheet } from './everyday-contract.js';
import { PRODUCTS, zoneFor, guideFor, photoKey, bitmap, drawPreview } from './everyday-preview-renderer.js';
import { makeZip, safeArtworkName } from './everyday-zip.js';
import { connectEverydayCheckout } from './everyday-checkout.js';
const $ = id => document.getElementById(id);
const canvas = $('preview'), ctx = canvas.getContext('2d');
let draft = { schemaVersion: 1, product: 'everyday-tshirt', color: 'White', size: 'L', quantity: 1, printMethod: 'transfer', artwork: {}, photos: {} };
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
function controls() {
  const art = draft.artwork[view], zone = zoneFor(draft, view);
  $('zoneLabel').textContent = `${zone.label} · Maximum ${zone.width} × ${zone.height} inches`;
  $('artName').textContent = art?.name || 'No print';
  for (const key of ['width', 'x', 'y']) { $(key).disabled = !art; $(key).value = art ? art.placement[key].toFixed(2) : ''; }
  $('width').max = zone.width;
  $('remove').disabled = !art;
  $('dimensions').textContent = art ? `${art.placement.width.toFixed(2)} × ${art.placement.height.toFixed(2)} inches` : '';
  $('review').replaceChildren(...VIEWS.map(v => { const li = document.createElement('li'), a = draft.artwork[v]; li.textContent = `${zoneFor(draft, v).label}: ${a ? `${a.name} (${a.placement.width.toFixed(2)} × ${a.placement.height.toFixed(2)} in)` : 'No print'}`; return li; }));
  for (const button of $('views').children) { button.textContent = zoneFor(draft, button.dataset.view).label; button.setAttribute('aria-pressed', String(button.dataset.view === view)); }
}
async function render() {
  const current = ++revision, snapshot = structuredClone(draft), selectedView = view;
  controls();
  checkout.refresh();
  try {
    const frame = document.createElement('canvas'); frame.width = 800; frame.height = 900;
    await drawPreview(frame, snapshot, selectedView, { guides: true });
    if (current !== revision) return;
    ctx.clearRect(0, 0, 800, 900); ctx.drawImage(frame, 0, 0); $('emptyPhoto').hidden = true;
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
  if (!SIZES.includes(draft.size)) throw new Error('Choose an approved Everyday size.');
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
  button.onclick = () => { view = v; drag = null; render(); }; $('views').append(button);
}
function updateColors() {
  const colors = colorsForProduct(draft.product);
  if (!colors.includes(draft.color)) draft.color = draft.color === 'Charcoal' ? 'Dark Heather' : draft.color === 'Dark Heather' ? 'Charcoal' : 'White';
  $('color').replaceChildren();
  for (const color of colors) $('color').add(new Option(color, color));
  $('color').value = draft.color;
}
updateColors();
for (const [id, product] of Object.entries(PRODUCTS)) $('product').add(new Option(product.name, id));
function applyLimits() { for (const v of VIEWS) if (draft.artwork[v]) draft.artwork[v].placement = constrainPlacement(draft.artwork[v].placement, zoneFor(draft, v)); }
$('product').onchange = () => { draft.product = $('product').value; updateColors(); applyLimits(); drag = null; status('Garment changed. Artwork fitted to its proposed print limits; review dimensions.'); render(); };
$('color').onchange = () => { draft.color = $('color').value; drag = null; render(); };
$('size').onchange = () => { draft.size = $('size').value; applyLimits(); status('Size changed. Review artwork dimensions against the proposed limits.'); render(); };
$('quantity').onchange = () => { try { selection(); checkout.refresh(); } catch (error) { status(error.message); } };
if ($('printMethod')) $('printMethod').onchange = () => { try { selection(); checkout.refresh(); status(`${PRINT_METHODS[draft.printMethod]} selected. Review your updated price.`); } catch (error) { status(error.message); } };
$('saveDraft').onclick = save;
if ($('resetPhotos')) $('resetPhotos').onclick = () => { draft.photos = {}; status('Standard garment previews restored.'); render(); };
for (const [id, photoMode] of [['upload', false], ['photo', true]]) $(id).onchange = async event => {
  const file = event.target.files[0], targetView = view, key = assetKey(), targetProduct = draft.product;
  try {
    const image = await readImage(file);
    if (draft.product !== targetProduct) throw new Error('Garment changed during upload. Please select the image again.');
    if (photoMode) draft.photos[key] = file;
    else draft.artwork[targetView] = { name: file.name, file, placement: fitArtwork(image.width, image.height, zoneFor(draft, targetView)) };
    status(photoMode ? 'Photo added. Guide calibration remains provisional.' : 'Original artwork retained. Adjust its print size and position.'); render();
  } catch (error) { status(error.message); }
  finally { event.target.value = ''; }
};
for (const key of ['width', 'x', 'y']) $(key).onchange = () => {
  const art = draft.artwork[view]; if (!art) return;
  try {
    const value = Number($(key).value);
    if (!Number.isFinite(value) || (key === 'width' && value < .1)) throw new Error('Enter a valid measurement.');
    art.placement = key === 'width' ? resizeArtwork(art.placement, value, zoneFor(draft, view)) : constrainPlacement({ ...art.placement, [key]: value }, zoneFor(draft, view)); render();
  } catch (error) { status(error.message); controls(); }
};
$('remove').onclick = () => { delete draft.artwork[view]; render(); };
function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 800 / rect.width, y: (event.clientY - rect.top) * 900 / rect.height }; }
canvas.onpointerdown = event => {
  const art = draft.artwork[view]; if (!art || busy) return;
  const p = point(event), box = guide(), x = (p.x - box.x) / box.scale, y = (p.y - box.y) / box.scale, a = art.placement;
  if (x < a.x || x > a.x + a.width || y < a.y || y > a.y + a.height) return;
  drag = { x: x - a.x, y: y - a.y, view }; canvas.setPointerCapture(event.pointerId);
};
canvas.onpointermove = event => {
  if (!drag || drag.view !== view) return;
  const p = point(event), box = guide(), art = draft.artwork[view];
  art.placement = constrainPlacement({ ...art.placement, x: (p.x - box.x) / box.scale - drag.x, y: (p.y - box.y) / box.scale - drag.y }, zoneFor(draft, view)); render();
};
canvas.onpointerup = canvas.onpointercancel = canvas.onlostpointercapture = () => { drag = null; };
$('downloadSheet').onclick = () => {
  try {
    selection(); const blob = new Blob([JSON.stringify(orderSheet(draft), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'everyday-draft-measurements.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { status(error.message); }
};
$('downloadZip').onclick = async () => {
  const button = $('downloadZip'); button.disabled = true;
  try {
    selection(); const snapshot = structuredClone(draft), entries = [], sheet = orderSheet(snapshot);
    sheet.proposedBlank = PRODUCTS[snapshot.product].proposedBlank;
    sheet.previewSource = 'Existing premium garment geometry; approximate blank color and fit';
    sheet.placementApproval = 'Development guides; confirm against actual blank sizes before production';
    for (const v of VIEWS) {
      sheet.locations[v].zone = zoneFor(snapshot, v).label;
      status(`Building ${ZONES[v].label.toLowerCase()} preview…`);
      const frame = document.createElement('canvas'); frame.width = 800; frame.height = 900;
      await drawPreview(frame, snapshot, v, { draftLabel: true });
      const preview = await new Promise((resolve, reject) => frame.toBlob(blob => blob ? resolve(blob) : reject(new Error('Preview export failed.')), 'image/png'));
      entries.push({ name: `previews/${v}.png`, data: preview });
      const art = snapshot.artwork[v];
      if (art) { const name = `originals/${v}-${safeArtworkName(art.name)}`; entries.push({ name, data: art.file }); sheet.locations[v].originalFile = name; }
    }
    entries.push({ name: 'order-sheet.json', data: JSON.stringify(sheet, null, 2) });
    entries.push({ name: 'READ-ME.txt', data: 'DEVELOPMENT PACKAGE — not a paid order.\nFour previews and untouched original uploads.\nPrint measurements are in inches from the top-left of each permitted zone.\nGarment shape, color and print guide placement require approval against actual blanks.\nOriginal uploads may require production preparation.\n' });
    const zip = await makeZip(entries), url = URL.createObjectURL(zip), a = document.createElement('a'); a.href = url; a.download = `${snapshot.product}-draft.zip`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    status('Draft ZIP downloaded with four previews, original uploads and measurements.');
  } catch (error) { status(`ZIP was not downloaded: ${error.message}`); }
  finally { button.disabled = false; }
};
// Avoid edits while restoring so asynchronous storage cannot overwrite new uploads.
const inputs = [...document.querySelectorAll('button,input,select')]; inputs.forEach(input => input.disabled = true);
try {
  const saved = await databaseTask();
  if (saved?.schemaVersion === 1 && PRODUCTS[saved.product] && [...COLORS, 'Dark Heather'].includes(saved.color) && saved.artwork && saved.photos && SIZES.includes(saved.size) && Number.isInteger(saved.quantity) && saved.quantity > 0 && saved.quantity <= 999) {
    saved.quantity = Math.min(99, saved.quantity);
    saved.printMethod = Object.hasOwn(PRINT_METHODS, saved.printMethod) ? saved.printMethod : 'transfer';
    for (const v of VIEWS) if (saved.artwork[v]) saved.artwork[v].placement = constrainPlacement(saved.artwork[v].placement, zoneFor(saved, v));
    // Preserve early pilot photo uploads under the product-specific key format.
    for (const [key, photo] of Object.entries(saved.photos)) if (key.split(':').length === 2) saved.photos[`${saved.product}:${key}`] = photo;
    draft = saved; $('product').value = draft.product; updateColors(); $('size').value = draft.size; $('quantity').value = draft.quantity; if ($('printMethod')) $('printMethod').value = draft.printMethod; status('Saved device draft restored.');
  }
} catch { status('Device draft storage is unavailable. You can still preview, but saving may fail.'); }
finally {
  busy = false; inputs.forEach(input => input.disabled = false);
  checkout = connectEverydayCheckout({ getDraft: () => { selection(); return draft; }, saveDraft: () => databaseTask(true), status });
  render();
}
