export const labels = {
  'dtf-sheet': 'DTF gang sheets',
  'sublimation-square': 'Sublimation square',
  'sublimation-all-over': 'All-over sublimation'
};
export const isTransfer = id => Object.hasOwn(labels, id);
export const dtfCents = count => Math.floor(count / 3) * 2500 + count % 3 * 1000;
export function cartLineTotals(items) {
  let dtf = 0;
  const allocations = new Map();
  for (const item of items.filter(item => item.productId === 'dtf-sheet').sort((a,b) => String(a.orderNumber||'').localeCompare(String(b.orderNumber||'')))) {
    const count = Number(item.totalQuantity) || 1;
    allocations.set(item.orderNumber, dtfCents(dtf + count) - dtfCents(dtf));
    dtf += count;
  }
  return items.map(item => allocations.get(item.orderNumber) ?? Math.round(Number(item.price || 0) * 100) * (Number(item.totalQuantity) || 1));
}
