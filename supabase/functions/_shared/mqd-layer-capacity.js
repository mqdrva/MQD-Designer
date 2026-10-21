// Capacity only: no garment geometry, placement, or rendering changes.
export const TOP_BACK_PRODUCTS = Object.freeze(['tshirt','long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie','lightweight-jacket','hood-mask-shirt','hooded-long-sleeve']);
export function maxZoneLayers(product,zone){return zone==='Back'&&TOP_BACK_PRODUCTS.includes(typeof product==='string'?product:product?.id)?9:6;}
