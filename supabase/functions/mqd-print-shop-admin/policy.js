export const ADMIN_ACTIONS=new Set(['pause','resume','extend-trial','trial-plan','cancel-renewal','terminate','discount','remove-discount','refresh-billing']);
export function discountSpec(input,plan){
 const amount=Number(input.value),months=Number(input.months);
 if(!['percent','amount'].includes(input.kind)||!Number.isFinite(amount)||amount<=0||!Number.isInteger(months)||months<1||months>12)throw new Error('Choose a valid discount and 1–12 months.');
 if(input.kind==='percent'&&(amount>100||Math.abs(amount*100-Math.round(amount*100))>.000001))throw new Error('Percentage must be greater than zero and at most 100.');
 if(input.kind==='amount'&&(amount>(plan==='3d'?99:49)||Math.abs(amount*100-Math.round(amount*100))>.000001))throw new Error('Dollar discount cannot exceed the monthly plan price.');
 return {kind:input.kind,value:amount,months,coupon:{duration:'repeating',duration_in_months:months,...(input.kind==='percent'?{percent_off:amount}:{amount_off:Math.round(amount*100),currency:'usd'})}};
}
export function ownedSubscription(sub,account,shop,prices){
 const customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id,items=sub.items?.data||[];
 if(sub.livemode!==true||customer!==account.stripe_customer_id||sub.id!==account.stripe_subscription_id||items.length!==1||items[0].quantity!==1||items[0].price.id!==prices[shop.plan])throw new Error('Subscription ownership or service plan mismatch.');
 return sub;
}
export function localChange(action,shop,account,body,now=Date.now()){
 if(shop.status==='closed')throw new Error('This business is terminated.');
 if(action==='pause')return {status:'suspended'};
 if(action==='resume'){
  if(shop.status!=='suspended'||!shop.email_verified_at||!shop.approved_at)throw new Error('Only an approved paused shop can resume.');
  if(account.stripe_subscription_id){if(account.status!=='active'||!(Date.parse(account.period_end)>now))throw new Error('A current paid subscription is required.');return {status:'active'};}
  if(!(Date.parse(shop.pilot_expires_at)>now))throw new Error('Extend the unpaid trial before resuming.');return {status:'pilot_active'};
 }
 if(action==='extend-trial'){
  if(account.stripe_subscription_id||!shop.approved_at||!shop.email_verified_at||!['pilot_active','suspended'].includes(shop.status))throw new Error('Only approved unpaid trials can be extended.');
  const days=Number(body.days);if(!Number.isInteger(days)||days<1||days>60)throw new Error('Choose 1–60 extra days.');
  return {pilot_expires_at:new Date(Math.max(now,Date.parse(shop.pilot_expires_at)||0)+days*86400000).toISOString()};
 }
 if(action==='trial-plan'){
  if(account.stripe_subscription_id||account.stripe_checkout_id||!['2d','3d'].includes(body.plan)||!shop.email_verified_at||!shop.approved_at||!['pilot_active','suspended'].includes(shop.status)||shop.pending_config)throw new Error('Plan access can be changed only for a reviewed unpaid trial before checkout.');
  return {plan:body.plan};
 }
 throw new Error('Choose a valid business action.');
}
