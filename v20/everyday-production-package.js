import { VIEWS } from './everyday-contract.js';
import { makeZip, safeArtworkName } from './everyday-zip.js';
export const isEverydayOrder = detail => detail?.order?.design_json?.range === 'everyday';
export async function everydayProductionZip(detail, fetchBlob) {
  const order = detail.order, design = order.design_json;
  if (!isEverydayOrder(detail) || design.productionReady !== true) throw new Error('Everyday production files are incomplete.');
  const sheet = structuredClone(design.everyday), entries = [], assets = detail.assets || [];
  sheet.orderNumber = order.order_number; sheet.productName = order.product_name;
  sheet.orderOptions = detail.items?.[0]?.order_options || design.orderOptions;
  sheet.pricing = design.quote;
  sheet.paymentStatus = order.stripe_payment_status || 'unpaid'; sheet.testOrder = order.is_test === true;
  sheet.status = sheet.testOrder ? 'sandbox-test' : sheet.paymentStatus === 'paid' ? 'paid-order' : 'unpaid-order';
  for (const view of VIEWS) {
    const matches = assets.filter(a => a.zone_name === view && a.metadata?.kind === 'mockup-view');
    if (matches.length !== 1 || !matches[0].download_url) throw new Error(`The ${view} preview is missing.`);
    entries.push({ name: `previews/${view}.png`, data: await fetchBlob(matches[0].download_url) });
    if (sheet.locations[view].status === 'No print') continue;
    const originals = assets.filter(a => a.zone_name === view && a.metadata?.kind === 'original-source');
    if (originals.length !== 1 || !originals[0].download_url) throw new Error(`Original artwork for ${view} is missing.`);
    const name = `originals/${view}-${safeArtworkName(originals[0].original_filename)}`;
    entries.push({ name, data: await fetchBlob(originals[0].download_url) }); sheet.locations[view].originalFile = name;
  }
  entries.push({ name: 'order-sheet.json', data: JSON.stringify(sheet, null, 2) });
  entries.push({ name: 'order-summary.json', data: JSON.stringify({ orderNumber: order.order_number, status: sheet.status, customer: { name: order.customer_name, email: order.customer_email, phone: order.customer_phone }, shipping: { name: order.shipping_name, address: order.shipping_address }, items: detail.items || [], paidAt: order.paid_at, createdAt: order.created_at }, null, 2) });
  entries.push({ name: 'READ-ME.txt', data: `${sheet.status.toUpperCase()}\nFour garment previews and untouched original uploaded files.\nPrint measurements are inches from the top-left of each allowed print area.\nThe garment color is a manufacturer color name. No whole-garment color printing is required.\nConfirm blank fit and placement against the actual garment before production.\n` });
  return makeZip(entries);
}
