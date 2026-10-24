export const SHOP_PRINT_METHODS = Object.freeze({transfer:'Standard transfer',dtf:'DTF',dtg:'DTG',screen:'Screen Printing',htv:'HTV (Heat Transfer Vinyl)',sublimation:'Sublimation'});
export const PILOT_SHOP = Object.freeze({
  slug: 'pilot', name: 'MYMERCHNOW Pilot Shop', logo: '/assets/brand-logo.png',
  tagline: 'Design your shirt. Send your request. Your shop finishes the order.',
  printMethods: SHOP_PRINT_METHODS, printMethods3d: {'all-over':'All-over print', ...SHOP_PRINT_METHODS}, pilot: true, engines: ['2d', '3d'],
  pricing: { version: 'pilot-1', currency: 'usd',
    baseCents: { 'everyday-tshirt': 2000, 'everyday-long-sleeve': 3000, 'everyday-polo': 3000, 'everyday-hoodie': 4000 },
    premiumCents: { tshirt: 4000, 'long-sleeve-tshirt': 5000, 'short-sleeve-polo': 5000, 'fleece-hoodie': 7500 },
    printRules: { '2d': {}, '3d': Object.fromEntries(['transfer','dtf','dtg','htv'].map(id=>[id,{mode:'calculated',setupCents:0,minimumQuantity:1,tiers:[{fromQuantity:1,frontCents:id==='dtg'?1000:id==='transfer'?0:500,backCents:id==='transfer'?1000:500,sleevesCents:500}]}])) },
    methodCents: { transfer: 0, dtf: 500, dtg: 1000, htv:500 },
    methodBackCents: { transfer: 1000, dtf: 500, dtg: 500, htv:500 }, sizeCents: 500, sleeveCents: 500 }
});
export function shopPrintZones(shop,product,size='L') {
  const polo=['everyday-polo','short-sleeve-polo'].includes(product);
  const defaults={front:{width:12,height:15},back:{width:12,height:15},left:{width:3,height:3},right:{width:3,height:3}};
  const configured=shop.garments?.[product]?.printZones;
  if(polo)defaults.front={width:3,height:3};
  else if(!configured&&['XS','S'].includes(size)){defaults.front={width:10,height:12};defaults.back={width:10,height:12};}
  return Object.fromEntries((polo?['front']:['front','back','left','right']).map(view=>{
    const limit=configured?.[view]||defaults[view],maxWidth=polo?5:['left','right'].includes(view)?6:16,maxHeight=polo?5:24;
    if(!Number.isFinite(limit.width)||!Number.isFinite(limit.height)||limit.width<.5||limit.height<.5||limit.width>maxWidth||limit.height>maxHeight)throw new Error('Enter valid print dimensions for this garment.');
    return [view,{label:polo?(shop.garments?.[product]?.logoPreset?.placement==='center'?'Center chest area':'Left chest pocket area'):({front:'Front',back:'Back',left:'Left sleeve',right:'Right sleeve'})[view],width:limit.width,height:limit.height,placement:polo?(shop.garments?.[product]?.logoPreset?.placement||'left-chest'):'standard'}];
  }));
}
export function validPhone(value){if(typeof value!=='string'||value.length>40||!/^[-+0-9\s().]+$/.test(value.trim()))return false;const count=value.replace(/\D/g,'').length;return count>=7&&count<=15;}
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
export const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
// Shared by the public page and request endpoint: never trust a customer-supplied total.
export function methodNeedsQuote(shop, engine, method) {
  if (['screen','sublimation'].includes(method)) return true;
  const rule = shop.pricing.printRules?.[engine]?.[method];
  if (rule) return rule.mode !== 'calculated';
  return engine === '3d' ? method !== 'all-over' : !Number.isSafeInteger(shop.pricing.methodCents?.[method]);
}
function configuredPrintCost(rule, summary, quantity) {
  const cents = value => Number.isSafeInteger(value) && value >= 0 && value <= 10000000;
  if (!cents(rule.setupCents) || !Number.isInteger(rule.minimumQuantity) || rule.minimumQuantity < 1 || rule.minimumQuantity > 500) throw new Error('The shop must review its print pricing.');
  if (quantity < rule.minimumQuantity) throw new Error(`This printing method requires at least ${rule.minimumQuantity} garments.`);
  if (!Array.isArray(rule.tiers) || !rule.tiers.length || rule.tiers.length > 20) throw new Error('The shop must review its quantity pricing.');
  let previous = 0, selected;
  for (const tier of rule.tiers) {
    if (!Number.isInteger(tier.fromQuantity) || tier.fromQuantity <= previous || tier.fromQuantity > 500 || !cents(tier.frontCents) || !cents(tier.backCents) || !cents(tier.sleevesCents)) throw new Error('The shop must review its quantity pricing.');
    previous = tier.fromQuantity;
    if (quantity >= tier.fromQuantity) selected = tier;
  }
  if (!selected) throw new Error('Choose a quantity covered by this shop’s print prices.');
  // Fixed shop-approved rates. Color counts, material exclusions or complex artwork
  // should use quote mode until those requirements are collected explicitly.
  if (summary.locations?.some(v=>!['front','back','left','right'].includes(v))) throw new Error('Automatic estimates support front, back and sleeve printing. Remove other print areas or contact the shop.');
  const locations = summary.locations;
  return {unitCents:(locations.includes('front')?selected.frontCents:0)+(locations.includes('back')?selected.backCents:0)+(locations.some(v=>['left','right'].includes(v))?selected.sleevesCents:0),setupCents:rule.setupCents};
}
export function requestEstimate(shop, summary) {
  const p = shop.pricing;
  if (!shop.engines.includes(summary.engine)) throw new Error('This designer is unavailable for this shop.');
  if(['everyday-polo','short-sleeve-polo','long-sleeve-polo'].includes(summary.productId)&&!(shop.fulfillmentMode==='mymerchnow'&&summary.engine==='3d'&&summary.printMethod==='all-over')&&summary.locations?.some(view=>view!=='front'))throw new Error('Polo printing is available only on the left chest pocket area.');
  const details=shop.garments?.[summary.productId];
  if(details && (!details.colors.includes(summary.color)||!Array.isArray(summary.orderOptions)||summary.orderOptions.some(row=>!details.sizes.includes(row.size))))throw new Error('Choose a color and size this shop offers.');
  const options = summary.orderOptions;
  if (!Array.isArray(options) || !options.length || options.length > 12) throw new Error('Choose your sizes and quantities.');
  let totalQuantity = 0, sizeTotal = 0;
  for (const row of options) {
    if (!['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL'].includes(row.size) || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 99) throw new Error('Choose a valid size and quantity from 1 to 99.');
    totalQuantity += row.quantity;
    if (!['XS','S','M','L','XL'].includes(row.size)) sizeTotal += (shop.fulfillmentMode==='mymerchnow'&&summary.engine==='3d'?0:p.sizeCents) * row.quantity;
  }
  if (totalQuantity > 500) throw new Error('Contact the shop directly for orders over 500 garments.');
  let unitCents;
  const offeredMethods = summary.engine === '3d' ? shop.printMethods3d || shop.printMethods : shop.printMethods;
  let quoteRequired = methodNeedsQuote(shop,summary.engine,summary.printMethod);
  const rule = p.printRules?.[summary.engine]?.[summary.printMethod];
  let setupCents = 0;
  if (!offeredMethods || !Object.hasOwn(offeredMethods, summary.printMethod)) throw new Error('Choose an available print method.');
  if (summary.engine === '2d') {
    const base = p.baseCents[summary.productId], method = p.methodCents[summary.printMethod];
    if (!Number.isSafeInteger(base) || (!quoteRequired && !rule && !Number.isSafeInteger(method))) throw new Error('This garment or print method is unavailable.');
    if (!Array.isArray(summary.locations) || !summary.locations.length || summary.locations.some(v => !['front','back','left','right'].includes(v)) || new Set(summary.locations).size !== summary.locations.length) throw new Error('Add artwork to an available print area.');
    unitCents = base + method + (summary.locations.includes('back') ? p.methodBackCents[summary.printMethod] : 0) + (summary.locations.some(v => ['left','right'].includes(v)) ? p.sleeveCents : 0);
  } else {
    unitCents = p.premiumCents[summary.productId];
    if (!Number.isSafeInteger(unitCents)) throw new Error('This 3D garment is unavailable.');
  }
  if (!['screen','sublimation'].includes(summary.printMethod) && rule?.mode === 'calculated') {
    const printCost = configuredPrintCost(rule,summary,totalQuantity);
    if (!printCost) quoteRequired = true;
    else { unitCents = (summary.engine==='2d'?p.baseCents:p.premiumCents)[summary.productId] + printCost.unitCents; setupCents = printCost.setupCents; }
  }
  if (quoteRequired) return {totalQuantity,totalCents:null,unitCents:null,sizeTotal:null,quoteRequired:true,currency:'usd',pricingVersion:p.version};
  return { quoteRequired:false, totalQuantity, totalCents: unitCents * totalQuantity + sizeTotal + setupCents, unitCents, sizeTotal, setupCents, currency: 'usd', pricingVersion: p.version };
}

// Approved garment logos are separate from the page branding logo.
export function garmentLogo(shop,product){return shop?.garments?.[product]?.logoPreset||{mode:'none'};}
export function validateGarmentLogo(raw,shop,product){
 const v=raw||{mode:'none'};if(!['none','movable','fixed'].includes(v.mode))throw new Error('Choose a valid garment logo option.');
 if(v.mode==='none')return {mode:'none'};
 if(typeof shop.garmentLogo!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(shop.garmentLogo))throw new Error('Upload an original garment logo.');
 const placement=['everyday-polo','short-sleeve-polo'].includes(product)?v.placement:'center';
 if(!['center','left-chest'].includes(placement))throw new Error('Choose a logo position.');
 const zone=shopPrintZones(shop,product).front;
 const width=Number(v.width),height=Number(v.height),top=Number(v.top);
 if(!Number.isFinite(width)||!Number.isFinite(height)||!Number.isFinite(top)||width<.25||height<.25||top<0||width>zone.width||height+top>zone.height)throw new Error('The logo must fit inside the garment’s front print dimensions.');
 return {mode:v.mode,placement,width,height,top};
}
export function fixedLogoLayer(shop,product){
 const preset=garmentLogo(shop,product);if(preset.mode!=='fixed')return null;
 return {id:'shop-fixed-logo',type:'image',label:shop.name+' fixed logo',filename:garmentLogoPath(shop).split('/').at(-1),src:shop.garmentLogo,shopFixed:true,shopLogoPreset:preset,x:0,y:0,scale:1,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true};
}
export function assertFixedLogoPackage(shop,summary,design,manifest){
 const preset=garmentLogo(shop,summary.productId);
 if(preset.mode!=='fixed')return;
 if(!summary.locations?.includes('front')||JSON.stringify(manifest)!==JSON.stringify({product:summary.productId,preset,asset:garmentLogoPath(shop)}))throw new Error('The approved fixed logo is missing. Reload the shop and save again.');
 if(summary.engine==='3d'){
  const layers=design.design?.design?.zones?.Front?.layers||[],actual=layers.at(-1),expected=fixedLogoLayer(shop,summary.productId);
  if(!actual||Object.keys(expected).some(k=>JSON.stringify(actual[k])!==JSON.stringify(expected[k]))||layers.filter(l=>l.shopFixed).length!==1)throw new Error('The fixed logo has changed. Reload the shop and save again.');
 }
}

export function garmentLogoPath(shop){return 'brand/business-logo.'+(shop.garmentLogo?.startsWith('data:image/jpeg;')?'jpg':shop.garmentLogo?.startsWith('data:image/webp;')?'webp':'png');}
