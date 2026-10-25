import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import Stripe from 'npm:stripe@22.6.0';
import {teamConfig,checked,objectId,teamMail,secret,BASE_URL} from '../mqd-team-service/runtime.js';
import {ownedTeamSubscription,refundedGarments,nextMonthReward,teamAccess} from './contract.js';
const EVENT_TYPES=new Set(['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.created','invoice.paid','invoice.payment_failed','charge.refunded','charge.dispute.created','charge.dispute.closed']);
Deno.serve(async(req:Request)=>{
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return json({error:'Method unavailable.'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),config=await teamConfig(db);
 if(!config.ready)return json({error:'Team webhook is awaiting configuration.'},503);
 const stripe=new Stripe(config.key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});
 let event:any,lease=crypto.randomUUID();
 try{const reader=req.body?.getReader();if(!reader)throw new Error('missing');let raw='',length=0;const decoder=new TextDecoder();while(true){const p=await reader.read();if(p.done)break;length+=p.value.length;if(length>512000){await reader.cancel();throw new Error('large');}raw+=decoder.decode(p.value,{stream:true});}raw+=decoder.decode();event=await stripe.webhooks.constructEventAsync(raw,req.headers.get('stripe-signature')||'',config.webhook,300,Stripe.createSubtleCryptoProvider());}catch{return json({error:'Invalid webhook signature.'},400);}
 if(event.livemode!==config.live||!EVENT_TYPES.has(event.type))return json({received:true,ignored:true});
 try{
  const claim=await db.rpc('mqd_claim_team_event',{p_event:event.id,p_type:event.type,p_lease:lease});if(claim.error)throw claim.error;if(!claim.data)return json({received:true,duplicate:true});
  const object=event.data.object;
  if(event.type.startsWith('checkout.session.')){
   const session=await stripe.checkout.sessions.retrieve(object.id);if(session.livemode!==config.live)throw new Error('Checkout environment mismatch');
   const order=await checked(db.from('mqd_team_orders').select('*').eq('livemode',config.live).eq('checkout_id',session.id).maybeSingle());
   const batch=await checked(db.from('mqd_team_batches').select('*').eq('livemode',config.live).eq('shipping_checkout_id',session.id).maybeSingle());
   const account=await checked(db.from('mqd_team_accounts').select('*').eq('livemode',config.live).eq('stripe_checkout_id',session.id).maybeSingle());
   if(order){
    if(session.mode!=='payment'||session.amount_total!==order.garment_cents+order.shipping_cents||session.currency!=='usd')throw new Error('Team order payment mismatch');
    if(session.payment_status==='paid'){
     const pi=await stripe.paymentIntents.retrieve(objectId(session.payment_intent),{expand:['latest_charge']});if(pi.livemode!==config.live||pi.status!=='succeeded'||pi.amount_received!==session.amount_total)throw new Error('Payment confirmation mismatch');
     const charge:any=pi.latest_charge,refund=Number(charge?.amount_refunded||0),refundQuantity=refundedGarments(order.quantity,order.garment_cents,refund);
     const b=order.batch_id?await checked(db.from('mqd_team_batches').select('*').eq('id',order.batch_id).eq('team_id',order.team_id).single()):null;
     const confirmedAt=order.paid_at||new Date(event.created*1000).toISOString();const late=b&&(Date.parse(confirmedAt)>Date.parse(b.cutoff_at)||['in_production','shipped'].includes(b.status)),status=b?(late?'late_review':'batch_waiting'):'ready';
     await checked(db.from('mqd_team_orders').update({payment_status:refundQuantity>=order.quantity?'refunded':'paid',production_status:refundQuantity>=order.quantity||order.disputed?'canceled':['in_production','shipped'].includes(order.production_status)?order.production_status:status,payment_intent:pi.id,paid_at:confirmedAt,refunded_quantity:refundQuantity,refunded_cents:refund,disputed:order.disputed||!!charge?.disputed,shipping_address:order.delivery==='individual'?(session.collected_information?.shipping_details||session.shipping_details||null):null,reserved_until:null}).eq('id',order.id));
     await teamMail(db,'paid-'+order.id,order.customer.email,'Your MYMERCHNOW Team order is paid','Your order for '+order.quantity+' garment(s) is paid. '+(b?'It will ship with your team after the ordering cutoff: '+new Date(b.cutoff_at).toLocaleDateString('en-US',{timeZone:'America/New_York'})+'.':'It will ship individually to your checkout address.')+' Production and shipping timing are separate from the ordering deadline. Reference: '+order.id,config.live);
     const owner=await secret(db,'mqd_owner_order_email')||'mqdrva@gmail.com';await teamMail(db,'owner-paid-'+order.id,owner,'Paid Team order ready for review','A paid Team order for '+order.quantity+' garment(s) is available in '+BASE_URL+'/team-admin.html. '+(late?'Payment completed after the batch cutoff and needs review.':''),config.live);
    }else if(['checkout.session.async_payment_failed','checkout.session.expired'].includes(event.type)&&!order.paid_at)await checked(db.from('mqd_team_orders').update({payment_status:'failed',reserved_until:null}).eq('id',order.id));
    else if(session.status==='complete'&&!order.paid_at)await checked(db.from('mqd_team_orders').update({payment_status:'pending',reserved_until:null}).eq('id',order.id));
   }else if(batch){
    const a=await checked(db.from('mqd_team_accounts').select('*').eq('team_id',batch.team_id).single());
    if(session.mode!=='payment'||objectId(session.customer)!==a.stripe_customer_id||session.amount_total!==2500||session.currency!=='usd')throw new Error('Team shipment payment mismatch');
    if(session.payment_status==='paid'&&!batch.shipping_paid_at){
     const start=new Date(),cutoff=new Date(start.getTime()+batch.days*86400000),active=teamAccess(a);
     if(batch.status!=='approved'||!batch.approved_at||!batch.max_quantity)throw new Error('Batch was not approved for shipping.');
     await checked(db.rpc('mqd_open_team_batch',{p_team:batch.team_id,p_batch:batch.id,p_intent:objectId(session.payment_intent),p_paid_at:start.toISOString()}));
    }
   }else if(account&&session.subscription){
    if(session.mode!=='subscription'||objectId(session.customer)!==account.stripe_customer_id)throw new Error('Team subscription checkout mismatch');
    const sub=await stripe.subscriptions.retrieve(objectId(session.subscription),{expand:['latest_invoice']});
    ownedTeamSubscription(sub,{...account,stripe_subscription_id:sub.id},config.price,config.live);
    await checked(db.from('mqd_team_accounts').update({stripe_subscription_id:sub.id}).eq('team_id',account.team_id));
    await syncSubscription(sub,{...account,stripe_subscription_id:sub.id});
   }
  }else if(event.type.startsWith('charge.')){
   const charge=event.type==='charge.refunded'?await stripe.charges.retrieve(object.id):await stripe.charges.retrieve(objectId(object.charge));
   if(charge.livemode!==config.live)throw new Error('Charge environment mismatch');const pi=objectId(charge.payment_intent);
   const order=pi?await checked(db.from('mqd_team_orders').select('*').eq('livemode',config.live).eq('payment_intent',pi).maybeSingle()):null;
   if(order){if(charge.amount!==order.garment_cents+order.shipping_cents)throw new Error('Refund ownership mismatch');const q=refundedGarments(order.quantity,order.garment_cents,charge.amount_refunded);
    // Disputed units stay excluded until owner review; a closed dispute does not silently restore production.
    const disputed=order.disputed||event.type==='charge.dispute.created';await checked(db.from('mqd_team_orders').update({refunded_quantity:q,refunded_cents:charge.amount_refunded,disputed,payment_status:q>=order.quantity?'refunded':order.payment_status,...(disputed||q>=order.quantity?{production_status:'canceled'}:{})}).eq('id',order.id));
   }
   const batch=pi?await checked(db.from('mqd_team_batches').select('*').eq('livemode',config.live).eq('shipping_payment_intent',pi).maybeSingle()):null;
   if(batch&&(charge.amount_refunded>0||event.type==='charge.dispute.created'))await checked(db.from('mqd_team_batches').update({shipping_refunded:true,status:batch.status==='open'?'closed':batch.status}).eq('id',batch.id));
  }else{
   const customer=objectId(object.customer);const a=customer?await checked(db.from('mqd_team_accounts').select('*').eq('livemode',config.live).eq('stripe_customer_id',customer).maybeSingle()):null;
   if(a){
    const subscriptionId=event.type.startsWith('customer.subscription.')?object.id:objectId(object.parent?.subscription_details?.subscription);
    if(!subscriptionId)throw new Error('Invoice subscription reference is missing.');
    if(a.stripe_subscription_id&&a.stripe_subscription_id!==subscriptionId){/* Unrelated old subscription. */}
    else{
     if(!a.stripe_subscription_id){if(!a.stripe_checkout_id)throw new Error('Team subscription checkout is not saved yet');const checkout=await stripe.checkout.sessions.retrieve(a.stripe_checkout_id);if(objectId(checkout.subscription)!==subscriptionId)throw new Error('Team subscription is not bound yet');await checked(db.from('mqd_team_accounts').update({stripe_subscription_id:subscriptionId}).eq('team_id',a.team_id));a.stripe_subscription_id=subscriptionId;}
     const sub=await stripe.subscriptions.retrieve(subscriptionId,{expand:['latest_invoice']});ownedTeamSubscription(sub,a,config.price,config.live);
     if(event.type==='invoice.created'&&object.billing_reason==='subscription_cycle'){
      const invoice=await stripe.invoices.retrieve(object.id,{expand:['lines.data.pricing.price_details.price']});
      if(invoice.status!=='draft'||invoice.currency!=='usd'||objectId(invoice.customer)!==a.stripe_customer_id||objectId(invoice.parent?.subscription_details?.subscription)!==sub.id)throw new Error('Reward invoice ownership mismatch');
      const lines=invoice.lines.data.filter((l:any)=>objectId(l.pricing?.price_details?.price)===config.price);if(lines.length!==1||lines[0].amount!==2000||lines[0].quantity!==1||!(invoice.subtotal===2000||invoice.subtotal===0&&invoice.lines.data.some((l:any)=>l.amount===-2000&&l.metadata?.service==='mqd-teams'&&l.metadata?.team===a.team_id)))throw new Error('Reward applies only to the $20 Team renewal.');
      const start=new Date(lines[0].period.start*1000).toISOString(),prior=await checked(db.from('mqd_team_periods').select('*').eq('team_id',a.team_id).eq('period_end',start).maybeSingle());
      if(prior){const orders=await checked(db.from('mqd_team_orders').select('payment_status,paid_at,quantity,refunded_quantity,disputed').eq('team_id',a.team_id));const reward=nextMonthReward(orders,prior.period_start,prior.period_end,a.reward_quantity??10);
       if(reward.creditCents){
        await checked(db.from('mqd_team_rewards').upsert({invoice_id:invoice.id,team_id:a.team_id,period_start:prior.period_start,period_end:prior.period_end,quantity:reward.garments,credit_cents:2000},{onConflict:'invoice_id',ignoreDuplicates:true}));
        const item=await stripe.invoiceItems.create({customer:a.stripe_customer_id,invoice:invoice.id,amount:-2000,currency:'usd',description:'Team reward: '+reward.target+' paid garments in the previous subscription month',metadata:{service:'mqd-teams',team:a.team_id}},{idempotencyKey:'team-reward-'+invoice.id});
        await checked(db.from('mqd_team_rewards').update({invoice_item_id:item.id,status:'applied'}).eq('invoice_id',invoice.id));
       }
      }
     }
     if(event.type==='invoice.paid'){
      const invoice=await stripe.invoices.retrieve(object.id);if(invoice.status!=='paid'||invoice.currency!=='usd'||objectId(invoice.customer)!==a.stripe_customer_id)throw new Error('Paid invoice mismatch');
      const line=invoice.lines.data.find((l:any)=>objectId(l.pricing?.price_details?.price)===config.price);if(!line)throw new Error('Team plan invoice line missing');
      await checked(db.from('mqd_team_periods').upsert({team_id:a.team_id,period_start:new Date(line.period.start*1000).toISOString(),period_end:new Date(line.period.end*1000).toISOString(),invoice_id:invoice.id},{onConflict:'team_id,period_start'}));
     }
     await syncSubscription(sub,a);
    }
   }
  }
  await checked(db.rpc('mqd_close_team_batches'));
  await checked(db.from('mqd_team_events').update({status:'processed',processed_at:new Date().toISOString(),lease_until:null,lease_id:null}).eq('event_id',event.id).eq('lease_id',lease));return json({received:true});
  async function syncSubscription(sub:any,a:any){
   const item=sub.items.data[0],paid=sub.latest_invoice?.status==='paid',status=sub.status==='active'&&!paid?'payment_pending':sub.status;
   const end=new Date(item.current_period_end*1000).toISOString(),start=new Date(item.current_period_start*1000).toISOString();
   if(paid&&objectId(sub.latest_invoice))await checked(db.from('mqd_team_periods').upsert({team_id:a.team_id,period_start:start,period_end:end,invoice_id:objectId(sub.latest_invoice)},{onConflict:'team_id,period_start'}));
   await checked(db.rpc('mqd_sync_team_subscription',{p_team:a.team_id,p_customer:a.stripe_customer_id,p_subscription:sub.id,p_live:config.live,p_status:status,p_start:start,p_end:end,p_cancel:!!sub.cancel_at_period_end}));
  }
 }catch{if(event?.id)await db.from('mqd_team_events').update({lease_id:null,lease_until:null}).eq('event_id',event.id).eq('lease_id',lease);return json({error:'Team payment synchronization needs retry.'},503);}
});
