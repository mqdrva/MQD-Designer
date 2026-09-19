import { boundedFormData, validateGuestFiles, consumeBudget, UploadError } from "../_shared/mqd-upload-guard.js";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SITE_ORIGIN = "https://mymerchnow.app";
const LEGACY_SITE_ORIGIN = "https://mqd-designer-vercel.vercel.app";
const allowedOrigin = (req: Request) => {
  const origin = req.headers.get("origin") || "";
  return origin === SITE_ORIGIN || origin === LEGACY_SITE_ORIGIN || /^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    ? origin
    : SITE_ORIGIN;
};
const cors = (req: Request) => ({
  "Access-Control-Allow-Origin": allowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin"
});
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const safe = (v: string) => v.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
const mimeFor = (blob: Blob, path: string) => blob.type && blob.type !== "application/octet-stream"
  ? blob.type
  : path.toLowerCase().endsWith(".jpg") || path.toLowerCase().endsWith(".jpeg")
    ? "image/jpeg"
    : path.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png";
function serviceKey() { return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || ""; }
function validGuestToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method === "GET") return json(req, { ok: true, service: "submit-mqd-guest-design", version: 2 });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "", key = serviceKey();
    if (!url || !key) return json(req, { error: "Backend service credentials are not configured" }, 500);
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    // Global cap remains effective even if an attacker rotates guest tokens or spoofs IP headers.
    await consumeBudget(supabase, 'guest-requests-global', 500);
    const ip = (req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown").split(",")[0].trim();
    await consumeBudget(supabase, 'guest-ip-' + await sha256Hex(ip), 100);
    const form = await boundedFormData(req);
    const uploadedBytes = validateGuestFiles(form);
    const guestToken = String(form.get("guestToken") || "").trim();
    if (!validGuestToken(guestToken)) return json(req, { error: "Guest checkout session is invalid. Refresh and try again." }, 401);
    const guestHash = await sha256Hex(guestToken);
    const raw = String(form.get("payload") || "");
    if (!raw || raw.length > 2_000_000) return json(req, { error: "Invalid design payload" }, 400);
    const payload = JSON.parse(raw), p = payload?.product;
    if (!p?.id || !p?.name || !payload?.design?.zones) return json(req, { error: "Incomplete design" }, 400);

    const zones = Object.entries<any>(payload.design.zones);
    if (zones.length > 12 || zones.some(([,state]) => !Array.isArray(state?.layers ?? []) || (state?.layers?.length || 0) > 100)) return json(req, { error: "Design contains too many zones or layers" }, 400);
    await consumeBudget(supabase, 'guest-token-' + guestHash, 100);
    const libraryJobs: Array<{ zone: string; layer: any; asset: any; placement: any }> = [];
    for (const [zone, state] of Object.entries<any>(payload.design.zones || {})) for (const layer of state?.layers || []) {
      if (layer?.type !== "image" || !layer?.libraryAssetId) continue;
      const { data: asset, error: assetLookupError } = await supabase.from("mqd_library_assets")
        .select("id,name,slug,category,master_path,placement_mode,active")
        .eq("id", String(layer.libraryAssetId)).eq("active", true).maybeSingle();
      if (assetLookupError) return json(req, { error: assetLookupError.message, stage: "library_asset_lookup" }, 500);
      if (!asset) return json(req, { error: `MQD library artwork is unavailable for ${zone}`, stage: "library_asset_lookup" }, 400);
      const { data: placement, error: placementError } = await supabase.from("mqd_library_asset_placements")
        .select("x,y,scale,rotation,flip_x,flip_y,crop")
        .eq("asset_id", asset.id).eq("product_id", String(p.id)).eq("zone_name", zone).maybeSingle();
      if (placementError) return json(req, { error: placementError.message, stage: "library_placement_lookup" }, 500);
      if (!placement) return json(req, { error: `MQD library artwork is not approved for ${p.name} · ${zone}`, stage: "library_placement_lookup" }, 400);
      if (asset.placement_mode === "locked") Object.assign(layer, {
        x: Number(placement.x), y: Number(placement.y), scale: Number(placement.scale), rotation: Number(placement.rotation),
        flipX: !!placement.flip_x, flipY: !!placement.flip_y, crop: placement.crop, libraryLocked: true
      });
      else layer.libraryLocked = false;
      delete layer.src; delete layer.storagePath;
      libraryJobs.push({ zone, layer, asset, placement });
      if (libraryJobs.length > 20) return json(req, { error: "Too many library artwork layers" }, 400);
    }

    // Reserve the largest allowed master for each library copy before writing anything.
    const reservedBytes = uploadedBytes + libraryJobs.length * 50 * 1024 * 1024;
    await consumeBudget(supabase, 'guest-bytes-global', 500, reservedBytes);
    await consumeBudget(supabase, 'guest-bytes-' + guestHash, 100, reservedBytes, 2 * 1024 * 1024 * 1024);
    const backgrounds: Record<string, string> = {};
    for (const [zone, state] of Object.entries<any>(payload.design.zones || {})) backgrounds[zone] = String(state?.background || "#FFFFFF").toUpperCase();
    const { data: order, error: orderErr } = await supabase.from("mqd_orders").insert({
      user_id: null,
      design_id: null,
      guest_checkout_token_hash: guestHash,
      is_test: payload?.mqdSandboxTest === true,
      status: "submitted",
      customer_email: null,
      product_id: String(p.id),
      product_name: String(p.name),
      product_price: Number(p.price) || null,
      engine_calibration: String(payload?.engine?.calibration || ""),
      design_json: payload,
      background_colors: backgrounds
    }).select("id,order_number").single();
    if (orderErr) return json(req, { error: orderErr.message, details: orderErr.details || null, code: orderErr.code || null, stage: "order_insert" }, 500);

    const orderOptions = Array.isArray(payload.orderOptions) ? payload.orderOptions : [];
    const quantity = Math.max(1, Number(payload.totalQuantity) || orderOptions.reduce((n: number, x: any) => n + (Number(x?.quantity) || 0), 0) || 1);
    const { error: itemErr } = await supabase.from("mqd_order_items").insert({
      order_id: order.id,
      design_id: null,
      product_id: String(p.id),
      product_name: String(p.name),
      unit_price: Number(p.price) || null,
      quantity,
      order_options: orderOptions
    });
    if (itemErr) return json(req, { error: itemErr.message, stage: "order_item_insert" }, 500);

    let mockupPath: string | null = null;
    const mockup = form.get("mockup");
    if (mockup instanceof File && mockup.size) {
      if (mockup.size > 12 * 1024 * 1024) return json(req, { error: "Mockup image is too large", stage: "mockup" }, 400);
      mockupPath = `${order.id}/mockup.png`;
      const { error } = await supabase.storage.from("mqd-production").upload(mockupPath, mockup, { contentType: "image/png", upsert: true });
      if (error) return json(req, { error: error.message, stage: "mockup_upload" }, 500);
      const { error: updateErr } = await supabase.from("mqd_orders").update({ mockup_path: mockupPath }).eq("id", order.id);
      if (updateErr) return json(req, { error: updateErr.message, stage: "order_update" }, 500);
    }

    const files = form.getAll("asset").filter((v) => v instanceof File) as File[];
    const metaRaw = form.getAll("assetMeta").map(String);
    for (let i = 0; i < files.length; i++) {
      const file = files[i], meta = JSON.parse(metaRaw[i] || "{}");
      if (file.size > 20 * 1024 * 1024) return json(req, { error: "Artwork file is too large", stage: "asset_validation" }, 400);
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return json(req, { error: `Unsupported artwork type: ${file.type || "unknown"}`, stage: "asset_validation" }, 400);
      const path = `${order.id}/${safe(String(meta.zone || "zone"))}/${String(i + 1).padStart(2, "0")}-${safe(file.name || "artwork")}`;
      const { error: upErr } = await supabase.storage.from("mqd-production").upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) return json(req, { error: upErr.message, stage: "asset_upload" }, 500);
      const { error: assetErr } = await supabase.from("mqd_order_assets").insert({
        order_id: order.id,
        zone_name: String(meta.zone || ""),
        layer_id: String(meta.layerId || ""),
        layer_type: meta.kind === "mockup-view" ? "mockup-view" : "image",
        original_filename: file.name,
        storage_path: path,
        mime_type: file.type,
        background_hex: backgrounds[String(meta.zone || "")] || null,
        metadata: meta
      });
      if (assetErr) return json(req, { error: assetErr.message, stage: "asset_insert" }, 500);
    }

    for (let i = 0; i < libraryJobs.length; i++) {
      const job = libraryJobs[i], { data: master, error: downloadError } = await supabase.storage.from("mqd-library-assets").download(job.asset.master_path);
      if (downloadError || !master) return json(req, { error: downloadError?.message || "MQD library master is unavailable", stage: "library_master_download" }, 500);
      if (master.size > 50 * 1024 * 1024) return json(req, { error: "MQD library master is too large", stage: "library_master_validation" }, 500);
      const filename = safe(job.asset.master_path.split("/").pop() || `${job.asset.slug}.png`);
      const path = `${order.id}/${safe(job.zone)}/library-${String(i + 1).padStart(2, "0")}-${filename}`;
      const contentType = mimeFor(master, job.asset.master_path);
      const { error: uploadError } = await supabase.storage.from("mqd-production").upload(path, master, { contentType, upsert: true });
      if (uploadError) return json(req, { error: uploadError.message, stage: "library_master_upload" }, 500);
      const metadata = { ...job.layer, libraryAssetId: job.asset.id, libraryAssetName: job.asset.name, libraryCategory: job.asset.category, source: "mqd-library" };
      delete metadata.src; delete metadata.image;
      const { error: recordError } = await supabase.from("mqd_order_assets").insert({
        order_id: order.id, zone_name: job.zone, layer_id: String(job.layer.id || ""), layer_type: "image",
        original_filename: filename, storage_path: path, mime_type: contentType, background_hex: backgrounds[job.zone] || null, metadata
      });
      if (recordError) return json(req, { error: recordError.message, stage: "library_asset_insert" }, 500);
    }

    for (const [zone, state] of Object.entries<any>(payload.design.zones || {})) for (const layer of state?.layers || []) {
      if (layer?.type !== "text") continue;
      const { error } = await supabase.from("mqd_order_assets").insert({
        order_id: order.id, zone_name: zone, layer_id: String(layer.id || ""), layer_type: "text",
        background_hex: backgrounds[zone] || null, metadata: layer
      });
      if (error) return json(req, { error: error.message, stage: "text_asset_insert" }, 500);
    }

    return json(req, { ok: true, designId: null, orderId: order.id, orderNumber: order.order_number, mockupPath });
  } catch (e) {
    if (e instanceof UploadError) return json(req, { error: e.message }, e.status);
    console.error(e);
    return json(req, { error: e instanceof Error ? e.message : String(e), stage: "unexpected" }, 500);
  }
});
