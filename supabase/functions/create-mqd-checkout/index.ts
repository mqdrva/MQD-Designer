import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@22.4.0";
import { shippingCentsForQuantity } from "../_shared/mqd-shipping.js";

const SITE_URL = "https://mymerchnow.app/";
const LEGACY_SITE_ORIGIN = "https://mqd-designer-vercel.vercel.app";
const STANDARD_SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
const SHORTS_SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];
const CATALOG = {
  "tshirt": { name: "All-Over Print T-Shirt", cents: 5000, sizes: STANDARD_SIZES },
  "long-sleeve-tshirt": { name: "Long Sleeve T-Shirt", cents: 6000, sizes: STANDARD_SIZES },
  "short-sleeve-polo": { name: "Short Sleeve Polo", cents: 6000, sizes: STANDARD_SIZES },
  "long-sleeve-polo": { name: "Long Sleeve Polo", cents: 7000, sizes: STANDARD_SIZES },
  "fleece-hoodie": { name: "Fleece Hoodie", cents: 9000, sizes: STANDARD_SIZES },
  "lightweight-jacket": { name: "Lightweight Jacket", cents: 9000, sizes: STANDARD_SIZES },
  "mask": { name: "Mask", cents: 2500, sizes: [] },
  "hood-mask-shirt": { name: "Long Sleeve Shirt With Hood And Built-In Mask", cents: 7000, sizes: STANDARD_SIZES },
  "shorts": { name: "Shorts", cents: 4000, sizes: SHORTS_SIZES },
  "sweat-pants": { name: "Sweat Pants", cents: 6000, sizes: STANDARD_SIZES },
  "hooded-long-sleeve": { name: "Long Sleeve Shirt With Hood", cents: 7000, sizes: STANDARD_SIZES },
  "hat": { name: "Hat", cents: 3500, sizes: [] }
};

const allowedOrigin = (req) => {
  const origin = req.headers.get("origin") || "";
  return origin === SITE_URL.slice(0, -1) || origin === LEGACY_SITE_ORIGIN || /^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    ? origin
    : SITE_URL.slice(0, -1);
};
const cors = (req) => ({
  "Access-Control-Allow-Origin": allowedOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});
const json = (req, body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" }
});
const serviceKey = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
function hasGoogleIdentity(user) {
  const providers = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers.map(String) : [];
  if (user?.app_metadata?.provider) providers.push(String(user.app_metadata.provider));
  return providers.includes("google");
}

async function stripeSecret(supabase) {
  const direct = Deno.env.get("MQD_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (direct) return direct;
  const { data, error } = await supabase.rpc("mqd_get_vault_secret", { secret_name: "mqd_stripe_secret_key" });
  if (error) throw new Error("Stripe checkout is not configured.");
  return String(data || "");
}

function normalizedOptions(row, catalog) {
  const options = Array.isArray(row?.order_options) ? row.order_options : [];
  const raw = options.length ? options : [{ size: null, quantity: row?.quantity }];
  const allowedSizes = new Set(catalog.sizes);
  const normalized = raw.map((option) => {
    const size = option?.size ? String(option.size).trim().toUpperCase() : null;
    const quantity = Number(option?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Each cart quantity must be between 1 and 99");
    if (catalog.sizes.length && (!size || !allowedSizes.has(size))) throw new Error(`Invalid size for ${catalog.name}`);
    if (!catalog.sizes.length && size) throw new Error(`${catalog.name} does not use sizes`);
    return { size, quantity };
  });
  const sizeKeys = normalized.map((option) => option.size || "no-size");
  if (new Set(sizeKeys).size !== sizeKeys.length) throw new Error(`Duplicate size rows for ${catalog.name}`);
  return normalized;
}

function integrationIdentifier(checkoutToken) {
  const hex = checkoutToken.replace(/-/g, "").toLowerCase();
  let suffix = "";
  for (let index = 0; index < 16 && suffix.length < 8; index += 2) {
    suffix += String.fromCharCode(97 + (Number.parseInt(hex.slice(index, index + 2), 16) % 26));
  }
  return `mqd-checkout-${suffix.padEnd(8, "a")}`;
}

function configuredSiteUrl() {
  const candidate = new URL(Deno.env.get("MQD_SITE_URL") || SITE_URL);
  const allowed = candidate.hostname === "mymerchnow.app" || candidate.hostname === "www.mymerchnow.app" || candidate.hostname.endsWith(".vercel.app");
  if (candidate.protocol !== "https:" || !allowed) throw new Error("Checkout return URL is not configured safely");
  candidate.pathname = "/";
  candidate.search = "";
  candidate.hash = "";
  return candidate.toString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  let stage = "authentication";
  const diagnosticId = crypto.randomUUID();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const key = serviceKey();
    if (!supabaseUrl || !key) return json(req, { error: "Backend service credentials are not configured" }, 500);

    const authorization = req.headers.get("authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json(req, { error: "Sign in is required" }, 401);
    const supabase = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json(req, { error: "Your sign-in session is invalid or expired" }, 401);
    if (!hasGoogleIdentity(user)) return json(req, { error: "Continue with Google is required for checkout." }, 403);

    const body = await req.json().catch(() => ({}));
    const orderNumbers = [...new Set((Array.isArray(body?.orderNumbers) ? body.orderNumbers : []).map((x) => String(x).trim()))];
    const checkoutToken = String(body?.checkoutToken || "").trim();
    if (!orderNumbers.length || orderNumbers.length > 20 || orderNumbers.some((x) => !/^MQD-[A-Z0-9]{6,20}$/.test(x))) {
      return json(req, { error: "The cart contains an invalid order reference" }, 400);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutToken)) return json(req, { error: "Invalid checkout request" }, 400);

    stage = "read-orders";
    const { data: orders, error: orderError } = await supabase
      .from("mqd_orders")
      .select("id,order_number,status,product_id,design_id,customer_email")
      .eq("user_id", user.id)
      .in("order_number", orderNumbers);
    if (orderError) throw orderError;
    if (!orders || orders.length !== orderNumbers.length) return json(req, { error: "One or more cart items could not be verified" }, 403);
    if (orders.some((order) => !["submitted", "draft"].includes(order.status))) {
      return json(req, { error: "One or more cart items can no longer be checked out" }, 409);
    }

    const orderIds = orders.map((order) => order.id);
    stage = "read-items";
    const { data: itemRows, error: itemError } = await supabase
      .from("mqd_order_items")
      .select("id,order_id,product_id,quantity,order_options")
      .in("order_id", orderIds);
    if (itemError) throw itemError;
    const itemsByOrder = new Map((itemRows || []).map((row) => [row.order_id, row]));
    if (orders.some((order) => !itemsByOrder.has(order.id))) return json(req, { error: "A cart item is missing its production details" }, 409);

    const lineItems = [];
    let totalQuantity = 0;
    for (const order of orders) {
      const catalog = CATALOG[order.product_id];
      if (!catalog) return json(req, { error: `Checkout is not configured for ${order.product_id}` }, 409);
      const item = itemsByOrder.get(order.id);
      if (item.product_id !== order.product_id) return json(req, { error: "A cart item failed product verification" }, 409);
      const options = normalizedOptions(item, catalog);
      totalQuantity += options.reduce((sum, option) => sum + option.quantity, 0);
      for (const option of options) {
        lineItems.push({
          price_data: {
            currency: "usd",
            unit_amount: catalog.cents,
            product_data: {
              name: option.size ? `${catalog.name} — Size ${option.size}` : catalog.name,
              metadata: { order_number: order.order_number, product_id: order.product_id }
            }
          },
          quantity: option.quantity
        });
      }
      stage = "update-order-price";
      const { error: canonicalError } = await supabase.from("mqd_orders")
        .update({ product_name: catalog.name, product_price: catalog.cents / 100, stripe_payment_status: "unpaid" })
        .eq("id", order.id).eq("user_id", user.id);
      if (canonicalError) throw canonicalError;
      stage = "update-item-price";
      const { error: itemPriceError } = await supabase.from("mqd_order_items")
        .update({ product_name: catalog.name, unit_price: catalog.cents / 100 })
        .eq("id", item.id).eq("order_id", order.id);
      if (itemPriceError) throw itemPriceError;
    }
    if (lineItems.length > 100) return json(req, { error: "The cart has too many separate size rows for one checkout" }, 409);
    const shippingCents = shippingCentsForQuantity(totalQuantity);

    stage = "stripe-configuration";
    const secret = await stripeSecret(supabase);
    if (!secret) return json(req, { error: "Stripe checkout is not configured yet" }, 503);
    const stripe = new Stripe(secret, {
      apiVersion: "2026-07-29.dahlia",
      httpClient: Stripe.createFetchHttpClient()
    });
    const configuredSite = configuredSiteUrl();
    const countryList = (Deno.env.get("MQD_ALLOWED_COUNTRIES") || "US").split(",").map((x) => x.trim().toUpperCase()).filter((x) => /^[A-Z]{2}$/.test(x));
    if (!countryList.length) return json(req, { error: "Checkout shipping countries are not configured" }, 503);
    stage = "stripe-session";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      client_reference_id: `MQD-CART-${checkoutToken.replace(/-/g, "").slice(0, 18).toUpperCase()}`,
      customer_email: user.email || undefined,
      success_url: `${configuredSite}order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: configuredSite,
      shipping_address_collection: { allowed_countries: countryList },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: shippingCents, currency: "usd" },
          display_name: "MQD standard shipping"
        }
      }],
      phone_number_collection: { enabled: true },
      metadata: {
        order_numbers: orderNumbers.join(","),
        checkout_token: checkoutToken,
        mqd_user_id: user.id,
        item_quantity: String(totalQuantity),
        shipping_cents: String(shippingCents)
      },
      payment_intent_data: {
        metadata: {
          order_numbers: orderNumbers.join(","),
          checkout_token: checkoutToken,
          mqd_user_id: user.id,
          item_quantity: String(totalQuantity),
          shipping_cents: String(shippingCents)
        }
      },
      integration_identifier: integrationIdentifier(checkoutToken)
    }, { idempotencyKey: `mqd-checkout-${user.id}-${checkoutToken}` });
    if (!session.url || !session.id.startsWith("cs_live_")) throw new Error("Stripe did not return a live checkout session");

    stage = "save-session";
    const { error: sessionError } = await supabase.from("mqd_orders")
      .update({ stripe_checkout_session_id: session.id, stripe_payment_status: session.payment_status || "unpaid" })
      .eq("user_id", user.id).in("order_number", orderNumbers);
    if (sessionError) throw sessionError;
    return json(req, { ok: true, sessionId: session.id, url: session.url });
  } catch (error) {
    const code = typeof error?.code === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(error.code) ? error.code : "unknown";
    console.error(JSON.stringify({ event: "checkout-failed", diagnosticId, stage, code }));
    return json(req, { error: `Checkout failed at ${stage} (${code}). Reference: ${diagnosticId}` }, 500);
  }
});
