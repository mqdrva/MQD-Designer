import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { escapeMqdEmailHtml, queueMqdEmail, retryPendingMqdEmails } from "../_shared/mqd-email.js";
import { hasAdminMfa } from "../_shared/mqd-admin-security.js";

const allowedOrigins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function allowedOrigin(origin:string){return allowedOrigins.has(origin)||/^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);}
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'private, no-store'}});}
function serviceKey(){const legacy=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(legacy)return legacy;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{return '';}}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUS_MAP:Record<string,string>={new:'submitted',submitted:'submitted',paid:'paid','in-production':'production',production:'production',shipped:'shipped',completed:'completed'};
const UI_STATUS:Record<string,string>={submitted:'new',paid:'paid',production:'in-production',shipped:'shipped',completed:'completed',cancelled:'cancelled',draft:'new'};
function cleanText(value:unknown,max=120){return String(value??'').trim().slice(0,max);}
function matchesStatus(raw:string,filter:string){if(!filter||filter==='all')return true;return UI_STATUS[raw]===filter||raw===filter;}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();
    if(!url||!key)return json(req,{error:'Backend service credentials are not configured'},500);
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!token)return json(req,{error:'Owner sign-in is required'},401);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return json(req,{error:'Your sign-in session is invalid or expired'},401);
    if(user.app_metadata?.role!=='admin')return json(req,{error:'Owner Orders access is required'},403);
    if(!await hasAdminMfa(supabase,token))return json(req,{error:'Verify your owner account with an authenticator code.',code:'MFA_REQUIRED'},403);

    const body=await req.json().catch(()=>({})),action=String(body?.action||'list');

    if(action==='backup-list'){
      const bucket=String(body.bucket||''),prefix=String(body.prefix||''),offset=Number(body.offset||0);
      if(!['garments','customer-artwork','mqd-library-assets','mqd-production'].includes(bucket)||prefix.length>1024||prefix.split('/').some(p=>p==='.'||p==='..')||!Number.isSafeInteger(offset)||offset<0)return json(req,{error:'Invalid backup request'},400);
      const {data:rows,error}=await supabase.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
      if(error)return json(req,{error:'Could not list backup files'},500);
      const files=(rows||[]).filter((r:any)=>r.id),paths=files.map((r:any)=>[prefix,r.name].filter(Boolean).join('/'));
      const signed=paths.length?await supabase.storage.from(bucket).createSignedUrls(paths,3600):{data:[],error:null};
      if(signed.error||(signed.data||[]).some((r:any)=>r.error||!r.signedUrl))return json(req,{error:'Could not authorize backup downloads'},500);
      return json(req,{folders:(rows||[]).filter((r:any)=>!r.id).map((r:any)=>[prefix,r.name].filter(Boolean).join('/')),files:files.map((r:any,i:number)=>({path:paths[i],size:Number(r.metadata?.size)||0,updatedAt:r.updated_at,url:signed.data?.[i]?.signedUrl})),nextOffset:rows?.length===100?offset+100:null});
    }

    if(action==='list'){
      try{await retryPendingMqdEmails(supabase,5);}catch(error){console.error('MQD pending email retry skipped',error instanceof Error?error.message:String(error));}
      const filter=cleanText(body?.status||'all',30).toLowerCase(),search=cleanText(body?.search||'',160).toLowerCase();
      const {data:orders,error:ordersError}=await supabase.from('mqd_orders')
        .select('id,order_number,status,is_test,customer_name,customer_email,customer_phone,shipping_name,product_id,product_name,product_price,amount_paid,currency,paid_at,mockup_path,background_colors,tracking_number,shipping_carrier,production_started_at,shipped_at,completed_at,created_at,updated_at')
        .order('created_at',{ascending:false}).limit(300);
      if(ordersError)return json(req,{error:ordersError.message},500);
      const ids=(orders||[]).map((row:any)=>row.id);
      const {data:items,error:itemsError}=ids.length?await supabase.from('mqd_order_items').select('id,order_id,product_id,product_name,unit_price,quantity,order_options').in('order_id',ids):{data:[],error:null};
      if(itemsError)return json(req,{error:itemsError.message},500);
      const byOrder=new Map<string,any[]>();for(const item of items||[]){const list=byOrder.get(item.order_id)||[];list.push(item);byOrder.set(item.order_id,list);}
      const all=orders||[],production=all.filter((row:any)=>row.is_test!==true),tests=all.filter((row:any)=>row.is_test===true),filtered=all.filter((row:any)=>{
        if(filter==='test'){if(row.is_test!==true)return false;}else{if(row.is_test===true)return false;if(!matchesStatus(String(row.status||''),filter))return false;}
        if(!search)return true;
        const hay=[row.order_number,row.customer_name,row.customer_email,row.customer_phone,row.shipping_name,row.product_name].map(v=>String(v||'').toLowerCase()).join(' ');
        return hay.includes(search);
      }).map((row:any)=>({...row,ui_status:UI_STATUS[row.status]||row.status,items:byOrder.get(row.id)||[]}));
      const counts={all:production.length,new:0,paid:0,'in-production':0,shipped:0,completed:0,test:tests.length};
      for(const row of production){const k=UI_STATUS[String(row.status||'')]||String(row.status||'');if(k in counts)(counts as any)[k]++;}
      return json(req,{orders:filtered,counts,limit:300});
    }

    if(action==='detail'){
      const id=cleanText(body?.id,64);if(!UUID.test(id))return json(req,{error:'Invalid order'},400);
      const {data:order,error:orderError}=await supabase.from('mqd_orders').select('*').eq('id',id).maybeSingle();
      if(orderError)return json(req,{error:orderError.message},500);if(!order)return json(req,{error:'Order not found'},404);
      const [{data:items,error:itemError},{data:assets,error:assetError}]=await Promise.all([
        supabase.from('mqd_order_items').select('*').eq('order_id',id).order('created_at'),
        supabase.from('mqd_order_assets').select('*').eq('order_id',id).order('zone_name').order('created_at')
      ]);
      if(itemError)return json(req,{error:itemError.message},500);if(assetError)return json(req,{error:assetError.message},500);
      let mockupUrl:string|null=null;
      if(order.mockup_path){const {data}=await supabase.storage.from('mqd-production').createSignedUrl(order.mockup_path,3600);mockupUrl=data?.signedUrl||null;}
      const paths=(assets||[]).filter((a:any)=>a.storage_path).map((a:any)=>a.storage_path);
      const signed=new Map<string,string>();
      if(paths.length){const {data,error}=await supabase.storage.from('mqd-production').createSignedUrls(paths,3600);if(error)return json(req,{error:error.message},500);for(const row of data||[])if(row.path&&row.signedUrl)signed.set(row.path,row.signedUrl);}
      let savedDesign:any=null;
      if(order.design_id){const {data}=await supabase.from('customer_designs').select('id,name,status,version,preview_path,created_at,updated_at').eq('id',order.design_id).maybeSingle();savedDesign=data||null;if(savedDesign?.preview_path){const {data:preview}=await supabase.storage.from('customer-artwork').createSignedUrl(savedDesign.preview_path,3600);savedDesign.preview_url=preview?.signedUrl||null;}}
      return json(req,{order:{...order,ui_status:UI_STATUS[order.status]||order.status,mockup_url:mockupUrl},items:items||[],assets:(assets||[]).map((a:any)=>({...a,download_url:a.storage_path?signed.get(a.storage_path)||null:null})),savedDesign});
    }

    if(action==='update'){
      const id=cleanText(body?.id,64);if(!UUID.test(id))return json(req,{error:'Invalid order'},400);
      const requested=cleanText(body?.status,30).toLowerCase(),status=STATUS_MAP[requested];if(!status)return json(req,{error:'Unsupported order status'},400);
      const {data:existing,error:existingError}=await supabase.from('mqd_orders').select('id,order_number,status,is_test,customer_email,customer_name,shipping_name,product_name').eq('id',id).maybeSingle();
      if(existingError)return json(req,{error:existingError.message},500);if(!existing)return json(req,{error:'Order not found'},404);
      if(existing.is_test===true)return json(req,{error:'Sandbox test orders are locked and cannot be moved into production or shipping.'},409);
      const trackingNumber=cleanText(body?.trackingNumber,120),carrier=cleanText(body?.carrier,80),now=new Date().toISOString();
      const update:Record<string,unknown>={status,tracking_number:trackingNumber||null,shipping_carrier:carrier||null,updated_at:now};
      if(status==='production')update.production_started_at=now;
      if(status==='shipped')update.shipped_at=now;
      if(status==='completed')update.completed_at=now;
      const {data,error}=await supabase.from('mqd_orders').update(update).eq('id',id).select('id,order_number,status,tracking_number,shipping_carrier,updated_at').maybeSingle();
      if(error)return json(req,{error:error.message},500);if(!data)return json(req,{error:'Order not found'},404);

      let notification:any=null;
      if(status==='shipped'&&existing.status!=='shipped'&&existing.customer_email){
        const customerName=existing.customer_name||existing.shipping_name||'Customer';
        const trackingLine=trackingNumber?`${carrier||'Carrier'} tracking: ${trackingNumber}`:'Tracking information will be provided as soon as it is available.';
        const subject=`Your MQD order ${existing.order_number} has shipped`;
        const text=`Hi ${customerName},\n\nYour Morales Quality Designs order ${existing.order_number} has shipped.\n\nGarment: ${existing.product_name||'Custom garment'}\n${trackingLine}\n\nThank you for your order.`;
        const html=`<p>Hi ${escapeMqdEmailHtml(customerName)},</p><p>Your Morales Quality Designs order <strong>${escapeMqdEmailHtml(existing.order_number)}</strong> has shipped.</p><p><strong>Garment:</strong> ${escapeMqdEmailHtml(existing.product_name||'Custom garment')}<br><strong>${escapeMqdEmailHtml(trackingLine)}</strong></p><p>Thank you for your order.</p>`;
        try{notification=await queueMqdEmail(supabase,{orderId:id,kind:'customer_shipped',recipient:existing.customer_email,subject,html,text,meta:{orderNumber:existing.order_number,carrier,trackingNumber}});}catch(notifyError){console.error('MQD shipping notification queue failed',notifyError instanceof Error?notifyError.message:String(notifyError));}
      }
      return json(req,{ok:true,order:{...data,ui_status:UI_STATUS[data.status]||data.status},notification});
    }

    return json(req,{error:'Unsupported action'},400);
  }catch(error){console.error(error);return json(req,{error:error instanceof Error?error.message:String(error)},500);}
});
