import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import Stripe from 'npm:stripe@22.6.0';
import {secret,teamConfig,checked,objectId} from '../mqd-team-service/runtime.js';
import {ownedTeamSubscription} from '../mqd-team-service/contract.js';
Deno.serve(async(req:Request)=>{
 const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(req.method!=='POST')return json({error:'Method unavailable'},405);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!),key=await secret(db,'mqd_team_job_secret');
 if(!key||req.headers.get('x-team-job')!==key)return json({error:'Private job authorization required.'},401);
 try{
  const closed=await checked(db.rpc('mqd_close_team_batches')),config=await teamConfig(db);let cleaned=0,reconciled=0;
  const stripe=config.ready?new Stripe(config.key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2}):null;
  if(stripe){
   const accounts=await checked(db.from('mqd_team_accounts').select('*').eq('livemode',config.live).not('stripe_subscription_id','is',null).neq('status','closed').order('updated_at',{ascending:true}).limit(20));
   for(const a of accounts){const sub=await stripe.subscriptions.retrieve(a.stripe_subscription_id,{expand:['latest_invoice']});ownedTeamSubscription(sub,a,config.price,config.live);const item=sub.items.data[0],status=sub.status==='active'&&(sub.latest_invoice as any)?.status!=='paid'?'payment_pending':sub.status;
    await checked(db.rpc('mqd_sync_team_subscription',{p_team:a.team_id,p_customer:a.stripe_customer_id,p_subscription:sub.id,p_live:config.live,p_status:status,p_start:new Date(item.current_period_start*1000).toISOString(),p_end:new Date(item.current_period_end*1000).toISOString(),p_cancel:sub.cancel_at_period_end}));reconciled++;}
  }
  const abandoned=await checked(db.from('mqd_team_orders').select('*').eq('livemode',config.live).in('payment_status',['unpaid','failed']).is('paid_at',null).lt('created_at',new Date(Date.now()-14*86400000).toISOString()).not('package_path','eq','').limit(20));
  for(const order of abandoned){
   if(order.checkout_id){if(!stripe)continue;const session=await stripe.checkout.sessions.retrieve(order.checkout_id);if(session.livemode!==config.live||session.amount_total!==order.garment_cents+order.shipping_cents||session.payment_status==='paid'||session.status!=='expired')continue;}
   const removed=await db.storage.from('mqd-team-production').remove([order.package_path]);if(removed.error)throw new Error('Cleanup needs retry');await checked(db.from('mqd_team_orders').update({package_path:'',production_status:'canceled',reserved_until:null}).eq('id',order.id).is('paid_at',null).in('payment_status',['unpaid','failed']));cleaned++;
  }
  return json({closed,cleaned,reconciled});
 }catch{return json({error:'Team maintenance needs retry.'},503);}
});
