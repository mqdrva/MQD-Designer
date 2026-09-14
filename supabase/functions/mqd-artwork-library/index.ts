import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const allowedOrigins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':allowedOrigins.has(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'private, no-store'}});}
function serviceKey(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json(req,{error:'Backend service credentials are not configured'},500);
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return json(req,{error:'Sign in is required'},401);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);if(userError||!user)return json(req,{error:'Your sign-in session is invalid or expired'},401);
    const body=await req.json().catch(()=>({})),action=String(body?.action||'');if(action!=='catalog')return json(req,{error:'Unsupported action'},400);
    const productId=String(body?.productId||'').slice(0,100),zone=String(body?.zone||'').slice(0,100);if(!productId||!zone)return json(req,{error:'Product and print zone are required'},400);
    const {data:placements,error:placementError}=await supabase.from('mqd_library_asset_placements').select('asset_id,x,y,scale,rotation,flip_x,flip_y,crop').eq('product_id',productId).eq('zone_name',zone);
    if(placementError)return json(req,{error:placementError.message},500);if(!placements?.length)return json(req,{assets:[]});
    const ids=[...new Set(placements.map(row=>row.asset_id))],{data:assets,error:assetError}=await supabase.from('mqd_library_assets').select('id,name,slug,category,placement_mode,render_path,sort_order').in('id',ids).eq('active',true).order('sort_order').order('name');
    if(assetError)return json(req,{error:assetError.message},500);if(!assets?.length)return json(req,{assets:[]});
    const {data:signed,error:signedError}=await supabase.storage.from('mqd-library-assets').createSignedUrls(assets.map(asset=>asset.render_path),600);
    if(signedError)return json(req,{error:signedError.message},500);const urls=new Map((signed||[]).map(row=>[row.path,row.signedUrl]));const byPlacement=new Map(placements.map(row=>[row.asset_id,row]));
    return json(req,{assets:assets.map(asset=>{const p=byPlacement.get(asset.id);return{id:asset.id,name:asset.name,slug:asset.slug,category:asset.category,placementMode:asset.placement_mode,renderUrl:urls.get(asset.render_path),placement:{x:Number(p?.x)||0,y:Number(p?.y)||0,scale:Number(p?.scale)||1,rotation:Number(p?.rotation)||0,flipX:!!p?.flip_x,flipY:!!p?.flip_y,crop:p?.crop||{left:0,top:0,right:0,bottom:0}}};}).filter(asset=>asset.renderUrl)});
  }catch(error){console.error(error);return json(req,{error:error instanceof Error?error.message:String(error)},500);}
});
