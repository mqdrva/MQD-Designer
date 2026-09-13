import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const cors={"access-control-allow-origin":"*","access-control-allow-headers":"content-type"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
function serviceKey(){const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return json({error:'Method not allowed'},405);
  try{
    const requestUrl=new URL(req.url),sessionId=(requestUrl.searchParams.get('session_id')||'').trim();
    if(!/^cs_(test_)?[A-Za-z0-9_]+$/.test(sessionId))return json({error:'Invalid session'},400);
    const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json({error:'Backend not configured'},500);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await supabase.from('mqd_orders')
      .select('order_number,status,product_name,product_price,amount_paid,currency,paid_at,stripe_payment_status')
      .eq('stripe_checkout_session_id',sessionId).order('created_at',{ascending:true});
    if(error)return json({error:error.message},500);
    if(!data?.length)return json({ok:true,pending:true});
    const orders=data.map(row=>({
      orderNumber:row.order_number,status:row.status,productName:row.product_name,
      productPrice:Number(row.product_price||0),amountPaid:row.amount_paid==null?null:Number(row.amount_paid),
      currency:row.currency||'USD',paidAt:row.paid_at,paymentStatus:row.stripe_payment_status
    }));
    const allPaid=orders.every(row=>row.status==='paid'||row.paymentStatus==='paid');
    const amountPaid=orders.reduce((sum,row)=>sum+(row.amountPaid??row.productPrice),0);
    return json({
      ok:true,pending:false,orders,
      orderNumber:orders.map(row=>row.orderNumber).join(', '),
      productName:orders.length===1?orders[0].productName:`${orders.length} customized products`,
      amountPaid,currency:orders[0].currency||'USD',
      status:allPaid?'paid':orders[0].status,
      paymentStatus:allPaid?'paid':orders[0].paymentStatus
    });
  }catch(error){return json({error:error instanceof Error?error.message:String(error)},500);}
});
