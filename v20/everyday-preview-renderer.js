import { ZONES } from './everyday-contract.js';
export const PRODUCTS = {
  'everyday-tshirt': { name: 'Cotton T-shirt', model: 'tshirt', proposedBlank: 'Gildan 5000' },
  'everyday-long-sleeve': { name: 'Cotton long sleeve', model: 'long-sleeve', proposedBlank: 'Gildan 2400' },
  'everyday-hoodie': { name: 'Hoodie', model: 'hoodie', proposedBlank: 'Gildan 18500' },
  'everyday-polo': { name: 'Polo', model: 'polo', proposedBlank: 'Gildan 8800' },
};
// Display approximations only. Orders identify blanks by manufacturer color name.
export const COLOR_PREVIEW = { White: '#ffffff', Black: '#252525', Navy: '#26364c', Royal: '#2559ac', Red: '#c42a37', 'Sport Grey': '#b6b6b6', Charcoal: '#56565a', 'Dark Heather': '#606065', 'Forest Green': '#284b3b', Purple: '#563576', Gold: '#efb431' };
export function zoneFor(draft, view) {
  if (draft.product === 'everyday-polo' && view === 'front') return { label: 'Left chest', width: 3, height: 3 };
  if (draft.size === 'S' && (view === 'front' || view === 'back')) return { ...ZONES[view], width: 10, height: 12 };
  return ZONES[view];
}
export function guideFor(draft, view) {
  const zone = zoneFor(draft, view), sleeve = view === 'left' || view === 'right';
  // Wearer's left is on the viewer's right in the front view.
  if (draft.product === 'everyday-polo' && view === 'front') return { x: 444, y: 235, scale: 26, width: 78, height: 78 };
  const calibration = {
    'everyday-tshirt': { bodyY: 180, bodyScale: 18, sleeveY: 250, sleeveScale: 26, sleeveLeftCenter: 380 },
    'everyday-long-sleeve': { bodyY: 210, bodyScale: 18, sleeveY: 270, sleeveScale: 24, sleeveLeftCenter: 420 },
    'everyday-hoodie': { bodyY: view === 'front' ? 210 : 240, bodyScale: 18, sleeveY: 280, sleeveScale: 24, sleeveLeftCenter: 400 },
    'everyday-polo': { bodyY: 200, bodyScale: 18, sleeveY: 250, sleeveScale: 26, sleeveLeftCenter: 380 },
  }[draft.product];
  const scale = sleeve ? calibration.sleeveScale : calibration.bodyScale;
  const center = sleeve ? (view === 'left' ? calibration.sleeveLeftCenter : 800 - calibration.sleeveLeftCenter) : 400;
  return { x: center - zone.width * scale / 2, y: sleeve ? calibration.sleeveY : calibration.bodyY, scale, width: zone.width * scale, height: zone.height * scale };
}
export function photoKey(draft, view) { return `${draft.product}:${draft.color}:${view}`; }
const bitmaps = new WeakMap(), models = new Map();
export async function bitmap(blob) { if (!bitmaps.has(blob)) bitmaps.set(blob, createImageBitmap(blob)); return bitmaps.get(blob); }
async function modelImage(product, view) {
  const url = `/assets/everyday/models/${PRODUCTS[product].model}-${view}.png`;
  if (!models.has(url)) models.set(url, fetch(url).then(response => { if (!response.ok) throw new Error('Garment image unavailable.'); return response.blob(); }).then(bitmap).catch(error => { models.delete(url); throw error; }));
  return models.get(url);
}
export async function drawPreview(canvas, draft, view, { guides = false, draftLabel = false } = {}) {
  const ctx = canvas.getContext('2d'), customPhoto = draft.photos[photoKey(draft, view)];
  const background = customPhoto ? await bitmap(customPhoto) : await modelImage(draft.product, view);
  const art = draft.artwork[view], artwork = art ? await bitmap(art.file) : null, box = guideFor(draft, view);
  ctx.clearRect(0, 0, 800, 900); ctx.fillStyle = '#f7f7f7'; ctx.fillRect(0, 0, 800, 900);
  let shading;
  if (customPhoto) {
    const scale = Math.min(800 / background.width, 900 / background.height);
    ctx.drawImage(background, (800 - background.width * scale) / 2, (900 - background.height * scale) / 2, background.width * scale, background.height * scale);
  } else {
    shading = document.createElement('canvas'); shading.width = 800; shading.height = 900;
    const layer = shading.getContext('2d'); layer.fillStyle = COLOR_PREVIEW[draft.color]; layer.fillRect(0, 0, 800, 900);
    layer.globalCompositeOperation = 'multiply'; layer.drawImage(background, 0, 0);
    layer.globalCompositeOperation = 'destination-in'; layer.drawImage(background, 0, 0);
    ctx.save(); ctx.shadowColor = '#00000020'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 10; ctx.drawImage(shading, 0, 0); ctx.restore();
  }
  if (artwork) {
    const p = art.placement, x = box.x + p.x * box.scale, y = box.y + p.y * box.scale, w = p.width * box.scale, h = p.height * box.scale;
    const overlay = document.createElement('canvas'); overlay.width = 800; overlay.height = 900;
    const layer = overlay.getContext('2d'); layer.drawImage(artwork, x, y, w, h);
    if (!customPhoto) {
      // Geometry luminance adds folds without blending with the blank's dark color.
      layer.globalCompositeOperation = 'multiply'; layer.drawImage(background, 0, 0);
      layer.globalCompositeOperation = 'destination-in'; layer.drawImage(artwork, x, y, w, h);
      layer.globalCompositeOperation = 'destination-in'; layer.drawImage(background, 0, 0);
    }
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.width, box.height); ctx.clip(); ctx.drawImage(overlay, 0, 0); ctx.restore();
  }
  if (guides) {
    ctx.save(); ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.strokeStyle = '#b94b00'; ctx.lineWidth = 2; ctx.strokeRect(box.x, box.y, box.width, box.height); ctx.restore();
  }
  if (draftLabel) { ctx.fillStyle = '#555'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DEVELOPMENT PREVIEW — blank fit and print placement require approval', 400, 875); }
}
