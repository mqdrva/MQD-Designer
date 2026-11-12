import {money, REQUEST_MATERIAL} from './contract.js';

const materialLine = s => s.material === REQUEST_MATERIAL ? `Requested material: ${s.materialRequest} (shop quote required)` : `Fabric preference: ${s.material || 'Confirm with shop'}`;
export function requestEmails({row, shop, customer, summary: s, estimate, recipient, from, attachment}) {
  const details = [
    `Designer: ${s.engine}`,
    `Garment: ${shop.garments?.[s.productId]?.brand || ''} ${shop.garments?.[s.productId]?.style || s.productId}`,
    `Color: ${String(s.color || 'See design package').slice(0, 80)}`,
    materialLine(s),
    `Print method: ${(s.engine === '3d' ? shop.printMethods3d || shop.printMethods : shop.printMethods)[s.printMethod] || s.printMethod}`,
    `Sizes: ${s.orderOptions.map(r => `${r.size} x ${r.quantity}`).join(', ')}`,
    estimate.quoteRequired ? 'Estimated total: Shop quote required' : `Estimated total: ${money(estimate.totalCents)} (estimate; excludes tax/shipping)`,
  ];
  return {
    shop: {from, to: [recipient], reply_to: customer.email, subject: `[Print Shop] ${row.reference} — unpaid order request`,
      text: [`${shop.name} — UNPAID ORDER REQUEST`, row.reference, '', `Customer: ${customer.name}`, `Email: ${customer.email}`, `Phone: ${customer.phone}`, ...details, `Notes: ${customer.notes || 'None'}`, '', 'Attached ZIP contains mockups, original artwork, and editable design details. Review print readiness and quote/payment directly with the customer. A separate request receipt will be attempted for the customer. No payment was collected.'].join('\n'),
      attachments: [attachment]},
    customer: {from, to: [customer.email], reply_to: recipient, subject: `${shop.name} — request ${row.reference} received`,
      text: [`Your design request for ${shop.name}`, row.reference, '', 'Your unpaid request was accepted by the email service for the shop.', ...details, '', 'This is a request receipt, not a purchase or payment confirmation. Your shop will confirm artwork, fabric, availability, final pricing and payment directly with you. Reply to this email to contact the shop. Keep this reference for follow-up. No payment was collected.'].join('\n')},
  };
}

export async function sendRequestEmail({key, body, idempotencyKey, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl('https://api.resend.com/emails', {method: 'POST', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey}, signal: AbortSignal.timeout(10000), body: JSON.stringify(body)});
      const result = await response.json().catch(() => ({}));
      if (response.ok && typeof result.id === 'string' && result.id) return result.id;
      if (response.status < 500 && response.status !== 429) return null;
    } catch { /* An uncertain send is retried only with the same provider key and body. */ }
    if (attempt < 2) await sleep(250 * 2 ** attempt);
  }
  return null;
}

// The merchant request is committed before attempting the receipt. A failed receipt
// never tells a customer their already-accepted request failed or resends its ZIP.
export async function deliverRequest({db, row, emails, key, send = sendRequestEmail, now = Date.now()}) {
  const save = async change => {
    const {error} = await db.from('mqd_print_shop_requests').update({...change, updated_at: new Date(now).toISOString()}).eq('id', row.id);
    if (error) throw new Error('Request delivery status could not be saved. Retry the same request.');
    Object.assign(row, change);
  };
  // Resend retains idempotency keys for 24 hours. Do not risk an ambiguous resend
  // after that window, even if a caller supplies a fresh form-start timestamp.
  const inWindow = Number.isFinite(Date.parse(row.created_at)) && now - Date.parse(row.created_at) < 23 * 3600000;
  if (row.status !== 'sent') {
    if (!inWindow) throw new Error('This request needs shop follow-up. Save your ZIP and contact the shop with your reference.');
    const providerId = await send({key, body: emails.shop, idempotencyKey: `shop-${row.id}`});
    if (!providerId) { await save({status: 'failed'}); throw new Error('The email service could not accept your request. Your design is still here. Retry or save the ZIP.'); }
    await save({status: 'sent', provider_id: providerId});
  }
  if (row.customer_receipt_status === 'sent') return 'sent';
  // Null marks requests created before receipts were enabled; never email them retroactively.
  if (!row.customer_receipt_status) return 'not_requested';
  if (!inWindow) return 'failed';
  const providerId = await send({key, body: emails.customer, idempotencyKey: `shop-receipt-${row.id}`});
  try { await save({customer_receipt_status: providerId ? 'sent' : 'failed', customer_receipt_provider_id: providerId}); }
  catch { return 'failed'; }
  return providerId ? 'sent' : 'failed';
}
