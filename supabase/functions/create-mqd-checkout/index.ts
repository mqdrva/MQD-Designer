import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import Stripe from "npm:stripe@22.4.0";

const SITE_URL = "https://mqd-designer-vercel.vercel.app/";
const CATALOG = {
  "tshirt": { name: "All-Over Print T-Shirt", cents: 5000 },
  "long-sleeve-tshirt": { name: "Long Sleeve T-Shirt", cents: 6000 },
  "short-sleeve-polo": { name: "Short Sleeve Polo", cents: 6000 },
  "long-sleeve-polo": { name: "Long Sleeve Polo", cents: 7000 },
  "fleece-hoodie": { name: "Fleece Hoodie", cents: 9000 },
  "lightweight-jacket": { name: "Lightweight Jacket", cents: 9000 },
  "mask": { name: "Mask", cents: 2500 },
  "hood-mask-shirt": { name: "Long Sleeve Shirt With Hood And Built-In Mask", cents: 7000 },
  "shorts": { name: "Shorts", cents: 4000 },
  "sweat-pants": { name: "Sweat Pants", cents: 6000 },
  "hooded-long-sleeve": { name: "Long Sleeve Shirt With Hood", cents: 7000 },
  "hat": { name: "Hat", cents: 3500 }
};

const allowedOrigin = (req) => {
  const origin = req.headers.get("origin") || "";
  return origin === SITE_URL.slice(0, -1) || /^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
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

async function stripeSecret(supabase) {
  const direct = Deno.env.get("MQD_STRIPE_SECRET_KEY") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  if (direct) return direct;
  const { data, error } = await supabase.rpc("mqd_get_vault_secret", { secret_name: "mqd_stripe_secret_key" });
  if (error) throw new Error("Stripe checkout is not configured.");
  return String(data || "");
}

function normalizedOptions(row) {
  const options = Array.isArray(row?.order_options) ? row.order_options : [];
  if (options.length) return options.map((option) => ({
    size: option?.size ? String(option.size).slice(0, 12) : null,
    quantity: Math.max(1, Math.min(999, Number(option?.quantity) || 1))
  }));
  return [{ size: null, quantity: Math.max(1, Math.min(999, Number(row?.quantity) || 1)) }];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
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

    const body = await req.json().catch(() => ({}));
    const orderNumbers = [...new Set((Array.isArray(body?.orderNumbers) ? body.orderNumbers : []).map((x) => String(x).trim()))];
    const checkoutToken = String(body?.checkoutToken || "").trim();
    if (!orderNumbers.length || orderNumbers.length > 20 || orderNumbers.some((x) => !/^MQD-[A-Z0-9]{6,20}$/.test(x))) {
      return json(req, { error: "The cart contains an invalid order reference" }, 400);
    }
    if (!/^[0-9a-f-]{20,64}$/i.test(checkoutToken)) return json(req, { error: "Invalid checkout request" }, 400);

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
    const { data: itemRows, error: itemError } = await supabase
      .from("mqd_order_items")
      .select("id,order_id,product_id,quantity,order_options")
      .in("order_id", orderIds);
    if (itemError) throw itemError;
    const itemsByOrder = new Map((itemRows || []).map((row) => [row.order_id, row]));
    if (orders.some((order) => !itemsByOrder.has(order.id))) return json(req, { error: "A cart item is missing its production details" }, 409);

    const lineItems = [];
    for (const order of orders) {
      const catalog = CATALOG[order.product_id];
      if (!catalog) return json(req, { error: `Checkout is not configured for ${order.product_id}` }, 409);
      const item = itemsByOrder.get(order.id);
      if (item.product_id !== order.product_id) return json(req, { error: "A cart item failed product verification" }, 409);
      for (const option of normalizedOptions(item)) {
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
      const { error: canonicalError } = await supabase.from("mqd_orders")
        .update({ product_name: catalog.name, product_price: catalog.cents / 100, stripe_payment_status: "unpaid" })
        .eq("id", order.id).eq("user_id", user.id);
      if (canonicalError) throw canonicalError;
      const { error: itemPriceError } = await supabase.from("mqd_order_items")
        .update({ product_name: catalog.name, unit_price: catalog.cents / 100 })
        .eq("id", item.id).eq("order_id", order.id);
      if (itemPriceError) throw itemPriceError;
    }

    const secret = await stripeSecret(supabase);
    if (!secret) return json(req, { error: "Stripe checkout is not configured yet" }, 503);
    const stripe = new Stripe(secret, {
      apiVersion: "2026-07-29.dahlia",
      httpClient: Stripe.createFetchHttpClient()
    });
    const configuredSite = (Deno.env.get("MQD_SITE_URL") || SITE_URL).replace(/\/?$/, "/");
    const countryList = (Deno.env.get("MQD_ALLOWED_COUNTRIES") || "US").split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      client_reference_id: `MQD-CART-${checkoutToken.replace(/-/g, "").slice(0, 18).toUpperCase()}`,
      customer_email: user.email || undefined,
      success_url: `${configuredSite}order-confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: configuredSite,
      shipping_address_collection: { allowed_countries: countryList },
      phone_number_collection: { enabled: true },
      metadata: { order_numbers: orderNumbers.join(","), checkout_token: checkoutToken },
      payment_intent_data: { metadata: { order_numbers: orderNumbers.join(","), checkout_token: checkoutToken } },
      integration_identifier: "morales-quality-designs-checkout"
    }, { idempotencyKey: `mqd-checkout-${user.id}-${checkoutToken}` });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");

    const { error: sessionError } = await supabase.from("mqd_orders")
      .update({ stripe_checkout_session_id: session.id, stripe_payment_status: session.payment_status || "unpaid" })
      .eq("user_id", user.id).in("order_number", orderNumbers);
    if (sessionError) throw sessionError;
    return json(req, { ok: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("create-mqd-checkout failed", error instanceof Error ? error.message : String(error));
    return json(req, { error: error instanceof Error ? error.message : "Checkout could not be created" }, 500);
  }
});
