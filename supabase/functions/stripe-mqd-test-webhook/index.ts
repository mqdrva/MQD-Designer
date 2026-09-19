import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { quantityFromOrderItem, shippingCentsForQuantity } from "../_shared/mqd-shipping.js";
import { escapeMqdEmailHtml, mqdOwnerEmails, queueMqdEmail } from "../_shared/mqd-email.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" }
});
const encoder = new TextEncoder();

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { return ""; }
}

async function webhookSecret(supabase: any) {
  const direct = String(Deno.env.get("MQD_STRIPE_TEST_WEBHOOK_SECRET") || "").trim();
  if (direct.startsWith("whsec_")) return direct;
  const { data, error } = await supabase.rpc("mqd_get_vault_secret", { secret_name: "mqd_stripe_test_webhook_secret" });
  if (error) return "";
  const value = String(data || "").trim();
  return value.startsWith("whsec_") ? value : "";
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2) || "";
  const candidates = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const epoch = Number(timestamp);
  if (!timestamp || !candidates.length || !Number.isFinite(epoch) || Math.abs(Date.now() / 1000 - epoch) > 300) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return candidates.some((candidate) => timingSafeEqual(candidate, expected));
}

function orderNumbersFor(session: any) {
  return [...new Set(String(session?.metadata?.order_numbers || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^MQD-[A-Z0-9]{6,20}$/.test(value)))];
}

function stripeId(value: any) {
  if (typeof value === "string") return value;
  return value?.id ? String(value.id) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method === "GET") return json({ ok: true, service: "stripe-mqd-test-webhook", version: 3 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "", key = serviceKey();
    if (!url || !key) return json({ error: "Backend service credentials are not configured" }, 500);
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const secret = await webhookSecret(supabase);
    if (!secret) return json({ error: "Stripe sandbox webhook is not configured" }, 500);

    const payload = await req.text();
    const signature = req.headers.get("stripe-signature") || "";
    if (!await verifyStripeSignature(payload, signature, secret)) return json({ error: "Invalid Stripe signature" }, 400);

    const event = JSON.parse(payload);
    if (event?.livemode !== false) return json({ error: "Live Stripe events are not accepted by the sandbox webhook" }, 400);
    const session = event?.data?.object || {};
    const supported = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"];
    if (!supported.includes(event.type)) return json({ received: true, ignored: true });
    if (String(session?.metadata?.mqd_test || "") !== "1") return json({ error: "Checkout session is not an MQD sandbox test" }, 400);

    const orderNumbers = orderNumbersFor(session);
    if (!orderNumbers.length) return json({ error: "Checkout session has no valid order references" }, 400);

    const { data: orders, error: ordersError } = await supabase.from("mqd_orders")
      .select("id,order_number,product_name,design_id,user_id,status,stripe_payment_status")
      .in("order_number", orderNumbers);
    if (ordersError) throw ordersError;
    if (!orders || orders.length !== orderNumbers.length) return json({ error: "One or more checkout orders were not found" }, 404);
    if (orders.some((order: any) => order.user_id !== null)) return json({ error: "Sandbox webhook expected guest orders" }, 400);

    const { data: items, error: itemsError } = await supabase.from("mqd_order_items")
      .select("order_id,unit_price,quantity,order_options")
      .in("order_id", orders.map((order: any) => order.id));
    if (itemsError) throw itemsError;
    if (!items || items.length !== orders.length) return json({ error: "Checkout item verification failed" }, 409);

    const itemByOrder = new Map(items.map((item: any) => [item.order_id, item]));
    const totalQuantity = orders.reduce((sum: number, order: any) => sum + quantityFromOrderItem(itemByOrder.get(order.id)), 0);
    const expectedSubtotalCents = orders.reduce((sum: number, order: any) => {
      const item: any = itemByOrder.get(order.id);
      return sum + Math.round(Number(item.unit_price || 0) * 100) * quantityFromOrderItem(item);
    }, 0);
    const expectedShippingCents = shippingCentsForQuantity(totalQuantity);

    const paid = event.type === "checkout.session.async_payment_succeeded" || (event.type === "checkout.session.completed" && session.payment_status === "paid");
    const failed = event.type === "checkout.session.async_payment_failed";
    if (paid && Number(session.amount_subtotal) !== expectedSubtotalCents) return json({ error: "Checkout amount verification failed" }, 409);
    if (paid && Number(session.total_details?.amount_shipping) !== expectedShippingCents) return json({ error: "Checkout shipping verification failed" }, 409);
    if (paid && Number(session.amount_total) !== expectedSubtotalCents + expectedShippingCents) return json({ error: "Checkout amount verification failed" }, 409);

    const shipping = session.shipping_details || session.collected_information?.shipping_details || null;
    const customerEmail = String(session.customer_details?.email || session.customer_email || "").trim();
    const customerName = String(session.customer_details?.name || shipping?.name || "Customer").trim();
    const eventTime = Number.isFinite(Number(event.created)) ? new Date(Number(event.created) * 1000).toISOString() : new Date().toISOString();
    const ownerRecipients = paid ? await mqdOwnerEmails(supabase) : [];

    for (const order of orders) {
      const item: any = itemByOrder.get(order.id);
      const alreadyPaid = order.status === "paid" || order.stripe_payment_status === "paid";
      const quantity = quantityFromOrderItem(item);
      const orderSubtotal = Math.round(Number(item.unit_price || 0) * 100) * quantity / 100;
      const update: Record<string, unknown> = {
        stripe_checkout_session_id: String(session.id || ""),
        stripe_payment_intent_id: stripeId(session.payment_intent),
        stripe_customer_id: stripeId(session.customer),
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        customer_phone: session.customer_details?.phone || null,
        shipping_name: shipping?.name || null,
        shipping_address: shipping?.address || null,
        currency: String(session.currency || "usd").toUpperCase(),
        is_test: true,
        updated_at: eventTime
      };
      if (paid) {
        if (!["production", "shipped", "completed", "cancelled"].includes(order.status)) update.status = "paid";
        update.stripe_payment_status = "paid";
        update.amount_paid = orderSubtotal;
        update.paid_at = eventTime;
      } else if (!alreadyPaid) {
        update.stripe_payment_status = failed ? "failed" : String(session.payment_status || "unpaid");
      }
      const { error: updateError } = await supabase.from("mqd_orders").update(update).eq("id", order.id)
        .or("stripe_payment_status.is.null,stripe_payment_status.neq.paid");
      if (updateError) throw updateError;

      if (paid && ownerRecipients.length) {
        const subject = `[TEST] MQD sandbox paid order — ${order.order_number}`;
        const text = `SANDBOX TEST — NO REAL PAYMENT.\n\nOrder: ${order.order_number}\nGarment: ${order.product_name || "Custom garment"}\nCustomer: ${customerName || "Customer"}\nEmail: ${customerEmail || "Not provided"}\nQuantity: ${quantity}\nOrder subtotal: $${orderSubtotal.toFixed(2)}\n\nOpen Owner Orders: https://mymerchnow.app/owner`;
        const html = `<h2>MQD sandbox paid order</h2><p><strong>This is a Stripe sandbox test. No real payment was processed.</strong></p><p><strong>Order:</strong> ${escapeMqdEmailHtml(order.order_number)}</p><p><strong>Garment:</strong> ${escapeMqdEmailHtml(order.product_name || "Custom garment")}</p><p><strong>Customer:</strong> ${escapeMqdEmailHtml(customerName || "Customer")}</p><p><strong>Email:</strong> ${escapeMqdEmailHtml(customerEmail || "Not provided")}</p><p><strong>Quantity:</strong> ${quantity}</p><p><strong>Order subtotal:</strong> $${orderSubtotal.toFixed(2)}</p><p><a href="https://mymerchnow.app/owner">Open Owner Orders</a></p>`;
        for (const recipient of ownerRecipients) {
          try {
            await queueMqdEmail(supabase, {
              orderId: order.id,
              kind: "owner_paid_order",
              recipient,
              subject,
              html,
              text,
              meta: { orderNumber: order.order_number, eventId: String(event.id || ""), sandbox: true }
            });
          } catch (notifyError) {
            console.error("MQD sandbox owner notification queue failed", notifyError instanceof Error ? notifyError.message : String(notifyError));
          }
        }
      }
    }

    return json({ received: true, test: true, orderNumbers, status: paid ? "paid" : failed ? "failed" : String(session.payment_status || "unpaid") });
  } catch (error) {
    console.error("stripe-mqd-test-webhook failed", error instanceof Error ? error.message : String(error));
    return json({ error: error instanceof Error ? error.message : "Webhook failed" }, 500);
  }
});
