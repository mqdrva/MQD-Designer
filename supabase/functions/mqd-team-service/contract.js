export const TEAM_POLICY_VERSION='2026-10-22';
export const TEAM_FEE_CENTS=2000,TEAM_REWARD_QUANTITY=10,TEAM_BATCH_SHIPPING_CENTS=2500;
export const DAY_MS=86400000;
export function batchWindow(opensAt,cutoffAt){
 const start=Date.parse(opensAt),end=Date.parse(cutoffAt),days=(end-start)/DAY_MS;
 if(!Number.isFinite(days)||days<7||days>14)throw new Error('Choose a cutoff 7–14 days after ordering opens.');
 return {opensAt:new Date(start).toISOString(),cutoffAt:new Date(end).toISOString()};
}
export function batchOrderable(batch,now=Date.now()){
 return batch?.status==='open'&&!!batch.shipping_paid_at&&!!batch.approved_at&&Date.parse(batch.opens_at)<=now&&Date.parse(batch.cutoff_at)>now;
}
export function teamAccess(account,now=Date.now()){
 return account?.status==='active'&&['active','paid'].includes(account.billing_status)&&Date.parse(account.period_end)>now;
}
export function paidGarmentCount(orders,start,end){
 const from=Date.parse(start),to=Date.parse(end);if(!(to>from))throw new Error('Billing period is invalid.');
 return orders.reduce((sum,o)=>{
  const paid=Date.parse(o.paid_at);if(o.payment_status!=='paid'||o.disputed||!(paid>=from&&paid<to))return sum;
  const q=Number(o.quantity),refund=Number(o.refunded_quantity||0);
  if(!Number.isSafeInteger(q)||q<1||!Number.isSafeInteger(refund)||refund<0||refund>q)throw new Error('Order quantity is invalid.');
  return sum+q-refund;
 },0);
}
// A partial refund is conservatively translated to whole units for reward eligibility.
export function refundedGarments(quantity,garmentCents,refundedCents){
 if(!Number.isSafeInteger(quantity)||quantity<1||!Number.isSafeInteger(garmentCents)||garmentCents<1||!Number.isSafeInteger(refundedCents)||refundedCents<0)throw new Error('Refund details are invalid.');
 return Math.min(quantity,Math.ceil(quantity*Math.min(garmentCents,refundedCents)/garmentCents));
}
export function nextMonthReward(orders,start,end,target=TEAM_REWARD_QUANTITY){if(!Number.isSafeInteger(target)||target<1||target>500)throw new Error('Invalid reward target.');const garments=paidGarmentCount(orders,start,end);return {garments,target,remaining:Math.max(0,target-garments),creditCents:garments>=target?TEAM_FEE_CENTS:0};}
export function deliveryMode(value){if(!['individual','team'].includes(value))throw new Error('Choose individual shipping or a combined team batch.');return value;}
export function batchDraft(raw,now=Date.now()){
 if(!Number.isInteger(raw.days)||raw.days<7||raw.days>14)throw new Error('Choose an ordering window of 7–14 whole days.');
 const opensAt=new Date(now).toISOString(),cutoff=new Date(now+Number(raw.days)*DAY_MS).toISOString();batchWindow(opensAt,cutoff);
 if(!Number.isInteger(raw.expectedQuantity)||raw.expectedQuantity<1||raw.expectedQuantity>500)throw new Error('Enter the expected number of garments, from 1 to 500.');
 const address=raw.address;if(!address||['name','line1','city','state','postal_code','country'].some(k=>typeof address[k]!=='string'||!address[k].trim()||address[k].length>120)||address.country!=='US'||typeof(address.line2||'')!=='string'||(address.line2||'').length>120)throw new Error('Enter the team’s complete US shipping address.');
 return {days:raw.days,expected_quantity:raw.expectedQuantity,shipping_address:Object.fromEntries(['name','line1','line2','city','state','postal_code','country'].map(k=>[k,String(address[k]||'').trim()]))};
}
export function ownedTeamSubscription(subscription,account,price,live){
 const id=v=>typeof v==='string'?v:v?.id,items=subscription.items?.data||[];
 if(subscription.livemode!==live||id(subscription.customer)!==account.stripe_customer_id||subscription.id!==account.stripe_subscription_id||items.length!==1||items[0].price.id!==price||items[0].quantity!==1)throw new Error('Team subscription ownership mismatch.');
 return subscription;
}
