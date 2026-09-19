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
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || "";
  } catch {
    return "";
  }
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
  const metadata = String(session?.metadata?.order_numbers || "").split(",").map((value) => value.trim()).filter((value) => /^MQD-[A-Z0-9]{6,20}$/.test(value));
  if (metadata.length) return [...new Set(metadata)];
  const legacy = String(session?.client_reference_id || "").trim();
  return /^MQD-[A-Z0-9]{6,20}$/.test(legacy) ? [legacy] : [];
}

function stripeId(value: any) {
  if (typeof value === "string") return value;
  return value?.id ? String(value.id) : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method === "GET") return json({ ok: true, service: "stripe-mqd-webhook", version: 8 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const key = serviceKey();
    if (!url || !key) return json({ error: "Backend service credentials are not configured" }, 500);
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    let secret = Deno.env.get("MQD_STRIPE_WEBHOOK_SIGNING_SECRET") || "";
    if (!secret) {
      const { data: vaultSecret, error: secretError } = await supabase.rpc("mqd_get_vault_secret", { secret_name: "mqd_stripe_webhook_signing_secret" });
      if (secretError) return json({ error: "Stripe webhook is not configured" }, 500);
      secret = String(vaultSecret || "");
    }
    if (!secret) return json({ error: "Stripe webhook is not configured" }, 500);

    const payload = await req.text();
    const signature = req.headers.get("stripe-signature") || "";
    if (!await verifyStripeSignature(payload, signature, secret)) return json({ error: "Invalid Stripe signature" }, 400);

    const event = JSON.parse(payload);
    if (event?.livemode !== true) return json({ error: "Sandbox Stripe events are not accepted by the live webhook" }, 400);
    const session = event?.data?.object || {};
    const supported = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "checkout.session.async_payment_failed"];
    if (!supported.includes(event.type)) return json({ received: true, ignored: true });

    const orderNumbers = orderNumbersFor(session);
    if (!orderNumbers.length) return json({ error: "Checkout session has no valid order references" }, 400);
    const { data: orders, error: ordersError } = await supabase.from("mqd_orders")
      .select("id,order_number,product_name,design_id,user_id,status,stripe_payment_status,is_test")
      .in("order_number", orderNumbers);
    if (ordersError) throw ordersError;
    if (!orders || orders.length !== orderNumbers.length) return json({ error: "One or more checkout orders were not found" }, 404);
    if (orders.some((order: any) => order.is_test === true)) return json({ error: "Sandbox test orders are not accepted by the live webhook" }, 400);
    const metadataUserId = String(session?.metadata?.mqd_user_id || "");
    if (metadataUserId && orders.some((order: any) => order.user_id !== metadataUserId)) return json({ error: "Checkout ownership verification failed" }, 400);

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
    if (paid && Number(session.amount_subtotal) !== expectedSubtotalCents) {
      console.error("Stripe subtotal mismatch", { eventId: event.id, sessionId: session.id, expectedSubtotalCents, amountSubtotal: session.amount_subtotal });
      return json({ error: "Checkout amount verification failed" }, 409);
    }
    if (paid && Number(session.total_details?.amount_shipping) !== expectedShippingCents) {
      console.error("Stripe shipping mismatch", { eventId: event.id, sessionId: session.id, expectedShippingCents, amountShipping: session.total_details?.amount_shipping });
      return json({ error: "Checkout shipping verification failed" }, 409);
    }
    if (paid && Number(session.amount_total) !== expectedSubtotalCents + expectedShippingCents) {
      console.error("Stripe total mismatch", { eventId: event.id, sessionId: session.id, expectedTotalCents: expectedSubtotalCents + expectedShippingCents, amountTotal: session.amount_total });
      return json({ error: "Checkout amount verification failed" }, 409);
    }

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
      if (paid && order.design_id) {
        const { error: designError } = await supabase.from("customer_designs").update({ status: "purchased", updated_at: eventTime }).eq("id", order.design_id).eq("user_id", order.user_id);
        if (designError) throw designError;
      }

      if (paid && ownerRecipients.length) {
        const subject = `New paid MQD order — ${order.order_number}`;
        const text = `A new MQD order has been paid.\n\nOrder: ${order.order_number}\nGarment: ${order.product_name || "Custom garment"}\nCustomer: ${customerName || "Customer"}\nEmail: ${customerEmail || "Not provided"}\nQuantity: ${quantity}\nOrder subtotal: $${orderSubtotal.toFixed(2)}\n\nOpen Owner Orders: https://mymerchnow.app/owner`;
        const html = `<h2>New paid MQD order</h2><p><strong>Order:</strong> ${escapeMqdEmailHtml(order.order_number)}</p><p><strong>Garment:</strong> ${escapeMqdEmailHtml(order.product_name || "Custom garment")}</p><p><strong>Customer:</strong> ${escapeMqdEmailHtml(customerName || "Customer")}</p><p><strong>Email:</strong> ${escapeMqdEmailHtml(customerEmail || "Not provided")}</p><p><strong>Quantity:</strong> ${quantity}</p><p><strong>Order subtotal:</strong> $${orderSubtotal.toFixed(2)}</p><p><a href="https://mymerchnow.app/owner">Open Owner Orders</a></p>`;
        for (const recipient of ownerRecipients) {
          try {
            await queueMqdEmail(supabase,{orderId:order.id,kind:"owner_paid_order",recipient,subject,html,text,meta:{orderNumber:order.order_number,eventId:String(event.id||"")}});
          } catch (notifyError) {
            console.error("MQD owner notification queue failed", notifyError instanceof Error ? notifyError.message : String(notifyError));
          }
        }
      }
    }
    return json({ received: true, orderNumbers, status: paid ? "paid" : failed ? "failed" : String(session.payment_status || "unpaid") });
  } catch (error) {
    console.error("stripe-mqd-webhook failed", error instanceof Error ? error.message : String(error));
    return json({ error: error instanceof Error ? error.message : "Webhook failed" }, 500);
  }
});
