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

const { colorsForProduct, sizesForProduct, PRODUCT_OPTIONS } = await import('../v20/everyday-catalog.js');
const backend = await import('../supabase/functions/_shared/mqd-everyday.js');
const fs = await import('node:fs');
assert.equal(fs.readFileSync(new URL('../v20/everyday-catalog.js', import.meta.url), 'utf8'), fs.readFileSync(new URL('../supabase/functions/_shared/mqd-everyday-catalog.js', import.meta.url), 'utf8'));
const config = backend.everydayPricing(fs.readFileSync(new URL('../config/everyday-pricing.example.json', import.meta.url), 'utf8'));
const { draftQuote } = await import('../v20/everyday-checkout.js');
for (const product of Object.keys(PRODUCT_OPTIONS)) {
  assert.equal(colorsForProduct(product).length, 10);
  for (const color of colorsForProduct(product)) for (const size of sizesForProduct(product, color)) {
    const sample = { ...draft, product, color, size, quantity: 1, artwork: { front: { name: 'logo.png', file: original, placement: { x: 0, y: 0, width: 2, height: 2 } } } };
    const sheet = orderSheet(sample);
    const payload = { range: 'everyday', product: { id: product }, everyday: sheet, orderOptions: [{ size, quantity: 1 }], totalQuantity: 1 };
    assert.equal(backend.everydayQuote(payload, config).unitCents, draftQuote(sample, config).unitCents);
  }
}
assert(sizesForProduct('everyday-tshirt', 'Black').includes('6XL'));
assert(!sizesForProduct('everyday-tshirt', 'Gold').includes('6XL'));
assert(sizesForProduct('everyday-hoodie', 'White').includes('XS'));
assert(!sizesForProduct('everyday-hoodie', 'Charcoal').includes('XS'));
assert(!sizesForProduct('everyday-hoodie', 'White').includes('6XL'));
assert(!sizesForProduct('everyday-polo', 'White').includes('5XL'));
for (const [product,color,size] of [['everyday-tshirt','Gold','6XL'],['everyday-hoodie','Forest','XS'],['everyday-polo','Purple','L']]) assert.throws(()=>orderSheet({...draft,product,color,size}),/approved Everyday size/);
console.log('PASS: all garment/color/size combinations, exact frontend/backend catalog parity, invalid variants and extended-size pricing.');
