export const POLICY_VERSION='2026-10-12';
export const ACCOUNT_TABLE='mqd_print_shop_subscription_accounts';
export const EVENT_TYPES=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']);
export const objectId=value=>typeof value==='string'?value:value?.id;
export function subscriptionState(subscription,customer,plan,prices,now=Date.now()){
 if(subscription.livemode!==true||objectId(subscription.customer)!==customer)throw new Error('Subscription ownership or environment mismatch.');
 const items=subscription.items?.data||[];
 if(items.length!==1||items[0].price.id!==prices[plan]||items[0].quantity!==1)throw new Error('Subscription does not match the approved designer plan.');
 const period=Number(items[0].current_period_end||subscription.current_period_end);
 const status=subscription.status==='active'&&subscription.latest_invoice?.status!=='paid'?'payment_pending':subscription.status;
 return {stripe_subscription_id:subscription.id,status,period_end:Number.isFinite(period)?new Date(period*1000).toISOString():null,cancel_at_period_end:subscription.cancel_at_period_end===true||(Number.isFinite(period)&&Number(subscription.cancel_at)===period&&subscription.status!=='canceled'),paidAccess:status==='active'&&Number.isFinite(period)&&period*1000>now};
}
export async function configuration(db){
 const read=async name=>{const value=Deno.env.get(name.toUpperCase());if(value)return value;const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');};
 const [key,webhook,portal,p2d,p3d,release]=await Promise.all(['key','webhook_secret','portal','price_2d','price_3d','enabled'].map(suffix=>read('mqd_print_shop_stripe_live_'+suffix)));
 const prices={'2d':p2d,'3d':p3d};
 // Dedicated live credentials only; release remains off until explicitly enabled.
 return {key:/^rk_live_/.test(key)?key:'',webhook,portal,prices,ready:/^rk_live_/.test(key)&&webhook.startsWith('whsec_')&&portal.startsWith('bpc_')&&p2d.startsWith('price_')&&p3d.startsWith('price_')&&p2d!==p3d,enabled:release==='true'&&/^rk_live_/.test(key)&&webhook.startsWith('whsec_')&&portal.startsWith('bpc_')&&p2d.startsWith('price_')&&p3d.startsWith('price_')&&p2d!==p3d};
}
export async function save(db,table,values,filters){let query=db.from(table).update(values);for(const [key,value] of Object.entries(filters))query=query.eq(key,value);const {data,error}=await query.select('*').maybeSingle();if(error||!data)throw new Error('Billing state could not be saved.');return data;}
export async function synchronize(stripe,db,account,plan,subscriptionId){
 const id=subscriptionId||account.stripe_subscription_id;if(!id)return null;
 const config=await configuration(db);
 const sub=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});
 const state=subscriptionState(sub,account.stripe_customer_id,plan,config.prices);
 const {error}=await db.rpc('mqd_sync_print_shop_subscription',{p_business:account.business_id,p_customer:account.stripe_customer_id,p_subscription:state.stripe_subscription_id,p_status:state.status,p_period_end:state.period_end,p_cancel:state.cancel_at_period_end,p_plan:plan,p_lease:account.lease_id});
 if(error)throw new Error('Subscription state could not be saved.');
 return state;
}
