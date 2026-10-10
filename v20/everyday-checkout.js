import { printArtwork } from './everyday-layers.js';
import { everydayClient } from './everyday-account.js';
import { VIEWS, PRINT_METHODS, orderSheet } from './everyday-contract.js';
import { PRODUCTS, drawPreview } from './everyday-preview-renderer.js';
import { EVERYDAY_RUNTIME } from './everyday-runtime.js';

const SUPABASE_URL = 'https://gsxuhpffgdffsqksrkrf.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const SUBMIT_URL = SUPABASE_URL + '/functions/v1/' + EVERYDAY_RUNTIME.submitSlug;
const TEST_MODE = () => EVERYDAY_RUNTIME.testOnly || new URLSearchParams(location.search).get('mqdStripeTest') === '1';
const money = cents => '$' + (cents / 100).toFixed(2);
export function draftQuote(draft, pricing) {
  const locations = VIEWS.filter(v => draft.artwork[v]);
  const baseCents = pricing.baseCents[draft.product];
  const sizeCents = ['2XL', '3XL', '4XL'].includes(draft.size) ? pricing.sizeSurchargeCents : 0;
  const printMethod = draft.printMethod === undefined ? 'transfer' : draft.printMethod;
  if (!Object.hasOwn(PRINT_METHODS, printMethod)) throw new Error('Choose an approved print method.');
  const methodCents = pricing.methodCents?.[printMethod] ?? (printMethod === 'transfer' ? 0 : undefined);
  const backCents = pricing.methodBackCents?.[printMethod] ?? (printMethod === 'transfer' ? pricing.printCents.back : undefined);
  if (!Number.isSafeInteger(methodCents) || !Number.isSafeInteger(backCents)) throw new Error('Print method prices are awaiting setup.');
  const printCents = locations.reduce((total, v) => total + (v === 'back' ? backCents : pricing.printCents[v]), 0) + (locations.some(v => v === 'left' || v === 'right') ? pricing.sleeveCents : 0);
  return { baseCents, sizeCents, printCents, methodCents, printMethod, printMethodLabel: PRINT_METHODS[printMethod], unitCents: baseCents + sizeCents + printCents + methodCents, version: pricing.version, currency: 'usd', locations };
}
export function cartDestination(test = false) { return '/?everydayPreview=1&openCart=1' + (test ? '&mqdStripeTest=1' : ''); }
export async function buildEverydaySubmission(draft, pricing, { makeCanvas = () => document.createElement('canvas'), render = drawPreview, test = false, submissionToken = crypto.randomUUID() } = {}) {
  if (!Object.values(draft.artwork).length) throw new Error('Upload artwork to at least one print area.');
  if (!Number.isInteger(draft.quantity) || draft.quantity < 1 || draft.quantity > 99) throw new Error('Each cart quantity must be from 1 to 99.');
  const sheet = orderSheet(draft); delete sheet.status;
  const quote = draftQuote(draft, pricing), form = new FormData();
  const payload = { schemaVersion: 1, submissionToken, range: 'everyday', product: { id: draft.product, name: PRODUCTS[draft.product].name }, quote, everyday: sheet, orderOptions: [{ size: draft.size, quantity: draft.quantity }], totalQuantity: draft.quantity, mqdSandboxTest: test };
  form.append('payload', JSON.stringify(payload));
  for (const view of VIEWS) {
    const canvas = makeCanvas(); canvas.width = 800; canvas.height = 900;
    await render(canvas, draft, view);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('A garment preview could not export.')), 'image/png'));
    form.append('asset', blob, `${view}.png`); form.append('assetMeta', JSON.stringify({ zone: view, kind: 'mockup-view' }));
    const art = draft.artwork[view];
    if (art) { const file = await printArtwork(art, view, { makeCanvas }); form.append('asset', file, file.name || art.name); form.append('assetMeta', JSON.stringify({ zone: view, kind: 'original-source' })); if (art.texts?.length && art.file) { form.append('asset', art.file, art.name); form.append('assetMeta', JSON.stringify({ zone: view, kind: 'upload-source' })); } }
  }
  return { form, payload };
}
export async function submissionFingerprint(draft, pricing, test = false) {
  const hex = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(x => x.toString(16).padStart(2,'0')).join('');
  const hashes = [];
  for (const view of VIEWS) if (draft.artwork[view]?.file) hashes.push([view, await hex(await draft.artwork[view].file.arrayBuffer())]);
  return hex(new TextEncoder().encode(JSON.stringify([orderSheet(draft), draftQuote(draft,pricing), test, hashes])));
}
export function appendEverydayCart(storage, draft, result, test = false) {
  if (!/^MQD-[A-Z0-9]{6,20}$/.test(result?.orderNumber || '') || !Number.isSafeInteger(result?.quote?.unitCents) || result.quote.unitCents < 50 || result.test !== test) throw new Error('The order confirmation was incomplete. Please try again.');
  let items;
  try { items = JSON.parse(storage.getItem('mqd-cart') || '[]'); } catch { throw new Error('Your existing cart could not be read. Please open it before adding this item.'); }
  if (!Array.isArray(items)) throw new Error('Your existing cart could not be read.');
  if (items.some(item => (item.sandboxTest === true) !== test)) throw new Error('Regular and sandbox items need separate carts. Open your cart to review its items.');
  if (!items.some(item => item.orderNumber === result.orderNumber)) items.push({ designId: null, range: 'everyday', orderNumber: result.orderNumber, productId: draft.product, productName: `${result.productName} · ${draft.color}`, color: draft.color, price: result.quote.unitCents / 100, pricingVersion: result.quote.version, orderOptions: [{ size: draft.size, quantity: draft.quantity }], totalQuantity: draft.quantity, addedAt: new Date().toISOString(), pendingSync: false, guest: result.guest === true, sandboxTest: test, draftKey: null, backendError: '' });
  storage.setItem('mqd-cart', JSON.stringify(items)); storage.removeItem('mqd-checkout-request');
  return items;
}
export function connectEverydayCheckout({ getDraft, saveDraft, status }, dependencies = {}) {
  const button = document.getElementById('addEverydayToCart'), price = document.getElementById('everydayPrice'), cart = document.getElementById('everydayCart');
  if (!button || !price || !cart) return { refresh() {} };
  const message = document.getElementById('everydayCheckoutMessage'), signIn = document.getElementById('everydayTestSignIn'), headerCart = document.getElementById('everydayHeaderCart');
  const request = dependencies.fetch || fetch, storage = dependencies.storage || localStorage;
  const navigate = dependencies.navigate || (url => location.assign(url));
  const loadClient = dependencies.loadClient || everydayClient;
  let pricing = null, adding = false, sdk;
  function feedback(text, error = false) {
    status(text);
    if (message) { message.textContent = text; message.hidden = false; message.dataset.error = String(error); }
  }
  if (TEST_MODE()) {
    feedback('Sandbox checkout requires owner sign-in. Uploading artwork and downloading a draft ZIP work without signing in.');
    if (signIn) signIn.hidden = false;
  }
  if (signIn) signIn.onclick = async event => {
    event.preventDefault();
    try { getDraft(); await saveDraft(); navigate(signIn.href); }
    catch (error) { feedback(`Could not save your design before sign-in: ${error.message}`, true); }
  };
  const refresh = () => {
    cart.href = cartDestination(TEST_MODE());
    if (headerCart) {
      headerCart.href = cart.href;
      try { const items = JSON.parse(storage.getItem('mqd-cart') || '[]'); headerCart.textContent = `Cart (${Array.isArray(items) ? items.reduce((n, item) => n + (Number(item.totalQuantity) || 1), 0) : 0})`; }
      catch { headerCart.textContent = 'View cart'; }
    }
    button.textContent = adding ? 'Adding design…' : 'Add to cart';
    button.disabled = adding || !pricing;
    if (pricing) {
      try {
        const draft = getDraft(), quote = draftQuote(draft, pricing);
        price.textContent = `${money(quote.unitCents)} each · ${money(quote.unitCents * draft.quantity)} before shipping · ${quote.printMethodLabel}${quote.methodCents ? ` (+${money(quote.methodCents)} per garment)` : ''}${quote.sizeCents ? ` · Includes ${money(quote.sizeCents)} size charge per garment` : ''}`;
        const summary = document.getElementById('everydayPrintSummary');
        if (summary) summary.textContent = `Everyday Custom · ${quote.printMethodLabel} · Front print included in shown price · Back +${money(pricing.methodBackCents?.[quote.printMethod] ?? pricing.printCents.back)} · One or both sleeves +${money(pricing.sleeveCents)} total`;
        button.disabled = adding || !quote.locations.length;
      } catch { button.disabled = true; price.textContent = 'Enter a valid quantity to see your total.'; }
    }
  };
  async function loadPricing() {
    try {
      const response = await request(SUBMIT_URL, { headers: { apikey: PUBLISHABLE_KEY } }), result = await response.json();
      if (!response.ok || !result.pricing) throw new Error(result.error || 'Everyday checkout is awaiting setup.');
      pricing = result.pricing; refresh();
    } catch { pricing = null; button.disabled = true; price.textContent = 'Everyday checkout is awaiting setup. You can still save a draft on this device.'; }
  }
  button.onclick = async () => {
    if (adding || !pricing) return;
    adding = true; refresh();
    const controls = [...document.querySelectorAll('button,input,select,textarea')].filter(node => node !== button), states = controls.map(node => node.disabled);
    controls.forEach(node => node.disabled = true);
    try {
      const snapshot = structuredClone(getDraft()), test = TEST_MODE();
      // Check cart compatibility before creating any order or uploading files.
      const existing = JSON.parse(storage.getItem('mqd-cart') || '[]');
      if (!Array.isArray(existing)) throw new Error('Your existing cart could not be read.');
      if (existing.length >= 20) throw new Error('Your cart can contain at most 20 designs.');
      if (existing.some(item => (item.sandboxTest === true) !== test)) throw new Error('Regular and sandbox items need separate carts.');
      if (Object.keys(snapshot.photos).length) throw new Error('Development photos cannot be ordered. Choose standard garment previews in Development photo setup.');
      await saveDraft();
      feedback('Preparing your design for the cart…');
      sdk ||= Promise.resolve().then(loadClient).catch(error => { sdk = null; throw error; });
      const client = await sdk, { data, error } = await client.auth.getSession();
      if (error) throw error;
      const session = data.session;
      if (test && session?.user?.app_metadata?.role !== 'admin') throw new Error('Your design is saved on this device. Sign in for test checkout using your owner account, then click Add to cart again. No item has been added yet.');
      if (signIn) signIn.hidden = true;
      let guestToken = storage.getItem('mqd-guest-order-token');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(guestToken || '')) { guestToken = crypto.randomUUID(); storage.setItem('mqd-guest-order-token', guestToken); }
      const signature = await submissionFingerprint(snapshot, pricing, test);
      let pending;
      try { pending = JSON.parse(storage.getItem('mqd-everyday-pending') || '{}'); } catch { pending = {}; }
      if (pending.signature !== signature || !/^[0-9a-f-]{36}$/i.test(pending.token || '')) { pending = { signature, token: crypto.randomUUID() }; storage.setItem('mqd-everyday-pending', JSON.stringify(pending)); }
      const { form } = await buildEverydaySubmission(snapshot, pricing, { test, submissionToken: pending.token }); form.append('guestToken', guestToken);
      const headers = { apikey: PUBLISHABLE_KEY }; if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      feedback('Saving your design and original files…');
      const response = await request(SUBMIT_URL, { method: 'POST', headers, body: form, signal: AbortSignal.timeout(180000) }), result = await response.json();
      if (!response.ok || !result.ok) { if (response.status === 409) await loadPricing(); if (response.status !== 409) storage.removeItem('mqd-everyday-pending'); throw new Error(result.error || 'Your order could not be saved.'); }
      appendEverydayCart(storage, snapshot, result, test);
      storage.removeItem('mqd-everyday-pending');
      feedback('Design added. Opening your cart…');
      navigate(cartDestination(test));
    } catch (error) {
      feedback(`Could not add this design: ${error.message} Your design remains in this editor.`, true);
      if (signIn && TEST_MODE()) signIn.hidden = false;
      message?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
    finally { adding = false; controls.forEach((node, i) => node.disabled = states[i]); refresh(); }
  };
  button.disabled = true; void loadPricing();
  return { refresh };
}
