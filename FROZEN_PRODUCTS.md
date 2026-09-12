# Frozen product baseline

The 12 production garments are protected by `.github/workflows/frozen-product-regressions.yml`.
The check locks each product's ID, name, price, GLB URL, zones, production template
dimensions, renderer modules, core editor mapping functions, and template artwork.

Do not update `tests/frozen-products.json` or `tests/frozen-renderers.json` to make a
failed check pass. First test the affected garment in 2D and 3D, verify its other zones,
and regression-check at least one unrelated garment. Update the relevant baseline only
after the new behavior is approved.

Run the protection locally with:

```sh
node tests/frozen-product-baseline.mjs
node --check v20/editor.js
node tests/fleece-hoodie-zones.mjs
node tests/long-sleeve-pattern-uv.mjs
node tests/mask-renderer.mjs
node tests/tshirt-text-mapping.mjs
```

An intentional approved mapping change must include the product code, its focused tests,
and the reviewed baseline update in the same pull request.
