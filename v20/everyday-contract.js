export const VIEWS = ['front', 'back', 'left', 'right'];
export const SIZES = Object.freeze(['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL']);
export const PRINT_METHODS = Object.freeze({ transfer: 'Standard transfer', dtf: 'DTF', dtg: 'DTG' });
export const ZONES = {
  front: { label: 'Front', width: 12, height: 15 },
  back: { label: 'Back', width: 12, height: 15 },
  left: { label: 'Left sleeve', width: 3, height: 3 },
  right: { label: 'Right sleeve', width: 3, height: 3 },
};
// Approved manufacturer color names; preview colors remain approximate.
export const COLORS = ['White', 'Black', 'Navy', 'Royal', 'Red', 'Sport Grey', 'Charcoal', 'Forest Green', 'Purple', 'Gold'];
export const colorsForProduct = product => product === 'everyday-polo' ? COLORS.map(color => color === 'Charcoal' ? 'Dark Heather' : color) : [...COLORS];
export function fitArtwork(width, height, zone) {
  if (!(width > 0 && height > 0)) throw new Error('Artwork dimensions must be positive.');
  const scale = Math.min(zone.width / width, zone.height / height);
  return { x: (zone.width - width * scale) / 2, y: (zone.height - height * scale) / 2, width: width * scale, height: height * scale };
}
export function constrainPlacement(placement, zone) {
  if (!Object.values(placement).every(Number.isFinite) || placement.width <= 0 || placement.height <= 0) throw new Error('Invalid artwork placement.');
  const scale = Math.min(1, zone.width / placement.width, zone.height / placement.height);
  const width = placement.width * scale, height = placement.height * scale;
  return { width, height, x: Math.max(0, Math.min(zone.width - width, placement.x)), y: Math.max(0, Math.min(zone.height - height, placement.y)) };
}
export function resizeArtwork(placement, width, zone) {
  return constrainPlacement({ ...placement, width, height: placement.height * width / placement.width }, zone);
}
export function orderSheet(draft) {
  if (!SIZES.includes(draft.size)) throw new Error('Choose an approved Everyday size.');
  const printMethod = draft.printMethod === undefined ? 'transfer' : draft.printMethod;
  if (!Object.hasOwn(PRINT_METHODS, printMethod)) throw new Error('Choose an approved print method.');
  return { schemaVersion: 1, range: 'everyday', product: draft.product, color: draft.color, size: draft.size, quantity: draft.quantity,
    printMethod, printMethodLabel: PRINT_METHODS[printMethod],
    units: 'inches', status: 'development-draft', locations: Object.fromEntries(VIEWS.map(view => [view, draft.artwork[view]
      ? { filename: draft.artwork[view].name, ...draft.artwork[view].placement }
      : { status: 'No print' }])) };
}
