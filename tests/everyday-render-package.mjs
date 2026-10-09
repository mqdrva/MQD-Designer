import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { drawPreview, PRODUCTS, guideFor, zoneFor } from '../v20/everyday-preview-renderer.js';
import { COLORS, VIEWS, fitArtwork } from '../v20/everyday-contract.js';
import { makeZip, safeArtworkName } from '../v20/everyday-zip.js';
const { createCanvas, loadImage } = await import(process.env.EVERYDAY_CANVAS_MODULE || '@napi-rs/canvas');
const root = new URL('../', import.meta.url);
globalThis.createImageBitmap = async blob => loadImage(Buffer.from(await blob.arrayBuffer()));
globalThis.document = { createElement: tag => { assert.equal(tag, 'canvas'); return createCanvas(800, 900); } };
globalThis.fetch = async url => ({ ok: true, blob: async () => new Blob([fs.readFileSync(new URL(url.slice(1), root))]) });
const logo = createCanvas(200, 250), logoContext = logo.getContext('2d');
logoContext.fillStyle = 'white'; logoContext.fillRect(0, 0, 200, 250);
logoContext.fillStyle = '#b94b00'; logoContext.font = 'bold 21px sans-serif'; logoContext.textAlign = 'center'; logoContext.fillText('PRINT', 100, 118); logoContext.fillText('AREA', 100, 147);
const originalBytes = logo.toBuffer('image/png'), original = new Blob([originalBytes], { type: 'image/png' });
const square = createCanvas(150, 150), squareContext = square.getContext('2d'); squareContext.fillStyle = '#fff'; squareContext.fillRect(0, 0, 150, 150);
const squareOriginal = new Blob([square.toBuffer('image/png')], { type: 'image/png' });
const draft = { schemaVersion: 1, product: 'everyday-tshirt', color: 'Black', size: 'L', quantity: 2, photos: {}, artwork: {} };
const board = createCanvas(1280, Object.keys(PRODUCTS).length * 400), boardContext = board.getContext('2d'); boardContext.fillStyle = '#fff'; boardContext.fillRect(0, 0, board.width, board.height);
let row = 0;
for (const size of ['S', 'M', 'L', 'XL', '2XL']) {
  const hoodie = { ...draft, product: 'everyday-hoodie', size };
  const front = guideFor(hoodie, 'front'), back = guideFor(hoodie, 'back');
  assert.equal(front.width, back.width, 'Hoodie front/back widths must match');
  assert.equal(front.height, back.height, 'Hoodie front/back heights must match');
  const shirt = guideFor({ ...hoodie, product: 'everyday-tshirt' }, 'front');
  assert.equal(front.width, shirt.width, 'Hoodie body area must match shirt width');
  assert.equal(front.height, shirt.height, 'Hoodie body area must match shirt height');
}
for (const [product, info] of Object.entries(PRODUCTS)) {
  draft.product = product; draft.color = ['Black', 'Royal', 'Forest Green', 'Navy'][row];
  draft.artwork = Object.fromEntries(VIEWS.map(view => { const isSquare = view === 'left' || view === 'right' || (product === 'everyday-polo' && view === 'front'); return [view, { name: 'logo.png', file: isSquare ? squareOriginal : original, placement: fitArtwork(isSquare ? 3 : 4, isSquare ? 3 : 5, zoneFor(draft, view)) }]; }));
  let column = 0;
  for (const view of VIEWS) {
    const model = await loadImage(fs.readFileSync(new URL(`assets/everyday/models/${info.model}-${view}.png`, root)));
    const mask = createCanvas(800, 900); mask.getContext('2d').drawImage(model, 0, 0);
    const guide = guideFor(draft, view);
    if (product === 'everyday-polo' && view === 'front') {
      assert.equal(zoneFor(draft, view).width, 3); assert.equal(zoneFor(draft, view).height, 3);
      assert.equal(guide.width, guide.height); assert(guide.x > 400, 'Polo chest zone must be on the wearer’s left');
    } else if (view === 'front' || view === 'back') {
      assert(guide.height > guide.width, `${product}/${view}: body area must be portrait`);
      assert(guide.width < 300 && guide.height < 375, `${product}/${view}: body guide must be smaller than the original`);
    } else {
      assert.equal(guide.width, guide.height, 'Sleeves retain square print guides');
      const opposite = guideFor(draft, view === 'left' ? 'right' : 'left');
      assert.equal(guide.x + guide.width / 2 + opposite.x + opposite.width / 2, 800, 'Sleeve placement must be mirrored across garment views');
    }
    for (const [x, y] of [[guide.x + 1, guide.y + 1], [guide.x + guide.width - 1, guide.y + 1], [guide.x + 1, guide.y + guide.height - 1], [guide.x + guide.width - 1, guide.y + guide.height - 1]]) {
      assert(mask.getContext('2d').getImageData(x, y, 1, 1).data[3] > 0, `${product}/${view}: print guide must fit within the garment silhouette`);
    }
    const canvas = createCanvas(800, 900); await drawPreview(canvas, draft, view, { guides: true });
    const box = guideFor(draft, view), p = draft.artwork[view].placement;
    const x = Math.floor(box.x + (p.x + p.width * .1) * box.scale), y = Math.floor(box.y + (p.y + p.height * .1) * box.scale);
    const pixel = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    assert(pixel[0] > 100 && pixel[1] > 100 && pixel[2] > 100, `${product}/${view}: light artwork must remain visible`);
    boardContext.drawImage(canvas, column * 320, row * 400 + 30, 320, 360);
    boardContext.fillStyle = '#151515'; boardContext.font = '14px sans-serif'; boardContext.fillText(`${info.name} · ${view}`, column * 320 + 16, row * 400 + 22);
    column++;
  }
  for (const color of COLORS) { draft.color = color; await drawPreview(createCanvas(800, 900), draft, 'front'); }
  row++;
}
const entries = VIEWS.map(view => ({ name: `originals/${view}-logo.png`, data: original }));
entries.push({ name: 'order-sheet.json', data: JSON.stringify({ units: 'inches', quantity: draft.quantity }) });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'everyday-zip-test-'));
const zipPath = path.join(temporary, 'draft.zip'); fs.writeFileSync(zipPath, Buffer.from(await (await makeZip(entries)).arrayBuffer()));
const python = process.env.EVERYDAY_PYTHON || 'python3';
const checked = spawnSync(python, ['-c', 'import sys,zipfile,json; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert len(z.namelist())==5; assert z.read("originals/front-logo.png")==z.read("originals/right-logo.png"); assert json.loads(z.read("order-sheet.json"))["units"]=="inches"; print("ZIP extraction and CRC validation passed")', zipPath], { encoding: 'utf8' });
assert.equal(checked.status, 0, checked.stderr);
await assert.rejects(makeZip([{ name: '../unsafe.png', data: original }]));
await assert.rejects(makeZip([{ name: 'same.png', data: original }, { name: 'same.png', data: original }]));
assert.equal(safeArtworkName('../../logo.png'), '_/_/logo.png'.replaceAll('/', '_'));
if (process.env.EVERYDAY_BOARD) fs.writeFileSync(process.env.EVERYDAY_BOARD, board.toBuffer('image/png'));
console.log(`PASS: ${Object.keys(PRODUCTS).length * 4} garment views, ten-color previews, polo left-chest bounds, white artwork on dark blanks, and independently extracted ZIP.`);
