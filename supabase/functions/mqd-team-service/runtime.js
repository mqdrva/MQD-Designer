import {everydayPricing,EVERYDAY_CATALOG,everydayZone} from '../_shared/mqd-everyday.js';
import {garmentPriceCents,pricingEpoch} from '../_shared/mqd-promotion-pricing.js';
import {requestEstimate,validateGarmentLogo} from '../mqd-print-shop-pilot/contract.js';
export const BASE_URL='https://mymerchnow.app',PUBLIC_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
export const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value)),b=>b.toString(16).padStart(2,'0')).join('');
export const objectId=v=>typeof v==='string'?v:v?.id;
export const secret=async(db,name)=>{const env=Deno.env.get(name.toUpperCase());if(env)return env;const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');};
export async function teamConfig(db){
 const mode=await secret(db,'mqd_team_mode')==='live'?'live':'sandbox',prefix='mqd_team_'+mode;
 const [key,webhook,price,portal,flag]=await Promise.all(['key','webhook_secret','price','portal','enabled'].map(x=>secret(db,prefix+'_'+x)));
 const ready=(mode==='live'?/^rk_live_/:/^rk_test_/).test(key)&&webhook.startsWith('whsec_')&&price.startsWith('price_')&&portal.startsWith('bpc_');
 return {mode,live:mode==='live',key,webhook,price,portal,ready,enabled:ready&&flag==='true'};
}
export function canonicalTeamShop(raw,now=Date.now()){
 const c=everydayPricing(Deno.env.get('MQD_EVERYDAY_PRICING')),shop=structuredClone(raw),allowed2=Object.keys(EVERYDAY_CATALOG),allowed3=['tshirt','long-sleeve-tshirt','short-sleeve-polo','fleece-hoodie'];
 shop.organizationType='team';shop.fulfillmentMode='mymerchnow';shop.engines=['2d','3d'];shop.pilot=false;
 shop.printMethods={transfer:'Standard transfer',dtf:'DTF',dtg:'DTG'};shop.printMethods3d={'all-over':'All-over print'};
 const garments={};for(const [id,g] of Object.entries(shop.garments||{})){
  if(![...allowed2,...allowed3].includes(id))continue;
  const catalog=EVERYDAY_CATALOG[id];if(catalog){g.colors=g.colors.filter(x=>catalog.colors.includes(x));g.sizes=g.sizes.filter(x=>catalog.sizes.includes(x));g.brand='';g.style='';g.printZones=Object.fromEntries((id==='everyday-polo'?['front']:['front','back','left','right']).map(v=>[v,everydayZone(id,'L',v)]));}
  else{g.sizes=g.sizes.filter(x=>['S','M','L','XL','2XL','3XL','4XL','5XL'].includes(x));g.colors=['White'];}
  if(!g.colors.length||!g.sizes.length)throw new Error('Choose supported garment colors and sizes.');garments[id]=g;
 }
 shop.productNames={...Object.fromEntries(Object.entries(EVERYDAY_CATALOG).map(([id,p])=>[id,p.name])),tshirt:'All-Over Print T-Shirt','long-sleeve-tshirt':'All-Over Long Sleeve T-Shirt','short-sleeve-polo':'All-Over Short Sleeve Polo','fleece-hoodie':'All-Over Fleece Hoodie'};
 shop.garments=garments;for(const [id,g] of Object.entries(garments))g.logoPreset=validateGarmentLogo(g.logoPreset,shop,id);
 shop.pricing={version:'team-'+c.version+'-'+pricingEpoch(now),currency:'usd',baseCents:Object.fromEntries(allowed2.filter(x=>garments[x]).map(x=>[x,c.baseCents[x]])),premiumCents:Object.fromEntries(allowed3.filter(x=>garments[x]).map(x=>[x,garmentPriceCents(x,now)])),sizeCents:c.sizeSurchargeCents,methodCents:c.methodCents,methodBackCents:c.methodBackCents,sleeveCents:c.sleeveCents,printRules:{'2d':{},'3d':{}}};
 return shop;
}
export function teamQuote(shop,summary){
 if(summary.engine==='3d'&&summary.printMethod!=='all-over')throw new Error('Choose the approved all-over print method.');
 const quote=requestEstimate(shop,summary);if(quote.quoteRequired||!Number.isSafeInteger(quote.totalCents)||quote.totalCents<50)throw new Error('These garments need an approved price before checkout.');return quote;
}
export async function teamMail(db,id,to,subject,text){
 const key=await secret(db,'mqd_resend_api_key'),from=await secret(db,'mqd_email_from');if(!key||!from)return false;
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'team-'+id},body:JSON.stringify({from,to:[to],subject,text}),signal:AbortSignal.timeout(10000)});return r.ok;
}
export async function checked(query,message='Team data could not be saved.'){const r=await query;if(r.error)throw new Error(message);return r.data;}
export function safeAccount(a){return {teamId:a.team_id,status:a.status,billingStatus:a.billing_status,periodStart:a.period_start,periodEnd:a.period_end,cancelAtPeriodEnd:a.cancel_at_period_end,hasSubscription:!!a.stripe_subscription_id,hasCustomer:!!a.stripe_customer_id};}

export function teamPriceCatalog(){return {pricing:everydayPricing(Deno.env.get('MQD_EVERYDAY_PRICING')),premiumCents:Object.fromEntries(['tshirt','long-sleeve-tshirt','short-sleeve-polo','fleece-hoodie'].map(id=>[id,garmentPriceCents(id)]))};}
