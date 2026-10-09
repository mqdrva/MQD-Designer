// Exercise the actual UI event handlers with a device-storage harness and real
// canvas exports. This complements, but does not replace, browser interaction checks.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const { createCanvas, loadImage } = await import(process.env.EVERYDAY_CANVAS_MODULE || '@napi-rs/canvas');
const root = new URL('../', import.meta.url);
let stored, latestDownload;
const downloads = [];
const wait = () => new Promise(resolve => setTimeout(resolve, 20));
function element(id = '') {
  return { id, value: id === 'quantity' ? '1' : id === 'size' ? 'L' : '', disabled: false, children: [], dataset: {}, attributes: {}, textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; }, append(child) { this.children.push(child); }, prepend(child) { this.children.unshift(child); },
    replaceChildren(...children) { this.children = children; }, add(option) { this.children.push(option); if (!this.value) this.value = option.value; },
    click() { downloads.push({ filename: this.download, blob: latestDownload }); } };
}
let nodes;
function setup() {
  nodes = new Map();
  const ids = ['product','color','size','quantity','saveDraft','views','zoneLabel','emptyPhoto','artName','width','x','y','dimensions','remove','review','upload','photo','status','downloadSheet','downloadZip'];
  for (const id of ids) nodes.set(id, element(id));
  const canvas = createCanvas(800, 900); canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 900 }); canvas.setPointerCapture = () => {}; nodes.set('preview', canvas);
  globalThis.document = { getElementById: id => nodes.get(id), querySelectorAll: () => [...nodes.values()], createElement: tag => {
    if (tag !== 'canvas') return element();
    const c = createCanvas(800, 900); c.toBlob = callback => callback(new Blob([c.toBuffer('image/png')], { type: 'image/png' })); return c;
  } };
}
globalThis.Option = class { constructor(text, value) { this.text = text; this.value = value; } };
globalThis.createImageBitmap = async blob => loadImage(Buffer.from(await blob.arrayBuffer()));
globalThis.fetch = async url => ({ ok: true, blob: async () => new Blob([fs.readFileSync(new URL(url.slice(1), root))]) });
globalThis.indexedDB = { open() {
  const request = {}; queueMicrotask(() => {
    request.result = { close() {}, transaction() {
      const transaction = { objectStore() { return {
        put(value) { stored = structuredClone(value); const operation = { result: 'pilot' }; queueMicrotask(() => transaction.oncomplete()); return operation; },
        get() { const operation = { result: stored ? structuredClone(stored) : undefined }; queueMicrotask(() => transaction.oncomplete()); return operation; }
      }; } }; return transaction;
    } }; request.onsuccess();
  }); return request;
} };
const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;
URL.createObjectURL = blob => { latestDownload = blob; return 'blob:development-test'; }; URL.revokeObjectURL = () => {};
setup();
await import('../v20/everyday.js?test=first'); await wait();
assert.equal(nodes.get('product').children.length, 4); assert.equal(nodes.get('color').children.length, 10);
nodes.get('product').value = 'everyday-polo'; nodes.get('product').onchange(); await wait();
assert(nodes.get('color').children.some(option => option.value === 'Dark Heather'));
assert(!nodes.get('color').children.some(option => option.value === 'Charcoal'));
assert(nodes.get('zoneLabel').textContent.includes('Left chest · Maximum 3 × 3'));
assert.equal(nodes.get('views').children[0].textContent, 'Left chest');
const logo = createCanvas(200, 100); logo.getContext('2d').fillStyle = '#ffffff'; logo.getContext('2d').fillRect(0, 0, 200, 100);
const original = new Blob([logo.toBuffer('image/png')], { type: 'image/png' }); original.name = 'customer-logo.png';
for (const button of nodes.get('views').children) {
  button.onclick(); nodes.get('upload').files = [original]; await nodes.get('upload').onchange({ target: nodes.get('upload') });
}
nodes.get('width').value = '1000'; nodes.get('width').onchange();
assert.equal(Number(nodes.get('width').value), 3, 'Sleeve resize is capped');
nodes.get('product').value = 'everyday-hoodie'; nodes.get('product').onchange();
nodes.get('views').children[0].onclick(); await wait();
assert(nodes.get('zoneLabel').textContent.includes('12 × 15'), 'Hoodie uses the same body print dimensions as the shirts');
nodes.get('size').value='4XL';nodes.get('size').onchange();await wait();
nodes.get('quantity').value = '1.5'; await nodes.get('saveDraft').onclick(); assert.equal(stored, undefined);
nodes.get('quantity').value = '3'; await nodes.get('saveDraft').onclick();
assert.equal(stored.product, 'everyday-hoodie'); assert.equal(stored.quantity, 3);
assert.equal(stored.size, '4XL');
assert.deepEqual(Buffer.from(await stored.artwork.front.file.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
await nodes.get('downloadZip').onclick();
assert.equal(downloads.at(-1).filename, 'everyday-hoodie-draft.zip'); assert(downloads.at(-1).blob.size > original.size);
setup(); await import('../v20/everyday.js?test=restore'); await wait();
assert.equal(nodes.get('product').value, 'everyday-hoodie'); assert.equal(nodes.get('quantity').value, 3);
assert.equal(nodes.get('size').value,'4XL','A saved 4XL device draft restores its size');
assert.equal(nodes.get('artName').textContent, 'customer-logo.png');
const navigation = fs.readFileSync(new URL('v20/everyday-entry.js', root), 'utf8');
const actions = element(), navigationDocument = { querySelector: () => actions, getElementById: () => null, createElement: () => element() };
vm.runInNewContext(navigation, { URLSearchParams, location: { search: '' }, document: navigationDocument }); assert.equal(actions.children.length, 1); assert.equal(actions.children[0].href, '/everyday.html');
vm.runInNewContext(navigation, { URLSearchParams, location: { search: '?everydayPreview=1' }, document: navigationDocument }); assert.equal(actions.children[0].textContent, 'Everyday Custom');
URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
console.log('PASS: actual editor upload, bounds, product switching, quantity validation, original-file storage, ZIP download, draft restoration, and shared navigation.');
process.exit(0);
