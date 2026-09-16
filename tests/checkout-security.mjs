import assert from 'node:assert/strict';
import fs from 'node:fs';

const customer=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
const checkout=fs.readFileSync(new URL('../supabase/functions/create-mqd-checkout/index.ts',import.meta.url),'utf8');
const webhook=fs.readFileSync(new URL('../supabase/functions/stripe-mqd-webhook/index.ts',import.meta.url),'utf8');
const status=fs.readFileSync(new URL('../supabase/functions/mqd-order-status/index.ts',import.meta.url),'utf8');
const config=fs.readFileSync(new URL('../supabase/config.toml',import.meta.url),'utf8');

assert(!customer.includes('buy.stripe.com'), 'browser must not use hard-coded Stripe Payment Links');
assert(customer.includes("const CHECKOUT_URL=SUPABASE_URL+'/functions/v1/create-mqd-checkout'"), 'browser must request server-created Checkout Sessions');
assert(customer.includes('Authorization:`Bearer ${token}`'), 'checkout must send the signed-in customer JWT');
assert(customer.includes('orderNumbers:items.map(x=>x.orderNumber)'), 'checkout must use saved production order references');

for(const product of ['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie','lightweight-jacket','mask','hood-mask-shirt','shorts','sweat-pants','hooded-long-sleeve','hat']){
  assert(checkout.includes(`"${product}"`), `${product} must have server-owned checkout pricing`);
}
assert(checkout.includes('.eq("user_id", user.id)'), 'checkout must only load orders owned by the authenticated customer');
assert(checkout.includes('stripe.checkout.sessions.create'), 'checkout must use the Checkout Sessions API');
assert(checkout.includes('idempotencyKey:'), 'checkout creation must be idempotent');
assert(checkout.includes('integration_identifier: integrationIdentifier(checkoutToken)'), 'Checkout Sessions must include a stable integration identifier');
assert(checkout.includes('shipping_address_collection:'), 'physical-goods checkout must collect a shipping address');
assert(checkout.includes('shipping_options:'), 'checkout must include the server-calculated shipping charge');
assert(checkout.includes('shippingCentsForQuantity(totalQuantity)'), 'shipping must be calculated from verified item quantities');
assert(checkout.includes('shipping_cents: String(shippingCents)'), 'the shipping tier must be recorded in Stripe metadata');
assert(checkout.includes('payment_intent_data:'), 'payment metadata must follow the PaymentIntent');
assert(checkout.includes('mqd_user_id: user.id'), 'checkout metadata must bind the Stripe Session to the customer');
assert(checkout.includes('quantity < 1 || quantity > 99'), 'server must enforce checkout quantity limits');
assert(checkout.includes('Invalid size for'), 'server must enforce product size allowlists');
assert(checkout.includes("-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-"), 'server must require a real random UUID checkout token');
assert(!checkout.includes('payment_method_types'), 'Stripe must choose dynamic payment methods');
assert(!checkout.includes('automatic_tax'), 'tax collection must stay off until registration is explicitly configured');

assert(webhook.includes('const payload = await req.text()'), 'webhook signature verification must use the raw request body');
assert(webhook.includes('verifyStripeSignature(payload, signature'), 'webhook must reject unverified Stripe events');
assert(webhook.includes('checkout.session.async_payment_succeeded'), 'webhook must support delayed payment success');
assert(webhook.includes('checkout.session.async_payment_failed'), 'webhook must support delayed payment failure');
assert(webhook.includes('Number(session.amount_subtotal) !== expectedSubtotalCents'), 'webhook must verify the server-calculated merchandise subtotal before fulfillment');
assert(webhook.includes('Number(session.total_details?.amount_shipping) !== expectedShippingCents'), 'webhook must verify the server-calculated shipping tier before fulfillment');
assert(webhook.includes('Number(session.amount_total) !== expectedSubtotalCents + expectedShippingCents'), 'webhook must verify the final merchandise-plus-shipping total');
assert(webhook.includes('const alreadyPaid ='), 'late events must not downgrade paid orders');
assert(webhook.includes('update.status = "paid"'), 'only the verified webhook may mark orders paid');
assert(!customer.includes("status:'paid'"), 'browser must never mark an order paid');

assert(status.includes(".eq('stripe_checkout_session_id',sessionId)"), 'confirmation status must resolve by the unguessable Checkout Session ID');
assert(config.includes('[functions.stripe-mqd-webhook]\nverify_jwt = false'), 'Stripe webhook must bypass Supabase JWT checks and verify Stripe signatures itself');
assert(webhook.includes('Deno.env.get("MQD_STRIPE_WEBHOOK_SIGNING_SECRET")'), 'Stripe webhook must support the encrypted Edge Function signing secret');
assert(config.includes('[functions.mqd-order-status]\nverify_jwt = false'), 'order confirmation status must be reachable after Stripe redirects the customer');

console.log('PASS: authenticated, server-priced, multi-item Stripe Checkout and verified webhook fulfillment are protected.');
