// All amounts are integer USD cents.
export const HALLOWEEN_END = Date.parse('2026-11-01T04:00:00.000Z');
export const HALLOWEEN_START = Date.parse('2026-10-01T04:00:00.000Z');
export const BLACK_FRIDAY_START = Date.parse('2026-11-21T00:00:00-05:00');
export const BLACK_FRIDAY_END = Date.parse('2026-12-01T00:00:00-05:00');
export const BLACK_FRIDAY_CENTS = Object.freeze({
  'tshirt': 4000,
  'long-sleeve-tshirt': 4500,
  'short-sleeve-polo': 4500,
  'long-sleeve-polo': 5000,
  'lightweight-jacket': 8000,
  'mask': 2000,
  'fleece-hoodie': 8000,
  'hood-mask-shirt': 5000,
  'shorts': 3500,
  'sweat-pants': 4000,
  'hooded-long-sleeve': 5000,
  'hat': 2500
});
// Price revision keeps resumed checkouts from reusing sessions with old sale prices.
export const BLACK_FRIDAY_ID = 'black-friday-2026-v2';
export function blackFridayActive(now = Date.now()) {
  return Number.isFinite(now) && now >= BLACK_FRIDAY_START && now < BLACK_FRIDAY_END;
}
export function blackFridayEligible(id) {
  return Object.hasOwn(BLACK_FRIDAY_CENTS, id);
}
export const BASE_CENTS = Object.freeze({
  'tshirt':5000, 'long-sleeve-tshirt':6000, 'short-sleeve-polo':6000,
  'long-sleeve-polo':7000, 'fleece-hoodie':9000, 'lightweight-jacket':9000,
  'mask':2500, 'hood-mask-shirt':7000, 'shorts':4000, 'sweat-pants':6000,
  'hooded-long-sleeve':7000, 'hat':3500
});
export function halloweenActive(now=Date.now()){
  return Number.isFinite(now) && now>=HALLOWEEN_START && now<HALLOWEEN_END;
}
export function pricingEpoch(now=Date.now(), { includeBlackFriday = true } = {}){
  if (includeBlackFriday && blackFridayActive(now)) return BLACK_FRIDAY_ID;
  return halloweenActive(now)?'halloween-2026-20':'regular';
}
export function garmentPriceCents(id,now=Date.now(), { includeBlackFriday = true } = {}){
  if(!Object.prototype.hasOwnProperty.call(BASE_CENTS,id))throw new Error('Unknown garment');
  if (includeBlackFriday && blackFridayActive(now) && blackFridayEligible(id)) return BLACK_FRIDAY_CENTS[id];
  return halloweenActive(now)?Math.round(BASE_CENTS[id]*80/100):BASE_CENTS[id];
}
export function garmentPrice(id,fallback=0,now=Date.now()){
  return Object.prototype.hasOwnProperty.call(BASE_CENTS,id)?garmentPriceCents(id,now)/100:Number(fallback)||0;
}
