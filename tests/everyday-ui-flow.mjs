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
  return { id, value: id === 'quantity' ? '1' : id === 'size' ? 'L' : '', disabled: false, children: [], dataset: {}, attributes: {}, textContent: '', style: { setProperty() {} },
    setAttribute(key, value) { this.attributes[key] = value; }, append(child) { this.children.push(child); }, prepend(child) { this.children.unshift(child); },
    replaceChildren(...children) { this.children = children; }, add(option) { this.children.push(option); if (!this.value) this.value = option.value; },
    click() { downloads.push({ filename: this.download, blob: latestDownload }); } };
}
let nodes;
function setup() {
  nodes = new Map();
  const ids = ['product','color','size','quantity','printMethod','saveDraft','views','zoneLabel','emptyPhoto','artworkHeading','artName','remove','review','upload','photo','status','downloadPreview','productChoices','colorChoices','sizeChoices','colorName','quantityMinus','quantityPlus','uploadArtwork','layers','addText','textTools','textContent','textFont','textColor','textOutline','textOutlineColor','textAlign','textBold','textItalic','smaller','larger','centerArtwork'];
  for (const id of ids) nodes.set(id, element(id));
  nodes.get('printMethod').value='transfer';
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
assert.equal(nodes.get('productChoices').children.length, 4);
assert.equal(nodes.get('colorChoices').children.length, 10);
nodes.get('colorChoices').children.find(button => button.dataset.value === 'Royal').onclick(); await wait();
assert.equal(nodes.get('colorName').textContent, 'Royal');
assert.equal(nodes.get('colorChoices').children.find(button => button.dataset.value === 'Royal').attributes['aria-pressed'], 'true');
nodes.get('quantityMinus').onclick(); assert.equal(Number(nodes.get('quantity').value), 1);
nodes.get('quantityPlus').onclick(); assert.equal(Number(nodes.get('quantity').value), 2);
nodes.get('quantity').value = '99'; nodes.get('quantity').onchange(); nodes.get('quantityPlus').onclick(); assert.equal(Number(nodes.get('quantity').value), 99);
nodes.get('quantity').value = '1'; nodes.get('quantity').onchange();
nodes.get('colorChoices').children.find(button => button.dataset.value === 'White').onclick(); await wait();
nodes.get('productChoices').children.find(button => button.dataset.value === 'everyday-polo').onclick(); await wait();
assert(nodes.get('color').children.some(option => option.value === 'Light Blue'));
assert(nodes.get('color').children.some(option => option.value === 'Charcoal'));
assert(nodes.get('colorChoices').children.some(button => button.dataset.value === 'Light Blue'));
assert(nodes.get('colorChoices').children.some(button => button.dataset.value === 'Charcoal'));
assert(nodes.get('zoneLabel').textContent.includes('Left chest · Maximum 3 × 3'));
assert.equal(nodes.get('views').children[0].textContent, 'Left chest');
const logo = createCanvas(200, 100); logo.getContext('2d').fillStyle = '#ffffff'; logo.getContext('2d').fillRect(0, 0, 200, 100);
const original = new Blob([logo.toBuffer('image/png')], { type: 'image/png' }); original.name = 'customer-logo.png';
for (const button of nodes.get('views').children) {
  button.onclick(); nodes.get('upload').files = [original]; await nodes.get('upload').onchange({ target: nodes.get('upload') });
}
// Removal belongs to the selected zone, including after switching views.
nodes.get('views').children[2].onclick(); await wait();
assert.equal(nodes.get('artworkHeading').textContent, 'Left sleeve artwork');
assert.equal(nodes.get('remove').textContent, 'Remove from left sleeve');
nodes.get('remove').onclick(); await wait();
assert.equal(nodes.get('artName').textContent, 'No print');
assert.equal(nodes.get('remove').disabled, true);
await nodes.get('saveDraft').onclick();
assert.equal(stored.artwork.left, undefined);
for (const v of ['front', 'back', 'right']) assert(stored.artwork[v], 'Removing a sleeve preserves other zones');
assert.match(nodes.get('review').children[2].textContent, /No print/);
nodes.get('upload').files = [original]; await nodes.get('upload').onchange({ target: nodes.get('upload') });
stored = undefined;
nodes.get('views').children[3].onclick(); await wait();
nodes.get('larger').onclick(); await nodes.get('saveDraft').onclick();
assert.equal(stored.artwork.right.placement.width, 3, 'Button resizing is capped to the sleeve print area');
stored = undefined;
nodes.get('product').value = 'everyday-hoodie'; nodes.get('product').onchange();
nodes.get('views').children[0].onclick(); await wait();
assert(nodes.get('zoneLabel').textContent.includes('12 × 15'), 'Hoodie uses the same body print dimensions as the shirts');
nodes.get('sizeChoices').children.find(button => button.dataset.value === '4XL').onclick();await wait();
nodes.get('quantity').value = '1.5'; await nodes.get('saveDraft').onclick(); assert.equal(stored, undefined);
nodes.get('quantity').value = '3'; await nodes.get('saveDraft').onclick();
nodes.get('printMethod').value='dtg';nodes.get('printMethod').onchange();await nodes.get('saveDraft').onclick();
assert.equal(stored.product, 'everyday-hoodie'); assert.equal(stored.quantity, 3);
assert.equal(stored.size, '4XL');
assert.equal(stored.printMethod,'dtg');
assert.deepEqual(Buffer.from(await stored.artwork.front.file.arrayBuffer()), Buffer.from(await original.arrayBuffer()));
const { drawPreview } = await import('../v20/everyday-preview-renderer.js');
for (const [i, selectedView] of ['front','back','left','right'].entries()) {
  nodes.get('views').children[i].onclick(); await wait();
  const exporting = nodes.get('downloadPreview').onclick();
  nodes.get('views').children[(i + 1) % 4].onclick();
  await exporting;
  const exported = downloads.at(-1);
  assert.equal(exported.filename, `everyday-hoodie-white-${selectedView}.png`);
  assert.equal(exported.blob.type, 'image/png');
  const expected = createCanvas(800,900); await drawPreview(expected, stored, selectedView);
  assert.deepEqual(Buffer.from(await exported.blob.arrayBuffer()), expected.toBuffer('image/png'), 'Export captures clicked view with its artwork and no editing guides');
  assert.equal(nodes.get('downloadPreview').disabled, false);
}
setup(); await import('../v20/everyday.js?test=restore'); await wait();
assert.equal(nodes.get('product').value, 'everyday-hoodie'); assert.equal(nodes.get('quantity').value, 3);
assert.equal(nodes.get('size').value,'4XL','A saved 4XL device draft restores its size');
assert.equal(nodes.get('printMethod').value,'dtg','The chosen print method restores with the original artwork');
assert.equal(nodes.get('artName').textContent, 'customer-logo.png');
// Actual text/image selection, corner resizing and independent deletion.
nodes.get('addText').onclick(); await wait();
nodes.get('textContent').value = 'MY TEAM'; nodes.get('textContent').oninput(); await wait();
nodes.get('smaller').onclick(); await wait(); await nodes.get('saveDraft').onclick();
assert.equal(stored.artwork.front.texts[0].text,'MY TEAM');
assert(stored.artwork.front.file,'Text preserves the uploaded image');
const textBefore = {...stored.artwork.front.texts[0].placement};
const {guideFor} = await import('../v20/everyday-preview-renderer.js'); const guide = guideFor(stored,'front');
const c = nodes.get('preview'), event = (x,y) => ({clientX:x,clientY:y,pointerId:1});
c.onpointerdown(event(guide.x+(textBefore.x+textBefore.width)*guide.scale,guide.y+(textBefore.y+textBefore.height)*guide.scale));
c.onpointermove(event(guide.x+(textBefore.x+textBefore.width*.6)*guide.scale,guide.y+(textBefore.y+textBefore.height*.6)*guide.scale)); c.onpointerup();
await wait(); await nodes.get('saveDraft').onclick(); assert(stored.artwork.front.texts[0].placement.width < textBefore.width,'Corner handles resize text');
await nodes.get('downloadPreview').onclick(); assert.equal(downloads.at(-1).filename,'everyday-hoodie-white-front.png');
const textExport = createCanvas(800,900); await drawPreview(textExport, stored, 'front');
assert.deepEqual(Buffer.from(await downloads.at(-1).blob.arrayBuffer()), textExport.toBuffer('image/png'), 'PNG preserves text and image layers');
nodes.get('remove').onclick(); await wait(); await nodes.get('saveDraft').onclick();
assert.equal(stored.artwork.front.texts.length,0); assert(stored.artwork.front.file,'Removing selected text preserves image');
const navigation = fs.readFileSync(new URL('v20/everyday-entry.js', root), 'utf8');
const actions = element(), navigationDocument = { querySelector: () => actions, getElementById: () => null, createElement: () => element() };
vm.runInNewContext(navigation, { URLSearchParams, location: { search: '' }, document: navigationDocument }); assert.equal(actions.children.length, 1); assert.equal(actions.children[0].href, '/everyday.html');
vm.runInNewContext(navigation, { URLSearchParams, location: { search: '?everydayPreview=1' }, document: navigationDocument }); assert.equal(actions.children[0].textContent, 'Everyday Custom');
// Shared Google sign-in saves the design before navigation; return paths are allowlisted.
const { everydayGoogleSignIn, takeEverydayReturn, customerOrders } = await import('../v20/everyday-account.js');
const memory=new Map(),authStorage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
let savedBeforeAuth=false,options;
await everydayGoogleSignIn({auth:{signInWithOAuth:async input=>{assert(savedBeforeAuth);options=input;return {error:null};}}},async()=>{savedBeforeAuth=true;},authStorage,'https://mymerchnow.app',false);
assert.equal(options.provider,'google');assert.equal(options.options.redirectTo,'https://mymerchnow.app/');assert.equal(takeEverydayReturn(authStorage),'/everyday.html');assert.equal(takeEverydayReturn(authStorage),null);
memory.set('mqd-everyday-auth-return','https://evil.invalid');assert.equal(takeEverydayReturn(authStorage),null);
const filters=[];const query={select(){return this;},eq(key,value){filters.push([key,value]);return this;},order(){return this;},limit:async()=>({data:[{order_number:'MQD-OWNED'}],error:null})};
assert.equal((await customerOrders({from:()=>query},{id:'customer-id'}))[0].order_number,'MQD-OWNED');assert.deepEqual(filters,[['user_id','customer-id'],['is_test',false]]);
await assert.rejects(customerOrders({from:()=>query},{is_anonymous:true,id:'guest'}),/Sign in/);
for (const page of ['everyday.html', 'everyday-preview.html']) {
  const html = fs.readFileSync(new URL(page, root), 'utf8');
  assert(!html.includes('Print width in inches') && !html.includes('Left offset') && !html.includes('Top offset'));
  assert(html.includes('id="uploadArtwork"') && html.includes('id="colorChoices"'));
}
URL.createObjectURL = realCreate; URL.revokeObjectURL = realRevoke;
console.log('PASS: actual editor upload, bounds, product switching, quantity validation, original-file storage, current-view PNG download, draft restoration, and shared navigation.');
process.exit(0);
