import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const allowedOrigins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function allowedOrigin(origin:string){return allowedOrigins.has(origin)||/^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);}
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'private, no-store'}});}
function serviceKey(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';}
function placement(row:any){return{x:Number(row?.x)||0,y:Number(row?.y)||0,scale:Number(row?.scale)||1,rotation:Number(row?.rotation)||0,flipX:!!row?.flip_x,flipY:!!row?.flip_y,crop:row?.crop||{left:0,top:0,right:0,bottom:0}};}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json(req,{error:'Backend service credentials are not configured'},500);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})),action=String(body?.action||'');if(action!=='catalog')return json(req,{error:'Unsupported action'},400);
    const productId=String(body?.productId||'').slice(0,100),zone=String(body?.zone||'').slice(0,100);if(!productId||!zone)return json(req,{error:'Product and print zone are required'},400);
    const {data:placements,error:placementError}=await supabase.from('mqd_library_asset_placements').select('asset_id,zone_name,x,y,scale,rotation,flip_x,flip_y,crop').eq('product_id',productId);
    if(placementError)return json(req,{error:placementError.message},500);
    const currentPlacements=(placements||[]).filter(row=>row.zone_name===zone);
    if(!currentPlacements.length)return json(req,{assets:[]});
    const ids=[...new Set(currentPlacements.map(row=>row.asset_id))],idSet=new Set(ids);
    const {data:assets,error:assetError}=await supabase.from('mqd_library_assets').select('id,name,slug,category,placement_mode,placement_preset,stack_order,render_path,sort_order').in('id',ids).eq('active',true).order('stack_order').order('sort_order').order('name');
    if(assetError)return json(req,{error:assetError.message},500);if(!assets?.length)return json(req,{assets:[]});
    const {data:signed,error:signedError}=await supabase.storage.from('mqd-library-assets').createSignedUrls(assets.map(asset=>asset.render_path),600);
    if(signedError)return json(req,{error:signedError.message},500);
    const urls=new Map((signed||[]).map(row=>[row.path,row.signedUrl])),byPlacement=new Map(currentPlacements.map(row=>[row.asset_id,row])),placementsByAsset=new Map<string,Record<string,unknown>>();
    for(const row of placements||[]){if(!idSet.has(row.asset_id))continue;const zones=placementsByAsset.get(row.asset_id)||{};zones[row.zone_name]=placement(row);placementsByAsset.set(row.asset_id,zones);}
    return json(req,{assets:assets.map(asset=>{const p=byPlacement.get(asset.id);return{id:asset.id,name:asset.name,slug:asset.slug,category:asset.category,placementMode:asset.placement_mode,placementPreset:asset.placement_preset,stackOrder:Number(asset.stack_order)||0,renderUrl:urls.get(asset.render_path),placement:placement(p),placements:placementsByAsset.get(asset.id)||{}};}).filter(asset=>asset.renderUrl)});
  }catch(error){console.error(error);return json(req,{error:error instanceof Error?error.message:String(error)},500);}
});
