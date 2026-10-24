import {colorsForProduct,sizesForProduct} from './everyday-catalog.js';
export const shopColors=(shop,id)=>shop.garments?.[id]?.colors || colorsForProduct(id);
export const shopSizes=(shop,id,color)=>shop.garments?.[id]?.sizes || sizesForProduct(id,color);
export const garmentLabel=(shop,id,fallback)=>{const garment=shop.garments?.[id],details=[garment?.brand,garment?.style].filter(value=>typeof value==='string'&&value.trim()).join(' ');return details?`${fallback} · ${details}`:fallback;};
