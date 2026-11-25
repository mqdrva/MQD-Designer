export const TRANSFERS = Object.freeze({
  'dtf-sheet': { name: 'DTF gang sheets', inches: 12, cents: 1000 },
  'sublimation-square': { name: 'Sublimation square', inches: 15, cents: 1000 },
  'sublimation-all-over': { name: 'All-over sublimation', cents: 2500, blocked: true }
});

export const isTransfer = id => Object.hasOwn(TRANSFERS, id);
export const dtfCents = count => Math.floor(count / 3) * 2500 + count % 3 * 1000;

function transferCrop(value) {
  if (value === undefined) return undefined;
  const { left, top, right, bottom } = value || {};
  if (![left, top, right, bottom].every(edge => Number.isFinite(edge) && edge >= 0) || left + right > .95 + 1e-8 || top + bottom > .95 + 1e-8) {
    throw new Error('Leave at least 5% of the artwork on each axis when cropping.');
  }
  return left || top || right || bottom ? { left, top, right, bottom } : undefined;
}

export function transferLayout(payload) {
  const sku = payload?.sku;
  if (!isTransfer(sku) || TRANSFERS[sku].blocked) throw new Error('This transfer is unavailable for ordering.');
  const { inches } = TRANSFERS[sku];
  if (!Array.isArray(payload.sheets) || !payload.sheets.length || payload.sheets.length > 20) throw new Error('Add between 1 and 20 sheets per design.');
  let fileCount = 0;
  const sheets = payload.sheets.map(sheet => {
    if (!Array.isArray(sheet?.layers) || !sheet.layers.length || sheet.layers.length > 24) throw new Error('Every sheet needs at least one graphic.');
    return { layers: sheet.layers.map(layer => {
      const { x, y, width, height } = layer || {};
      if (![x,y,width,height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > inches + 1e-8 || y + height > inches + 1e-8) throw new Error('Keep graphics inside the print boundary.');
      if (++fileCount > 64) throw new Error('A design can include up to 64 graphics.');
      const crop = transferCrop(layer?.crop);
      return { source: fileCount, x, y, width, height, ...(crop ? { crop } : {}) };
    }) };
  });
  return { sku, inches, sheets, units: 'inches', fileCount };
}

// Sort by stable order reference so checkout and its payment webhook allocate
// each complete group of three identically, including across separate cart rows.
export function transferOrderPrices(orders, items) {
  const prices = new Map();
  let dtfCount = 0;
  for (const order of [...orders].sort((a,b) => a.order_number.localeCompare(b.order_number))) {
    const item = items.get(order.id);
    const sku = item?.product_id ?? order.product_id;
    if (!isTransfer(sku)) continue;
    const details = order.design_json;
    const count = item.quantity;
    if ((order.product_id && order.product_id !== sku) || item.order_options?.length !== 0 ||
      order.engine_calibration !== 'transfers-2d-v1' || order.status === 'draft' || details?.productionReady !== true || TRANSFERS[sku].blocked ||
      details.transfers?.sku !== sku || !Number.isInteger(count) || count < 1 || count > 20 ||
      details.transfers.sheets?.length !== count || details.transfers.inches !== TRANSFERS[sku].inches) {
      throw new Error('A transfer is missing its production layout or has an invalid quantity.');
    }
    const cents = sku === 'dtf-sheet'
      ? dtfCents(dtfCount + count) - dtfCents(dtfCount)
      : TRANSFERS[sku].cents * count;
    if (sku === 'dtf-sheet') dtfCount += count;
    prices.set(order.id, { cents, count, name: TRANSFERS[sku].name, inches: TRANSFERS[sku].inches });
  }
  return prices;
}

export function transferCheckoutLine(order, price, test = false) {
  const name = (test ? '[SANDBOX TEST] ' : '') + price.name + ' • ' + price.inches + ' × ' + price.inches + ' in • ' + price.count + (price.count === 1 ? ' individual sheet' : ' individual sheets');
  return { price_data: { currency: 'usd', unit_amount: price.cents, product_data: {
    name, metadata: { order_number: order.order_number, product_id: order.product_id }
  } }, quantity: 1 };
}
