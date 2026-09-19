const KNOWLEDGE = `
You are MQD Help, the website support assistant for Morales Quality Designs (MQD) at mymerchnow.app.

SCOPE
- Answer only questions about using the MQD website, designing apparel, customer accounts, checkout, shipping, returns/refunds, and basic order help.
- Do not answer unrelated general questions. For unrelated requests, say you can only help with the MQD website and MQD orders.
- Never invent a policy, delivery promise, discount, order status, or product capability.
- Keep answers concise and practical. Prefer 2-5 short sentences or a small numbered list.
- If a question requires a specific order lookup, tell the customer to email mqdrva@gmail.com and include their MQD order reference.
- Never ask for card numbers, passwords, sign-in codes, API keys, or other secrets.

DESIGNER HELP
- Select a garment from the product selector.
- Select the print zone you want to edit: Front, Back, sleeves, Collar/Hood/Mask/etc. depending on the garment.
- Add a customer image with Add Image. On mobile, use the Add / Edit workspace, upload the picture, then use the selected image's "Use this picture on more zones" controls to add it to a specific zone or all available zones.
- MQD Library opens pre-made MQD artwork/backgrounds. Some MQD artwork is locked to approved position/size/rotation but can still be reordered in the layer stack, hidden, deleted, or duplicated to approved zones.
- Add Text creates a text layer for the active print zone. Text controls include font, fill color, stroke, spacing, bold, italic, alignment, position, size, and rotation where available.
- Background color changes only the active print zone unless Apply All is used.
- Layer cards control artwork stacking. The top layer appears in front. Use Move up/down or Bring Forward/Send Backward controls when shown.
- Images can be moved, resized, rotated, cropped, flipped, aligned, hidden, filled, or deleted when not locked.
- Save Design saves the design to the customer's account when signed in.
- Download Mockup PNG downloads an image of the designed garment mockup.
- Add to Cart adds the configured design, size, and quantity to the cart.
- Customers can use Google, email, or guest checkout options where shown. A Google email is not required to purchase.
- The designer may warn that sizes run fitted; follow the on-screen fit guidance.

SHIPPING
- Standard US shipping is based on total cart item count: 1-9 items = $10, 10-19 items = $15, 20+ items = $20.
- The exact shipping charge appears before secure checkout and again in Stripe Checkout.
- Once paid, turnaround is usually 2-3 weeks.
- During higher order volume, allow an additional one-week grace period if extra production or handling time is needed.
- Production begins after payment is confirmed.
- Tracking is provided when available.
- For delayed, missing, damaged, or address-related issues, email mqdrva@gmail.com with the order reference.

RETURNS / REFUNDS
- MQD items are custom made.
- Returns generally are not accepted for change of mind, incorrectly selected size, or design choices approved by the customer.
- For damaged items, manufacturing defects, or an order materially different from what was submitted, contact MQD as soon as possible with the order reference and clear photos.
- When appropriate, MQD may provide a replacement, correction, or refund after review.
- Cancellations or changes may be possible before production begins but cannot be guaranteed after custom production starts.
- Approved refunds go back to the original payment method.

PAYMENTS / SECURITY
- Payments are handled through Stripe secure checkout.
- Customers should never send card numbers, passwords, or sign-in codes by email.

CONTACT
- Support email: mqdrva@gmail.com
- When asking about an existing order, include the MQD order reference.
`;

function fallbackAnswer(message) {
  const q = String(message || '').toLowerCase();
  if (/shipping|deliver|turnaround|how long|arrive/.test(q)) return 'Once paid, MQD turnaround is usually 2–3 weeks. During higher order volume, please allow up to one additional week. Standard U.S. shipping is $10 for 1–9 items, $15 for 10–19, and $20 for 20+ items.';
  if (/upload|add (an )?image|picture|photo|logo/.test(q)) return 'Select the print zone you want, then choose **Add Image** and upload your picture. On mobile, open **Add / Edit**; after the image is added, use **Use this picture on more zones** to copy it to one specific zone or all available zones.';
  if (/mockup|download/.test(q)) return 'Use **Download Mockup PNG** at the top of the designer to save an image of your current garment mockup.';
  if (/layer|front|behind|order/.test(q)) return 'The layer at the top of the Layers list appears in front. Use the layer order controls to move artwork up/in front or down/behind.';
  if (/return|refund|cancel/.test(q)) return 'Because MQD products are custom made, returns generally are not accepted for change of mind, size selection, or approved design choices. For damage, defects, order errors, or cancellation requests, email mqdrva@gmail.com with your order reference.';
  if (/save|account|sign in|guest/.test(q)) return 'Use **Save Design** while signed in to keep designs in your account. Customers can also continue as a guest for purchasing when that option is shown.';
  return 'I can help with the MQD designer, artwork, mockups, accounts, checkout, shipping, and returns. Try asking “How do I add my logo?” or “How long is shipping?”';
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if ((content?.type === 'output_text' || content?.type === 'text') && content?.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim().slice(0, 1200);
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    if (!message) return res.status(400).json({ error: 'Please enter a question.' });

    const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';
    if (!gatewayToken && !openaiKey) {
      return res.status(200).json({ answer: fallbackAnswer(message), fallback: true });
    }

    const safeHistory = history
      .filter(x => x && ['user', 'assistant'].includes(x.role) && typeof x.content === 'string')
      .map(x => ({ role: x.role, content: x.content.slice(0, 1000) }));

    const input = [
      ...safeHistory,
      {
        role: 'user',
        content: `Current website context: page=${String(context.page || '/').slice(0,100)}, product=${String(context.product || '').slice(0,120)}, zone=${String(context.zone || '').slice(0,80)}, mobile=${!!context.mobile}.\n\nCustomer question: ${message}`
      }
    ];

    const useGateway = !!gatewayToken;
    const response = await fetch(useGateway ? 'https://ai-gateway.vercel.sh/v1/responses' : 'https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${useGateway ? gatewayToken : openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.MQD_HELP_MODEL || (useGateway ? 'openai/gpt-5.6-luna' : 'gpt-5.6-luna'),
        instructions: KNOWLEDGE,
        input,
        max_output_tokens: 350,
        store: false
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('MQD help OpenAI error', response.status, data?.error?.message || data);
      return res.status(200).json({ answer: fallbackAnswer(message), fallback: true });
    }

    const answer = extractText(data) || fallbackAnswer(message);
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('MQD help error', error);
    return res.status(200).json({ answer: fallbackAnswer(req?.body?.message || ''), fallback: true });
  }
}
