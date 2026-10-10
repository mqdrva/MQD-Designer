import { SIZES, COLORS, PRODUCT_OPTIONS, sizesForProduct, isExtendedSize } from './mqd-everyday-catalog.js';
export const EVERYDAY_VIEWS = ['front', 'back', 'left', 'right'];
export const EVERYDAY_COLORS = COLORS;
export const EVERYDAY_SIZES = SIZES;
export const EVERYDAY_PRINT_METHODS = Object.freeze({ transfer: 'Standard transfer', dtf: 'DTF', dtg: 'DTG' });
export function everydayPrintMethod(value) {
  const method = value === undefined ? 'transfer' : value;
  if (!Object.hasOwn(EVERYDAY_PRINT_METHODS, method)) throw new EverydayError('Choose an approved print method.');
  return method;
}
// Supplier identifiers are retained only in internal production records.
const blankStyles = { 'everyday-tshirt': 'Gildan 3000', 'everyday-long-sleeve': 'Gildan 2400', 'everyday-hoodie': 'Gildan 18500', 'everyday-polo': 'Gildan 64800' };
const names = { 'everyday-tshirt': 'Everyday Cotton T-shirt', 'everyday-long-sleeve': 'Everyday Cotton Long Sleeve', 'everyday-hoodie': 'Everyday Hoodie', 'everyday-polo': 'Everyday Polo' };
export const EVERYDAY_CATALOG = Object.freeze(Object.fromEntries(Object.entries(PRODUCT_OPTIONS).map(([id, options]) => [id, { ...options, name: names[id], blankStyle: blankStyles[id] }])));
export const isEveryday = id => Object.hasOwn(EVERYDAY_CATALOG, id);
export class EverydayError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function everydayZone(product, size, view) {
  if ((product === 'everyday-polo' && view === 'front') || view === 'left' || view === 'right') return { width: 3, height: 3 };
  return ['XS', 'S'].includes(size) ? { width: 10, height: 12 } : { width: 12, height: 15 };
}
// No default retail amounts: the owner must configure approved USD cent amounts.
export function everydayPricing(raw) {
  let config;
  try { config = JSON.parse(raw || ''); } catch { throw new EverydayError('Everyday prices are awaiting setup.', 503); }
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(config?.version || '')) throw new EverydayError('Everyday price version is not configured.', 503);
  for (const id of Object.keys(EVERYDAY_CATALOG)) if (!Number.isSafeInteger(config?.baseCents?.[id]) || config.baseCents[id] < 50 || config.baseCents[id] > 100000) throw new EverydayError('Everyday garment prices are not configured.', 503);
  for (const view of EVERYDAY_VIEWS) if (!Number.isSafeInteger(config?.printCents?.[view]) || config.printCents[view] < 0 || config.printCents[view] > 100000) throw new EverydayError('Everyday print prices are not configured.', 503);
  if (!Number.isSafeInteger(config.sleeveCents) || config.sleeveCents < 0 || config.sleeveCents > 100000) throw new EverydayError('Everyday sleeve prices are not configured.', 503);
  if (!Number.isSafeInteger(config.sizeSurchargeCents) || config.sizeSurchargeCents < 0 || config.sizeSurchargeCents > 100000) throw new EverydayError('Everyday size prices are not configured.', 503);
  // Owner-approved additions. Legacy configurations keep standard transfer prices.
  const methodCents = config.methodCents ?? { transfer: 0, dtf: 500, dtg: 1000 };
  const methodBackCents = config.methodBackCents ?? { transfer: config.printCents.back, dtf: 500, dtg: 500 };
  for (const values of [methodCents, methodBackCents]) for (const method of Object.keys(EVERYDAY_PRINT_METHODS)) if (!Number.isSafeInteger(values[method]) || values[method] < 0 || values[method] > 100000) throw new EverydayError('Everyday print method prices are not configured.', 503);
  return { version: config.version, baseCents: Object.fromEntries(Object.keys(EVERYDAY_CATALOG).map(id => [id, config.baseCents[id]])), printCents: Object.fromEntries(EVERYDAY_VIEWS.map(v => [v, config.printCents[v]])), sleeveCents: config.sleeveCents, sizeSurchargeCents: config.sizeSurchargeCents, methodCents: { ...methodCents }, methodBackCents: { ...methodBackCents } };
}
export function validateEveryday(payload) {
  const product = payload?.product?.id, sheet = payload?.everyday;
  if (!isEveryday(product) || payload?.range !== 'everyday' || sheet?.schemaVersion !== 1 || sheet?.product !== product || sheet?.range !== 'everyday' || sheet?.units !== 'inches') throw new EverydayError('Invalid Everyday garment details.');
  if (!EVERYDAY_CATALOG[product].colors.includes(sheet.color) || !sizesForProduct(product, sheet.color).includes(sheet.size)) throw new EverydayError('Choose an approved Everyday color and size.');
  everydayPrintMethod(sheet.printMethod);
  if (!Number.isInteger(sheet.quantity) || sheet.quantity < 1 || sheet.quantity > 99) throw new EverydayError('Each Everyday quantity must be between 1 and 99.');
  const options = payload.orderOptions;
  if (!Array.isArray(options) || options.length !== 1 || options[0]?.size !== sheet.size || options[0]?.quantity !== sheet.quantity || payload.totalQuantity !== sheet.quantity) throw new EverydayError('Everyday quantities do not match.');
  const locations = sheet.locations;
  if (!locations || Object.keys(locations).length !== 4 || Object.keys(locations).some(v => !EVERYDAY_VIEWS.includes(v))) throw new EverydayError('Everyday requires all four garment views.');
  let printed = 0;
  for (const view of EVERYDAY_VIEWS) {
    const art = locations[view];
    if (art?.status === 'No print') continue;
    const box = everydayZone(product, sheet.size, view);
    if (!art || typeof art.filename !== 'string' || !art.filename.trim() || art.filename.length > 240 || ['x', 'y', 'width', 'height'].some(k => !Number.isFinite(art[k])) || art.x < 0 || art.y < 0 || art.width <= 0 || art.height <= 0 || art.x + art.width > box.width + 1e-8 || art.y + art.height > box.height + 1e-8) throw new EverydayError(`Artwork exceeds the ${view} print area.`);
    printed++;
  }
  if (!printed) throw new EverydayError('Upload artwork to at least one print area.');
  return sheet;
}
export function everydayQuote(payload, config) {
  const sheet = validateEveryday(payload), baseCents = config.baseCents[sheet.product];
  const sizeCents = isExtendedSize(sheet.size) ? config.sizeSurchargeCents : 0;
  const printMethod = everydayPrintMethod(sheet.printMethod), methodCents = config.methodCents[printMethod];
  const prints = EVERYDAY_VIEWS.filter(v => sheet.locations[v].status !== 'No print');
  const printCents = prints.reduce((total, v) => total + (v === 'back' ? config.methodBackCents[printMethod] : config.printCents[v]), 0) + (prints.some(v => v === 'left' || v === 'right') ? config.sleeveCents : 0), unitCents = baseCents + sizeCents + printCents + methodCents;
  return { baseCents, sizeCents, printCents, methodCents, printMethod, printMethodLabel: EVERYDAY_PRINT_METHODS[printMethod], unitCents, currency: 'usd', version: config.version, locations: prints };
}
export function everydayCheckout(order, item, rawPricing) {
  const payload = order.design_json;
  if (payload?.productionReady !== true || order.product_id !== payload?.product?.id || item.product_id !== order.product_id) throw new EverydayError('Everyday production files are not ready.', 409);
  const sheet = validateEveryday(payload), quote = everydayQuote(payload, everydayPricing(rawPricing));
  if (item.quantity !== sheet.quantity || JSON.stringify(item.order_options) !== JSON.stringify(payload.orderOptions)) throw new EverydayError('Everyday item details do not match.', 409);
  if (payload.quote?.version !== quote.version || payload.quote?.unitCents !== quote.unitCents) throw new EverydayError('Everyday pricing changed. Please re-add this design to review its current price.', 409);
  return { catalog: { ...EVERYDAY_CATALOG[order.product_id], name: `${EVERYDAY_CATALOG[order.product_id].name} · ${sheet.color} · ${quote.printMethodLabel}` }, unitCents: quote.unitCents, quote };
}
