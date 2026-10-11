import { artworkBounds, printMetadata } from './everyday-layers.js';
export const VIEWS = ['front', 'back', 'left', 'right'];
import { SIZES, COLORS, colorsForProduct, sizesForProduct } from './everyday-catalog.js';
export { SIZES, COLORS, colorsForProduct, sizesForProduct };
export const PRINT_METHODS = Object.freeze({ transfer: 'Standard transfer', dtf: 'DTF', dtg: 'DTG' });
export const ZONES = {
  front: { label: 'Front', width: 12, height: 15 },
  back: { label: 'Back', width: 12, height: 15 },
  left: { label: 'Left sleeve', width: 3, height: 3 },
  right: { label: 'Right sleeve', width: 3, height: 3 },
};
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
export function constrainImagePlacement(placement, zone) {
  if (!['x','y','width','height'].every(k => Number.isFinite(placement[k])) || placement.width <= 0 || placement.height <= 0) throw new Error('Invalid artwork placement.');
  const scale = Math.min(1, zone.width * 8 / placement.width, zone.height * 8 / placement.height);
  const width = placement.width * scale, height = placement.height * scale;
  // Keep a visible overlap so the selected image can always be moved back.
  const overlap = Math.min(.1, width, height, zone.width, zone.height);
  return { width, height, x: Math.max(overlap-width, Math.min(zone.width-overlap, placement.x)), y: Math.max(overlap-height, Math.min(zone.height-overlap, placement.y)) };
}
export function resizeImageArtwork(placement, width, zone) {
  const height = placement.height * width / placement.width;
  return constrainImagePlacement({width,height,x:placement.x+(placement.width-width)/2,y:placement.y+(placement.height-height)/2},zone);
}
export function orderSheet(draft) {
  if (!sizesForProduct(draft.product, draft.color).includes(draft.size)) throw new Error('Choose an approved Everyday size.');
  const printMethod = draft.printMethod === undefined ? 'transfer' : draft.printMethod;
  if (!Object.hasOwn(PRINT_METHODS, printMethod)) throw new Error('Choose an approved print method.');
  return { schemaVersion: 1, range: 'everyday', product: draft.product, color: draft.color, size: draft.size, quantity: draft.quantity,
    printMethod, printMethodLabel: PRINT_METHODS[printMethod],
    units: 'inches', status: 'development-draft', locations: Object.fromEntries(VIEWS.map(view => [view, draft.artwork[view]
      ? printMetadata(draft.artwork[view], view, draft.product === 'everyday-polo' && view === 'front' ? {width:3,height:3} : ['XS','S'].includes(draft.size) && ['front','back'].includes(view) ? {width:10,height:12} : ZONES[view])
      : { status: 'No print' }])) };
}
