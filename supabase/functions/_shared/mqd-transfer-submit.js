import { boundedFormData, validateGuestFiles, consumeBudget, UploadError } from './mqd-upload-guard.js';
import { TRANSFERS, transferLayout } from './mqd-transfers.js';

const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hexDigest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
const checked = result => { if (result.error) throw Object.assign(new Error(result.error.message), { code: result.error.code }); return result.data; };
const layoutFingerprint = layout => JSON.stringify(layout?.sheets?.map(sheet => sheet.layers.map(({source,x,y,width,height,crop}) => [
  source,x,y,width,height,crop?.left||0,crop?.top||0,crop?.right||0,crop?.bottom||0
])));
const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

async function validHeader(file) {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (file.type === 'image/png') return [137,80,78,71,13,10,26,10].every((value,i) => bytes[i] === value);
  if (file.type === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
}

export function transferHandler({ createClient, env }) {
  return async request => {
    const origin = request.headers.get('origin') || '';
    const allowed = ['https://mymerchnow.app','https://www.mymerchnow.app'].includes(origin) || /^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);
    const headers = { 'Access-Control-Allow-Origin': allowed ? origin : 'https://mymerchnow.app', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Origin' };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const enabled = env('MQD_TRANSFERS_ENABLED') ?? 'true';
    if (enabled !== 'true') return json({ error: 'Transfer ordering is unavailable.' }, 503);
    if (request.method === 'GET') return json({ enabled: true });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    let client, orderId;
    const paths = [];
    try {
      const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SECRET_KEY');
      if (!key || !env('SUPABASE_URL')) return json({ error: 'Transfer ordering is unavailable.' }, 503);
      client = createClient(env('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false } });
      await consumeBudget(client, 'transfer-request-global', 500);
      const form = await boundedFormData(request);
      const guestToken = String(form.get('guestToken') || '');
      const raw = String(form.get('payload') || '');
      if (!isUuid(guestToken)) return json({ error: 'Refresh to restart your cart session.' }, 401);
      if (raw.length > 100000) return json({ error: 'The layout is too large.' }, 400);
      let payload, layout;
      try { payload = JSON.parse(raw); layout = transferLayout(payload); } catch (error) { return json({ error: error instanceof SyntaxError ? 'Invalid design layout.' : error.message }, 400); }
      const id = payload.submissionToken;
      if (!isUuid(id)) return json({ error: 'Invalid upload request.' }, 400);
      const guestHash = await hexDigest(new TextEncoder().encode(guestToken));
      const auth = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      let user = null;
      if (auth) {
        const result = await client.auth.getUser(auth);
        if (!result.error) user = result.data?.user || null;
      }
      const sandbox = payload.sandbox === true;
      if (sandbox && user?.app_metadata?.role !== 'admin') return json({ error: 'Owner sign-in is required for sandbox orders.' }, 403);
      if (!sandbox && env('MQD_TRANSFERS_SANDBOX_ONLY') === 'true') return json({ error: 'This environment accepts sandbox orders only.' }, 403);
      const bytes = validateGuestFiles(form);
      const files = form.getAll('asset');
      if (files.length !== layout.fileCount || form.has('mockup')) return json({ error: 'Artwork and layout do not match.' }, 400);
      await consumeBudget(client, 'transfer-token-' + guestHash, 100, bytes, 2 * 1024 ** 3);
      await consumeBudget(client, 'transfer-bytes-global', 500, bytes);
      const sources = [];
      for (const [index, file] of files.entries()) {
        if (!await validHeader(file)) return json({ error: 'An artwork file does not match its image format.' }, 400);
        const source = index + 1;
        sources.push({ source, filename: 'artwork-' + source + '.' + extension[file.type], originalFilename: file.name.slice(0, 180), sha256: await hexDigest(await file.arrayBuffer()) });
      }
      const catalog = TRANSFERS[layout.sku], price = catalog.cents / 100;
      const name = catalog.name + ' • ' + layout.inches + ' × ' + layout.inches + ' in';
      const transfers = { ...layout, sources, origin: 'top-left', layerOrder: 'bottom-to-top' };
      const orderOptions = [];
      const design = { schemaVersion: 1, range: 'transfers', product: { id: layout.sku, name, price }, productionReady: false, transfers, orderOptions, totalQuantity: layout.sheets.length };
      const prior = checked(await client.from('mqd_orders').select('id,order_number,status,guest_checkout_token_hash,user_id,is_test,design_json').eq('id', id).maybeSingle());
      const google = user?.app_metadata?.provider === 'google' || user?.app_metadata?.providers?.includes('google');
      const account = !sandbox && google ? user : null;
      const result = order => ({ orderNumber: order.order_number, orderId: order.id, productName: name, productId: layout.sku, quantity: layout.sheets.length, price, sandboxTest: sandbox });
      if (prior) {
        if (prior.guest_checkout_token_hash !== guestHash || prior.user_id !== (account?.id || null) || Boolean(prior.is_test) !== sandbox) return json({ error: 'This upload belongs to another session.' }, 403);
        if (prior.status !== 'submitted' || prior.design_json?.productionReady !== true || JSON.stringify(prior.design_json.transfers?.sources?.map(s => s.sha256)) !== JSON.stringify(sources.map(s => s.sha256)) || layoutFingerprint(prior.design_json.transfers) !== layoutFingerprint(layout) || prior.design_json.transfers?.sku !== layout.sku) return json({ error: 'This upload cannot be reused. Try adding the design again.' }, 409);
        return json(result(prior));
      }
      const order = checked(await client.from('mqd_orders').insert({ id, user_id: account?.id || null, customer_email: account?.email || null, guest_checkout_token_hash: guestHash, is_test: sandbox, status: 'draft', product_id: layout.sku, product_name: name, product_price: price, engine_calibration: 'transfers-2d-v1', design_json: design, background_colors: {} }).select('id,order_number').single());
      orderId = order.id;
      checked(await client.from('mqd_order_items').insert({ order_id: order.id, product_id: layout.sku, product_name: name, unit_price: price, quantity: layout.sheets.length, order_options: orderOptions }));
      const bucket = client.storage.from('mqd-production');
      for (const [sheetIndex, sheet] of layout.sheets.entries()) {
        const zone = 'sheet-' + (sheetIndex + 1);
        for (const layer of sheet.layers) {
          const source = sources[layer.source - 1], file = files[layer.source - 1];
          const path = order.id + '/transfers/' + zone + '/' + source.filename;
          checked(await bucket.upload(path, file, { contentType: file.type, upsert: false }));
          paths.push(path);
          checked(await client.from('mqd_order_assets').insert({ order_id: order.id, zone_name: zone, layer_id: String(layer.source), layer_type: 'image', original_filename: source.filename, storage_path: path, mime_type: file.type, metadata: { ...layer, ...source, units: 'inches' } }));
        }
      }
      checked(await client.from('mqd_orders').update({ status: 'submitted', design_json: { ...design, productionReady: true } }).eq('id', order.id));
      return json(result(order));
    } catch (error) {
      if (orderId) {
        await client.from('mqd_orders').update({ status: 'cancelled' }).eq('id', orderId).then(() => {}, () => {});
        if (paths.length) await client.storage.from('mqd-production').remove(paths).then(() => {}, () => {});
      }
      if (error instanceof UploadError) return json({ error: error.message }, error.status);
      if (error.code === '23505') return json({ error: 'This transfer is still being added. Try again shortly.' }, 409);
      console.error('Transfer submission failed', error);
      return json({ error: 'The artwork could not be saved. Try adding your design again.' }, 500);
    }
  };
}
