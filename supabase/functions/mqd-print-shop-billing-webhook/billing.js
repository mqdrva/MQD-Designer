export const PRICES={'2d':'price_1UPVVC7T82k3A7TCEGc6sazv','3d':'price_1UPVVI7T82k3A7TCS780cpaO'};
export const ACCOUNT_TABLE='mqd_print_shop_billing_accounts';
export const EVENT_TYPES=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']);
export const objectId=value=>typeof value==='string'?value:value?.id;
export function subscriptionState(subscription,customer,plan,now=Date.now()){
 if(subscription.livemode!==false||objectId(subscription.customer)!==customer)throw new Error('Subscription ownership or environment mismatch.');
 const items=subscription.items?.data||[];
 if(items.length!==1||items[0].price.id!==PRICES[plan]||items[0].quantity!==1)throw new Error('Subscription does not match the approved designer plan.');
 const period=Number(items[0].current_period_end||subscription.current_period_end);
 const status=subscription.status==='active'&&subscription.latest_invoice?.status!=='paid'?'payment_pending':subscription.status;
 return {stripe_subscription_id:subscription.id,status,period_end:Number.isFinite(period)?new Date(period*1000).toISOString():null,cancel_at_period_end:subscription.cancel_at_period_end===true||(Number.isFinite(period)&&Number(subscription.cancel_at)===period&&subscription.status!=='canceled'),testAccess:status==='active'&&Number.isFinite(period)&&period*1000>now};
}
export async function configuration(db){
 const read=async name=>{const value=Deno.env.get(name.toUpperCase());if(value)return value;const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');};
 const key=await read('mqd_print_shop_stripe_test_key'),webhook=await read('mqd_print_shop_stripe_test_webhook_secret'),portal=await read('mqd_print_shop_stripe_test_portal');
 // This integration is deliberately sandbox-only. Never fall back to apparel keys.
 return {key:/^(?:rk|sk)_test_/.test(key)?key:'',webhook,portal,enabled:/^(?:rk|sk)_test_/.test(key)&&webhook.startsWith('whsec_')&&portal.startsWith('bpc_')};
}
export async function save(db,table,values,filters){let query=db.from(table).update(values);for(const [key,value] of Object.entries(filters))query=query.eq(key,value);const {data,error}=await query.select('*').maybeSingle();if(error||!data)throw new Error('Billing state could not be saved.');return data;}
export async function synchronize(stripe,db,account,plan,subscriptionId){
 const id=subscriptionId||account.stripe_subscription_id;if(!id)return null;
 const sub=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});
 const state=subscriptionState(sub,account.stripe_customer_id,plan);
 await save(db,ACCOUNT_TABLE,{stripe_subscription_id:state.stripe_subscription_id,status:state.status,period_end:state.period_end,cancel_at_period_end:state.cancel_at_period_end,updated_at:new Date().toISOString()},{business_id:account.business_id});
 return state;
}
