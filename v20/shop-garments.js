import {colorsForProduct,sizesForProduct} from './everyday-catalog.js';
export const shopColors=(shop,id)=>shop.garments?.[id]?.colors || colorsForProduct(id);
export const shopSizes=(shop,id,color)=>shop.garments?.[id]?.sizes || sizesForProduct(id,color);
export const garmentLabel=(shop,id,fallback)=>shop.garments?.[id] ? `${fallback} · ${shop.garments[id].brand} ${shop.garments[id].style}` : fallback;
