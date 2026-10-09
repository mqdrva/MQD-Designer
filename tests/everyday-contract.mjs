import assert from 'node:assert/strict';
import { VIEWS, ZONES, fitArtwork, constrainPlacement, resizeArtwork, orderSheet } from '../v20/everyday-contract.js';
for (const view of VIEWS) {
  const zone = ZONES[view];
  for (const [w, h] of [[10000, 200], [200, 10000], [1200, 1500]]) {
    const p = fitArtwork(w, h, zone);
    assert(p.width <= zone.width && p.height <= zone.height);
    assert(Math.abs(p.width / p.height - w / h) < 1e-8);
    for (const [x, y] of [[-100, -100], [100, 100]]) {
      const moved = constrainPlacement({ ...p, x, y }, zone);
      assert(moved.x >= 0 && moved.y >= 0);
      assert(moved.x + moved.width <= zone.width + 1e-8);
      assert(moved.y + moved.height <= zone.height + 1e-8);
      const resized = resizeArtwork(moved, 200, zone);
      assert(resized.width <= zone.width && resized.height <= zone.height);
      assert(Math.abs(resized.width / resized.height - w / h) < 1e-8);
    }
  }
}
assert.throws(() => constrainPlacement({ x: NaN, y: 0, width: 2, height: 2 }, ZONES.front));
assert.throws(() => fitArtwork(0, 100, ZONES.front));
const original = new Blob(['original bytes'], { type: 'image/png' });
const draft = { product: 'everyday-tshirt', color: 'Black', size: 'L', quantity: 2,
  artwork: { front: { name: 'logo.png', file: original, placement: { x: 1, y: 2, width: 4, height: 5 } } } };
const sheet = orderSheet(draft);
assert.equal(sheet.units, 'inches');
assert.deepEqual(sheet.locations.front, { filename: 'logo.png', x: 1, y: 2, width: 4, height: 5 });
assert.deepEqual(sheet.locations.back, { status: 'No print' });
assert.equal(draft.artwork.front.file, original);
assert.equal(await draft.artwork.front.file.text(), 'original bytes');
console.log('PASS: Everyday print bounds, aspect ratio, dimensions and source-file separation.');
