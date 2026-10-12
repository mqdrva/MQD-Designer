import {shopColors,shopSizes,garmentLabel} from './shop-garments.js';
import { MAX_REQUEST_BYTES, requestEstimate, money, SHOP_PRINT_METHODS, methodNeedsQuote, validPhone, shopPrintZones } from './print-shop-contract.js';
import { VIEWS, constrainPlacement, constrainImagePlacement } from './everyday-contract.js';
import { PRODUCTS, drawPreview, zoneFor } from './shop-preview-renderer.js';
import { artworkLayers, artworkBounds, printArtwork, printMetadata, imageClipped } from './everyday-layers.js';
import { makeZip, safeArtworkName } from './everyday-zip.js';

const API = 'https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-pilot';
const KEY = 'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const $ = id => document.getElementById(id);
const engine = document.body.dataset.shopEngine;
const setupPreview = new URLSearchParams(location.search).get('setupPreview') === '1';
const slug = location.pathname.match(/^\/shops\/([a-z0-9-]+)(?:\/3d)?\/?$/)?.[1] || new URLSearchParams(location.search).get('shop') || 'pilot';
let shop, getDraft, sending = false, cachedAttempt = null;
const say = message => { $('shopStatus').textContent = message; };
const download = (blob, name) => { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); };
const blobFromCanvas = canvas => new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Preview could not export.')), 'image/png'));
function rows() {
  const extra = [...document.querySelectorAll('#shopSizes .size-line')].map(row => ({ size: row.querySelector('select').value, quantity: Number(row.querySelector('input').value) }));
  return engine === '2d' ? [{ size: getDraft().size, quantity: getDraft().quantity }, ...extra] : extra;
}
function availableSizes(){if(engine==='2d'&&getDraft){const d=getDraft();return shopSizes(shop,d.product,d.color);}return shop.garments?.[window.MQDDesigner?.getContext().productId]?.sizes||['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL'];}
function syncRequestOptions(){
  const sizes=availableSizes();for(const select of document.querySelectorAll('#shopSizes select')){const old=select.value;select.replaceChildren(...sizes.map(s=>new Option(s,s)));select.value=sizes.includes(old)?old:sizes.includes('L')?'L':sizes[0];}
  if(engine==='3d'&&window.MQDDesigner){const id=window.MQDDesigner.getContext().productId,select=$('shopGarmentColor');const colors=shop.garments?.[id]?.colors||['White','Black'];const old=select.value;select.replaceChildren(...colors.map(c=>new Option(c,c)));select.value=colors.includes(old)?old:colors[0];}
}
function addSize() {
  const row = document.createElement('div'); row.className = 'size-line';
  const size = document.createElement('select'); size.className = 'input'; size.setAttribute('aria-label','Additional size');
  for (const value of availableSizes()) size.add(new Option(value,value)); size.value = [...size.options].some(o=>o.value==='L')?'L':size.options[0]?.value;
  const quantity = document.createElement('input'); quantity.className = 'input'; quantity.type = 'number'; quantity.min = '1'; quantity.max = '99'; quantity.value = '1'; quantity.setAttribute('aria-label','Quantity for this size');
  const remove = document.createElement('button'); remove.className = 'btn'; remove.type = 'button'; remove.textContent = 'Remove'; remove.onclick = () => { row.remove(); refresh(); };
  row.append(size,quantity,remove); $('shopSizes').append(row); size.onchange = quantity.oninput = refresh;
}
function summary() {
  if (engine === '2d') {
    const d = getDraft();
    return { engine, productId:d.product, productName:garmentLabel(shop,d.product,PRODUCTS[d.product].name), garment:shop.garments?.[d.product], color:d.color, printMethod:d.printMethod, locations:VIEWS.filter(v=>artworkLayers(d.artwork[v]).length), orderOptions:rows() };
  }
  const d = window.MQDDesigner.getContext();
  if (!window.MQDDesigner.hasShopArtwork()) throw new Error('Add artwork, text, or a garment color before requesting an order.');
  const design=window.MQDDesigner.exportDesign(), zoneMap={'Front':'front','Back':'back','Left Sleeve':'left','Right Sleeve':'right'};
  const locations=Object.entries(design.design.zones||{}).filter(([,z])=>z.layers?.length||(z.background&&z.background.toLowerCase()!=='#ffffff')).map(([zone])=>zoneMap[zone]||zone.toLowerCase());
  return {printLimits:shopPrintZones(shop,d.productId),engine,productId:d.productId,productName:d.productName,garment:shop.garments?.[d.productId],color:$('shopGarmentColor').value,locations,printMethod:$('shopPrintMethod').value,orderOptions:rows()};
}
function refresh() {
  if (!shop || (engine === '2d' && !getDraft)) return;
  syncRequestOptions();
  try { const estimate = requestEstimate(shop,summary()); $('shopEstimate').textContent = estimate.quoteRequired ? `Shop quote required · ${estimate.totalQuantity} garment(s).${summary().printMethod === 'sublimation' ? ' The shop must confirm a suitable garment and fabric for sublimation.' : ' The shop confirms artwork, setup and final pricing.'}` : `${money(estimate.totalCents)} estimated total · ${estimate.totalQuantity} garment(s). ${shop.pilot?'Sample pricing; ':''}shop approval, tax and shipping may change the final amount.${summary().printMethod==='sublimation'?' The shop must confirm a suitable garment and fabric.':''}`; $('shopSend').disabled = sending || setupPreview; }
  catch(error) { $('shopEstimate').textContent = error.message; $('shopSend').disabled = true; }
}
export function connectShopEveryday({ getDraft: getter }) {
  getDraft = getter;
  $('saveDraft').onclick = savePackage;
  $('addEverydayToCart').hidden = true;
  return { refresh };
}
function shopOrderSheet(d) {
  if (!Object.hasOwn(shop.printMethods || SHOP_PRINT_METHODS,d.printMethod)) throw new Error('Choose an available print method.');
  if(!shopColors(shop,d.product).includes(d.color)||!shopSizes(shop,d.product,d.color).includes(d.size))throw new Error('Choose an offered color and size.');
  return {schemaVersion:1,range:'print-shop',product:d.product,garment:shop.garments?.[d.product],color:d.color,size:d.size,quantity:d.quantity,units:'inches',printMethod:d.printMethod,printMethodLabel:SHOP_PRINT_METHODS[d.printMethod],status:'shop-review-required',printLimits:shopPrintZones(shop,d.product,d.size),locations:Object.fromEntries(VIEWS.map(view=>[view,d.artwork[view]?printMetadata(d.artwork[view],view,zoneFor(d,view)):{status:'No print'}]))};
}
async function buildPackage() {
  const entries = [], s = summary();
  if (engine === '2d') {
    const d = structuredClone(getDraft()), persisted = structuredClone(d), files = {};
    persisted.photos = {};
    for (const view of VIEWS.filter(v=>d.product!=='everyday-polo'||v==='front')) {
      const frame = document.createElement('canvas'); frame.width = 800; frame.height = 900;
      await drawPreview(frame,d,view); entries.push({ name:`previews/${view}.png`, data:await blobFromCanvas(frame) });
      const art = d.artwork[view]; if (!art) continue;
      if (art.file) { const path = `originals/${view}-${safeArtworkName(art.name || 'artwork.png')}`; entries.push({name:path,data:art.file}); files[view] = { path, name:art.name, type:art.file.type }; delete persisted.artwork[view].file; }
      if (art.texts?.length || imageClipped(art,zoneFor(d,view))) entries.push({name:`print-references/${view}.png`,data:await printArtwork(art,view,{zone:zoneFor(d,view)})});
    }
    entries.push({name:'design.json',data:JSON.stringify({schema:'mqd-shop-design-v1',engine,shop:shop.slug,draft:persisted,files})});
    entries.push({name:'measurements.json',data:JSON.stringify(shopOrderSheet(d),null,2)});
  } else {
    const design = window.MQDDesigner.exportDesign();
    if(!window.MQDDesigner.shopPreviewReady())throw new Error('The 3D garment is still loading. Try saving again when the preview is ready.');
    window.dispatchEvent(new Event('mqd:show-preview'));
    window.MQDDesigner.refreshMobileWorkspace('preview');
    entries.push({name:'design.json',data:JSON.stringify({schema:'mqd-shop-design-v1',engine,shop:shop.slug,design})});
    entries.push({name:'previews/3d.png',data:await window.MQDDesigner.captureShopPreview()});
    for (const [zone,state] of Object.entries(design.design.zones || {})) for (const [i,layer] of (state.layers || []).entries()) {
      if (layer.libraryAssetId) throw new Error('Shop packages support your own uploaded artwork only.');
      if (layer.type === 'image' && layer.src) {
        if (!/^data:image\/(png|jpeg|webp);base64,/.test(layer.src)) throw new Error('Upload the original artwork from your device.');
        const response = await fetch(layer.src);
        entries.push({name:`originals/${safeArtworkName(zone)}-${i}-${safeArtworkName(layer.filename || 'artwork.png')}`,data:await response.blob()});
      }
    }
  }
  const estimate = requestEstimate(shop,s);
  entries.push({name:'order-request.json',data:JSON.stringify({shop:shop.name,...s,estimate,status:'design-only-unpaid'},null,2)});
  entries.push({name:'READ-ME.txt',data:'Saved design — not a paid order.\nKeep this ZIP to reopen the design using Load saved design on the same shop page.\nOriginal artwork and a mockup are included. The shop must verify print quality, placement and production preparation. Prices and availability may change.\n'});
  return { blob:await makeZip(entries), summary:s };
}
async function savePackage() {
  if (sending) return;
  const button = $('saveDraft'); button.disabled = true;
  try { say('Preparing your design package…'); const {blob}=await buildPackage(); download(blob,`${shop.slug}-${engine}-design.zip`); say('Design saved to your device. Keep the ZIP to reopen it later. This is not an order or payment.'); }
  catch(error) { say(error.message); } finally { button.disabled = false; }
}
async function loadPackage(file) {
  if (!file || file.size > 32*1024*1024) throw new Error('Choose a saved design ZIP under 32 MB.');
  const zip = await window.JSZip.loadAsync(file), entries = Object.values(zip.files).filter(f=>!f.dir);
  if (entries.length > 60 || entries.some(f=>f.name.includes('..') || f.name.startsWith('/')) || entries.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0) > 64*1024*1024) throw new Error('This saved design package is too large or invalid.');
  const entry=zip.file('design.json'); if (!entry) throw new Error('The ZIP does not contain a saved design.');
  if ((entry._data?.uncompressedSize || 0) > 24*1024*1024) throw new Error('Saved design is too large.');
  const saved=JSON.parse(await entry.async('string'));
  if(saved.schema!=='mqd-shop-design-v1'||saved.engine!==engine||saved.shop!==shop.slug) throw new Error('Open this design on its original shop and designer page.');
  if(engine==='2d') {
    const d=saved.draft;
    if(!PRODUCTS[d?.product]||!d.artwork||!Object.hasOwn(shop.pricing.baseCents,d.product)) throw new Error('This garment is unavailable.');
    d.photos={};
    for(const view of VIEWS) {
      const art=d.artwork[view]; if(!art)continue;
      const ref=saved.files?.[view];
      if(ref) { const entry=zip.file(ref.path); if(!entry||!['image/png','image/jpeg','image/webp'].includes(ref.type))throw new Error('Original artwork is missing or invalid.'); art.file=new File([await entry.async('uint8array')],safeArtworkName(ref.name),{type:ref.type}); }
      if(d.product==='everyday-polo'&&view!=='front'){delete d.artwork[view];continue;}
      for(const layer of artworkLayers(art)) layer.data.placement=(layer.kind==='image'?constrainImagePlacement:constrainPlacement)(layer.data.placement,zoneFor(d,view));
    }
    shopOrderSheet(d); await window.MQDShopEveryday.loadDraft(d);
  } else {
    const d=saved.design;
    if(!Object.hasOwn(shop.pricing.premiumCents,d?.product?.id)||!d.design?.zones)throw new Error('This garment is unavailable.');
    for(const state of Object.values(d.design.zones)) for(const layer of state.layers || []) {
      if(layer.libraryAssetId || (layer.type==='image'&&!/^data:image\/(png|jpeg|webp);base64,/.test(layer.src||''))) throw new Error('Saved packages must contain original uploaded artwork.');
    }
    await window.MQDDesigner.loadDesign(d,{notify:false});
  }
  const requestEntry=zip.file('order-request.json');
  if(requestEntry) {
    const request=JSON.parse(await requestEntry.async('string'));
    requestEstimate(shop,request);
    if(engine==='3d'){$('shopPrintMethod').value=request.printMethod;syncRequestOptions();if(request.color)$('shopGarmentColor').value=request.color;}
    $('shopSizes').replaceChildren();
    for(const item of request.orderOptions.slice(engine==='2d'?1:0)) {addSize();const row=$('shopSizes').lastElementChild;row.querySelector('select').value=item.size;row.querySelector('input').value=item.quantity;}
  }
  cachedAttempt=null; refresh(); say('Saved design reopened. Review prices, sizes and placement before requesting an order.');
}
async function send(event) {
  event.preventDefault(); if(setupPreview){say('This is a setup preview. Customer requests are available after shop activation.');return;} if(sending || !$('shopForm').reportValidity())return;
  sending=true;refresh();say('Preparing your order request…');
  const controls=[...document.querySelectorAll('button,input,select,textarea')], disabled=controls.map(c=>c.disabled);controls.forEach(c=>c.disabled=true);
  try {
    const customer={name:$('shopName').value.trim(),email:$('shopEmail').value.trim(),phone:$('shopPhone').value.trim(),notes:$('shopNotes').value.trim()};
    if(!validPhone(customer.phone))throw new Error('Enter a valid phone number with 7 to 15 digits.');
    const current=engine==='2d'?getDraft():window.MQDDesigner.exportDesign();
    const fileDigests=[];
    if(engine==='2d')for(const v of VIEWS)if(current.artwork[v]?.file)fileDigests.push(await digest(await current.artwork[v].file.arrayBuffer()));
    const fingerprint=await digest(new TextEncoder().encode(JSON.stringify([current,summary(),customer,fileDigests])));
    if(!cachedAttempt||cachedAttempt.fingerprint!==fingerprint) {
      const packet=await buildPackage();
      if(packet.blob.size>MAX_REQUEST_BYTES)throw new Error('This package is over the 8 MB email limit. Save it to your device and contact the shop to arrange a larger file transfer.');
      cachedAttempt={...packet,fingerprint,id:crypto.randomUUID(),customer};
    }
    const attempt=cachedAttempt, form=new FormData();
    form.append('payload',JSON.stringify({shop:slug,requestId:attempt.id,summary:attempt.summary,customer:attempt.customer,website:$('shopWebsite').value,startedAt:Number($('shopStarted').value)}));
    form.append('package',attempt.blob,`${slug}-${engine}-design.zip`);
    const response=await fetch(API,{method:'POST',headers:{apikey:KEY},body:form}),result=await response.json();
    if(!response.ok)throw new Error(result.error||'Request could not be sent. Your design is still here; please retry.');
    say(`Request ${result.reference} accepted by the email service for ${shop.name}. No payment was collected. The shop will contact you to confirm the final quote.`);
  }catch(error){say(error.message);}finally{controls.forEach((c,i)=>c.disabled=disabled[i]);sending=false;refresh();}
}
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function mount() {
  document.title=`${shop.name} · ${engine.toUpperCase()} shirt designer`;
  $('shopBrand').textContent=shop.name;$('shopLogo').src=shop.logo;$('shopLogo').alt=shop.name;
  $('shopSwitch').href=`/shops/${slug}${engine==='2d'?'/3d':''}`;$('shopSwitch').textContent=engine==='2d'?'Try 3D designer':'Use 2D designer';
  $('shopSwitch').hidden=!shop.engines.includes(engine==='2d'?'3d':'2d');
  document.querySelector('.shop-intro > strong').textContent=shop.pilot?'Print-shop pilot · sample prices · no checkout':'Shop order requests · final quote confirmed by the business';
  $('shopDescription').textContent=[shop.tagline,shop.requirements].filter(Boolean).join(' · ');
  if(setupPreview){
    $('shopSwitch').href+='?setupPreview=1';
    const note=document.createElement('p');note.textContent='BUSINESS SETUP PREVIEW · Not a live shop. Customer requests and payments are disabled.';note.className='setup-note';
    const back=document.createElement('a');back.href='/print-shop-setup.html';back.textContent='Return to business setup';note.append(' ',back);
    document.querySelector('.shop-intro').prepend(note);
    $('shopSend').textContent='Send order request — available after activation';
    const test=document.createElement('a');test.href='/shops/pilot';test.textContent='Use the pilot shop to send a test email request';note.append(' · ',test);
    $('shopStatus').textContent='Review branding, print options and estimates. Return to setup to make changes or download your setup file.';
  }
  $('shopPhone').oninput=()=>{$('shopPhone').setCustomValidity(!$('shopPhone').value||validPhone($('shopPhone').value)?'':'Enter a phone number with 7 to 15 digits.');};
  $('shopForm').onsubmit=send;$('shopAddSize').onclick=()=>{addSize();refresh();};
  $('shopStarted').value=Date.now();
  $('shopLoad').onchange=async event=>{try{await loadPackage(event.target.files[0]);}catch(error){say(error.message);}finally{event.target.value='';}};
  $('saveDraft').onclick=savePackage;
  const methodSelect=$(engine==='2d'?'printMethod':'shopPrintMethod');
  methodSelect.replaceChildren();
  const offeredMethods=engine==='3d'?shop.printMethods3d || shop.printMethods:shop.printMethods;
  for(const [id,label] of Object.entries(offeredMethods || {}))methodSelect.add(new Option(`${label}${methodNeedsQuote(shop,engine,id)?' — shop quote required':''}`,id));
  if(engine==='3d')addSize();
  document.addEventListener('change',refresh);
  window.addEventListener('mqd:shop-design-change',()=>{ if(window.MQDDesigner)refresh(); });
}
try {
  if(setupPreview){
    const packet=JSON.parse(sessionStorage.getItem('mqd-business-setup-preview-v1')||'null');
    if(packet?.schema!=='mqd-business-setup-v1'||!packet.shop?.engines?.includes(engine))throw new Error('Complete business setup before opening this preview.');
    shop=packet.shop;
  }else{
    const response=await fetch(`${API}?shop=${encodeURIComponent(slug)}`,{headers:{apikey:KEY}}),result=await response.json();
    if(!response.ok || !result.shop?.engines?.includes(engine))throw new Error('This shop page is not available.');
    shop=result.shop;
  }
  window.MQDPrintShop=shop;window.MQDShopConnect=connectShopEveryday;mount();
  if(engine==='2d')await import('./shop-everyday.js');
  else {await import('./shop-editor.js');await import('./mobile-workspace.js');refresh();$('productSelect').addEventListener('change',()=>setTimeout(refresh,0));}
  document.body.dataset.ready='true';
} catch(error) {
  $('shopSend').disabled=true;say(`The test designer could not start: ${error.message}. Refresh to try again.`);
}
