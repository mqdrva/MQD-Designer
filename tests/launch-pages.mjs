import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
const index=read('index.html');
const css=read('v20/editor.css');
const mobile=read('v20/mobile-workspace.js');
const vercel=JSON.parse(read('vercel.json'));
const confirmation=read('order-confirmation.html');
const pages=['contact.html','shipping.html','returns.html','privacy.html','terms.html'];

for(const page of pages){
  const html=read(page);
  assert(html.includes('Back to designer'),`${page} must return customers to the designer`);
  assert(html.includes('/privacy.html')&&html.includes('/terms.html'),`${page} must link the policy set`);
}
assert(index.includes('Help &amp; Policies'),'designer must expose customer help and policies');
for(const page of pages)assert(index.includes(`/${page}`),`designer must link ${page}`);
assert(confirmation.includes('/returns.html')&&confirmation.includes('/privacy.html'),'order confirmation must expose returns and privacy');
assert(index.includes('data-mobile-pane="preview"')&&index.includes('data-mobile-pane="control"'),'mobile designer must expose preview and option tabs');
assert(index.includes('data-mobile-pane="control">Add / Edit</button>'),'mobile controls tab must clearly describe adding and editing artwork');
assert(index.indexOf('/v20/upload-optimizer.js')<index.indexOf('/v20/editor.js'),'image optimizer must load before the editor handles phone uploads');
for(const asset of ['/v20/editor.css','/v20/editor.js','/v20/upload-optimizer.js','/v20/customer.js']){
  const reference=[...index.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).find(value=>value.startsWith(asset+'?'));
  assert(reference&&new URL(reference,'https://mymerchnow.app').searchParams.get('v'),`${asset} must have a cache-busting version`);
}
assert(index.includes('no-cache, no-store, must-revalidate'),'designer HTML must tell mobile browsers not to reuse a stale page');
assert(vercel.headers.some(rule=>rule.source==='/'&&rule.headers.some(header=>header.key==='Cache-Control'&&header.value.includes('no-store'))),'production designer route must not be cached');
assert(css.includes('.preview-pane.mobile-active')&&css.includes('.control-pane.mobile-active'),'mobile preview and controls must be reachable');
assert(css.includes('html{color-scheme:light}')&&css.includes('cursor:grab;background:#fff'),'mobile browsers must keep the 2D canvas readable in dark mode');
assert(mobile.includes("window.dispatchEvent(new Event('resize'))"),'3D renderer must resize when its mobile tab opens');

console.log('PASS: launch policy pages are linked and all mobile designer panes remain reachable.');
