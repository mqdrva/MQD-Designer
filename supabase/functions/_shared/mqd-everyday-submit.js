import { boundedFormData, validateGuestFiles, consumeBudget, UploadError } from './mqd-upload-guard.js';
import { EVERYDAY_VIEWS, EVERYDAY_CATALOG, everydayPricing, everydayQuote, everydayZone, validateEveryday, EverydayError } from './mqd-everyday.js';

const safe = name => name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 160);
const uuid = token => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(x => x.toString(16).padStart(2, '0')).join('');
const check = result => { if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code }); return result.data; };
export async function validateEverydayFiles(form, sheet) {
  const bytes = validateGuestFiles(form), files = form.getAll('asset'), metadata = form.getAll('assetMeta').map(raw => JSON.parse(String(raw)));
  if (form.get('mockup')) throw new EverydayError('Everyday uses four separate previews.');
  if (files.length < 5 || files.length > 8) throw new EverydayError('Everyday files are incomplete.');
  const keys = new Set();
  for (let i = 0; i < files.length; i++) {
    const file = files[i], meta = metadata[i];
    if (!EVERYDAY_VIEWS.includes(meta?.zone) || !['mockup-view', 'original-source'].includes(meta?.kind) || keys.has(`${meta.zone}:${meta.kind}`)) throw new EverydayError('Invalid or duplicated Everyday file.');
    keys.add(`${meta.zone}:${meta.kind}`);
    if (meta.kind === 'mockup-view' && file.type !== 'image/png') throw new EverydayError('Everyday previews must be PNG images.');
    if (meta.kind === 'original-source' && (sheet.locations[meta.zone].status === 'No print' || sheet.locations[meta.zone].filename !== file.name)) throw new EverydayError('Original artwork does not match its print area.');
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const valid = file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((v,j) => header[j] === v)
      : file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
      : String.fromCharCode(...header.slice(0,4)) === 'RIFF' && String.fromCharCode(...header.slice(8,12)) === 'WEBP';
    if (!valid) throw new EverydayError('An artwork file does not match its image type.');
  }
  for (const view of EVERYDAY_VIEWS) if (!keys.has(`${view}:mockup-view`) || (sheet.locations[view].status !== 'No print' && !keys.has(`${view}:original-source`))) throw new EverydayError('A preview or original artwork file is missing.');
  return { bytes, files, metadata };
}
export function everydayHandler({ createClient, env, testOnly = false }) {
  return async req => {
    const origin = req.headers.get('origin') || '';
    const allowed = origin === 'https://mymerchnow.app' || origin === 'https://www.mymerchnow.app' || /^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
    const headers = { 'Access-Control-Allow-Origin': allowed ? origin : 'https://mymerchnow.app', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (req.method === 'OPTIONS') return new Response('ok', { headers });
    let orderId = null, supabase = null;
    const uploadedPaths = [];
    try {
      if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not allowed' }, 405);
      const config = everydayPricing(env('MQD_EVERYDAY_PRICING'));
      if (req.method === 'GET') return json({ ok: true, pricing: config });
      const url = env('SUPABASE_URL'), key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
      if (!url || !key) return json({ error: 'Backend service credentials are not configured' }, 503);
      supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      await consumeBudget(supabase, 'everyday-requests-global', 500);
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      let user = null;
      if (token) {
        const result = await supabase.auth.getUser(token);
        if (result.error || !result.data?.user) throw new EverydayError('Your sign-in session expired. Refresh before adding this item.', 401);
        user = result.data.user;
      }
      const form = await boundedFormData(req), raw = String(form.get('payload') || '');
      if (!raw || raw.length > 100000) throw new EverydayError('Invalid Everyday design payload.');
      let payload;
      try { payload = JSON.parse(raw); } catch { throw new EverydayError('Invalid Everyday design payload.'); }
      if (!uuid(payload.submissionToken || '')) throw new EverydayError('Invalid Everyday upload request.');
      const sheet = validateEveryday(payload), quote = everydayQuote(payload, config);
      if (payload.quote?.version !== quote.version || payload.quote?.unitCents !== quote.unitCents) throw new EverydayError('The price changed. Review the updated price and try again.', 409);
      const guestToken = String(form.get('guestToken') || '');
      if (!uuid(guestToken)) throw new EverydayError('Guest checkout session is invalid. Refresh and try again.', 401);
      const guestHash = await hash(guestToken), sandbox = payload.mqdSandboxTest === true;
      if (testOnly && !sandbox) throw new EverydayError('This preview only accepts sandbox test orders.', 403);
      if (sandbox && user?.app_metadata?.role !== 'admin') throw new EverydayError('Owner sign-in is required for sandbox orders.', 403);
      const google = (user?.app_metadata?.providers || []).includes('google') || user?.app_metadata?.provider === 'google';
      const account = !sandbox && google ? user : null;
      const { bytes, files, metadata } = await validateEverydayFiles(form, sheet);
      await consumeBudget(supabase, 'everyday-token-' + guestHash, 100, bytes, 2 * 1024 * 1024 * 1024);
      await consumeBudget(supabase, 'everyday-bytes-global', 500, bytes);
      // Canonical metadata excludes arbitrary client fields and garment background colors.
      const originalHashes = {};
      for (let i = 0; i < files.length; i++) if (metadata[i].kind === 'original-source') originalHashes[metadata[i].zone] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await files[i].arrayBuffer()))).map(x => x.toString(16).padStart(2,'0')).join('');
      const saved = { schemaVersion: 1, range: 'everyday', productionReady: false, product: { id: sheet.product, name: EVERYDAY_CATALOG[sheet.product].name, price: quote.unitCents / 100 }, quote, originalHashes, everyday: { schemaVersion: 1, range: 'everyday', product: sheet.product, blankStyle: EVERYDAY_CATALOG[sheet.product].blankStyle, color: sheet.color, size: sheet.size, quantity: sheet.quantity, units: 'inches', locations: Object.fromEntries(EVERYDAY_VIEWS.map(v => [v, sheet.locations[v].status === 'No print' ? { status: 'No print' } : { zone: v === 'front' && sheet.product === 'everyday-polo' ? 'Wearer left chest' : ({ front: 'Front', back: 'Back', left: 'Left sleeve', right: 'Right sleeve' })[v], bounds: everydayZone(sheet.product, sheet.size, v), filename: sheet.locations[v].filename, x: sheet.locations[v].x, y: sheet.locations[v].y, width: sheet.locations[v].width, height: sheet.locations[v].height }])) }, orderOptions: [{ size: sheet.size, quantity: sheet.quantity }], totalQuantity: sheet.quantity };
      const prior = check(await supabase.from('mqd_orders').select('id,order_number,status,user_id,guest_checkout_token_hash,is_test,design_json').eq('id', payload.submissionToken).maybeSingle());
      if (prior) {
        if (prior.guest_checkout_token_hash !== guestHash || prior.user_id !== (account?.id || null) || prior.is_test !== sandbox) throw new EverydayError('This upload request belongs to another session.', 403);
        if (!['draft', 'submitted'].includes(prior.status)) throw new EverydayError('This upload is no longer available. Add the design again to create a new order.', 410);
        if (prior.design_json?.productionReady !== true) throw new EverydayError('This upload is still processing. Please retry shortly.', 409);
        if (JSON.stringify(prior.design_json.everyday) !== JSON.stringify(saved.everyday) || JSON.stringify(prior.design_json.originalHashes) !== JSON.stringify(originalHashes) || prior.design_json.quote?.unitCents !== quote.unitCents || prior.design_json.quote?.version !== quote.version) throw new EverydayError('This upload request does not match the design.', 409);
        return json({ ok: true, orderId: prior.id, orderNumber: prior.order_number, quote, productName: saved.product.name, guest: !account, test: sandbox });
      }
      const order = check(await supabase.from('mqd_orders').insert({ id: payload.submissionToken, user_id: account?.id || null, design_id: null, guest_checkout_token_hash: guestHash, is_test: sandbox, status: 'draft', customer_email: account?.email || null, product_id: saved.product.id, product_name: saved.product.name, product_price: saved.product.price, engine_calibration: 'everyday-2d-v1', design_json: saved, background_colors: {} }).select('id,order_number').single());
      orderId = order.id;
      check(await supabase.from('mqd_order_items').insert({ order_id: order.id, design_id: null, product_id: saved.product.id, product_name: saved.product.name, unit_price: saved.product.price, quantity: sheet.quantity, order_options: saved.orderOptions }));
      let mockupPath = null;
      for (let i = 0; i < files.length; i++) {
        const file = files[i], meta = metadata[i], path = `${order.id}/${meta.kind}/${meta.zone}-${safe(file.name)}`;
        check(await supabase.storage.from('mqd-production').upload(path, file, { contentType: file.type, upsert: false }));
        uploadedPaths.push(path);
        if (meta.zone === 'front' && meta.kind === 'mockup-view') mockupPath = path;
        check(await supabase.from('mqd_order_assets').insert({ order_id: order.id, zone_name: meta.zone, layer_id: `${meta.zone}-${meta.kind}`, layer_type: meta.kind === 'mockup-view' ? 'mockup-view' : 'image', original_filename: file.name, storage_path: path, mime_type: file.type, background_hex: null, metadata: { range: 'everyday', zone: meta.zone, kind: meta.kind, units: 'inches', placement: saved.everyday.locations[meta.zone] } }));
      }
      saved.productionReady = true;
      check(await supabase.from('mqd_orders').update({ status: 'submitted', mockup_path: mockupPath, design_json: saved }).eq('id', order.id));
      return json({ ok: true, orderId: order.id, orderNumber: order.order_number, quote, productName: saved.product.name, guest: !account, test: sandbox });
    } catch (error) {
      if (orderId && supabase) {
        // A failed upload never becomes a purchasable Everyday item.
        await supabase.from('mqd_orders').update({ status: 'cancelled' }).eq('id', orderId).then(() => {}, () => {});
        if (uploadedPaths.length) await supabase.storage.from('mqd-production').remove(uploadedPaths).then(() => {}, () => {});
      }
      if (error instanceof EverydayError || error instanceof UploadError) return json({ error: error.message }, error.status);
      if (error.code === '23505' && !orderId) return json({ error: 'This upload is still processing. Please retry shortly.' }, 409);
      console.error('Everyday submission failed', error);
      return json({ error: 'The design upload could not finish. Your device draft is retained; please try again.' }, 500);
    }
  };
}
