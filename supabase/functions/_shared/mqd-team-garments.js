import {validateTeamMaster} from './mqd-team-masters.js';
import {GARMENT_MAPPING} from './shirt-games/mapping.js';
import {garmentPriceCents} from './mqd-promotion-pricing.js';
export const TEAM_3D_GARMENTS=Object.freeze({tshirt:'Short-sleeve T-shirt','long-sleeve-tshirt':'Long-sleeve T-shirt','short-sleeve-polo':'Short-sleeve polo','long-sleeve-polo':'Long-sleeve polo','fleece-hoodie':'Hoodie'});
// Owner staging is private: it never enables a garment in the saved/published setup.
export function ownerGarmentShop(shop,productId){
 if(!Object.hasOwn(TEAM_3D_GARMENTS,productId))throw new Error('Choose a supported team garment.');
 const next=structuredClone(shop),base=Object.values(shop.garments)[0];
 next.engines=['3d'];next.garments={[productId]:shop.garments[productId]||{brand:'',style:'',sizes:base?.sizes||['S','M','L','XL','2XL'],colors:['White'],logoPreset:{mode:'none'}}};
 next.pricing.premiumCents={[productId]:garmentPriceCents(productId)};next.pricing.baseCents={};return next;
}

// Copy normalized placements into the destination's existing mapping. This is a
// review draft, not a promise that different garments have identical physical fit.
export function copyOwnerGarmentMaster(source,productId,movableTextLayers=[]){
 validateTeamMaster(source);const mapping=GARMENT_MAPPING[productId];if(!Object.hasOwn(TEAM_3D_GARMENTS,productId)||!mapping)throw new Error('Choose a supported team garment.');
 if(!Array.isArray(movableTextLayers))throw new Error('Choose the name fields explicitly.');
 for(const field of movableTextLayers)if(!source.payload.design.zones[field.zone]?.layers.some(l=>l.id===field.layerId&&l.type==='text'))throw new Error('Only saved text layers can become member name fields.');
 for(const [zone,state]of Object.entries(source.payload.design.zones))if(!mapping.zones.includes(zone)&&state.layers.length)throw new Error('Artwork in '+zone+' has no matching zone on '+TEAM_3D_GARMENTS[productId]+'. Place it manually; no layer was discarded.');
 const next=structuredClone({...source,payload:{...source.payload,design:{...source.payload.design,zones:{}}}}),color=source.payload.design.teamPermissions?.wholeGarmentColor?source.payload.design.zones.Front.background:'#FFFFFF';
 next.name=(source.name+' · '+TEAM_3D_GARMENTS[productId]).slice(0,100);next.payload.product={id:productId,model:mapping.model};next.payload.templates=structuredClone(mapping.templates);next.payload.engine={calibration:productId==='tshirt'?'v26-surface-uv-collar-strip':'legacy-preview'};next.payload.activeZone='Front';
 next.payload.design.zones=Object.fromEntries(mapping.zones.map(zone=>{const state=source.payload.design.zones[zone]||{background:color,layers:[]};return[zone,{...structuredClone({...state,layers:[]}),layers:state.layers.map(layer=>{const {src,...rest}=layer;return{...structuredClone(rest),...(src===undefined?{}:{src})};})}];}));
 next.rules=next.rules.filter(rule=>mapping.zones.includes(rule.zone));for(const rule of next.rules)if(movableTextLayers.some(field=>field.zone===rule.zone&&field.layerId===rule.layerId)){rule.role='text';rule.allowMove=true;rule.maxLength=rule.maxLength||24;rule.label=rule.zone+' name';}
 validateTeamMaster(next);return next;
}
