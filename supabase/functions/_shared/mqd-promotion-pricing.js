// All amounts are integer USD cents. Eastern is UTC-4 on October 31, 2026.
export const HALLOWEEN_END = Date.parse('2026-11-01T04:00:00.000Z');
export const HALLOWEEN_START = Date.parse('2026-10-01T04:00:00.000Z');
export const BASE_CENTS = Object.freeze({
  'tshirt':5000, 'long-sleeve-tshirt':6000, 'short-sleeve-polo':6000,
  'long-sleeve-polo':7000, 'fleece-hoodie':9000, 'lightweight-jacket':9000,
  'mask':2500, 'hood-mask-shirt':7000, 'shorts':4000, 'sweat-pants':6000,
  'hooded-long-sleeve':7000, 'hat':3500
});
export function halloweenActive(now=Date.now()){
  return Number.isFinite(now) && now>=HALLOWEEN_START && now<HALLOWEEN_END;
}
export function pricingEpoch(now=Date.now()){
  return halloweenActive(now)?'halloween-2026-20':'regular';
}
export function garmentPriceCents(id,now=Date.now()){
  if(!Object.prototype.hasOwnProperty.call(BASE_CENTS,id))throw new Error('Unknown garment');
  return halloweenActive(now)?Math.round(BASE_CENTS[id]*80/100):BASE_CENTS[id];
}
export function garmentPrice(id,fallback=0,now=Date.now()){
  return Object.prototype.hasOwnProperty.call(BASE_CENTS,id)?garmentPriceCents(id,now)/100:Number(fallback)||0;
}
