import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS=new Set([
  "https://mymerchnow.app",
  "https://www.mymerchnow.app",
  "https://mqd-designer-vercel.vercel.app"
]);
const json=(body:unknown,status=200,origin="")=>new Response(JSON.stringify(body),{
  status,
  headers:{
    "content-type":"application/json",
    "cache-control":"no-store",
    ...(origin&&ALLOWED_ORIGINS.has(origin)?{"access-control-allow-origin":origin,"vary":"Origin"}:{})
  }
});
function serviceKey(){
  const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
  if(legacy)return legacy;
  try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";}catch{return"";}
}
async function sha256(value:string){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get("origin")||"";
  if(req.method==="OPTIONS"){
    if(!ALLOWED_ORIGINS.has(origin))return new Response(null,{status:403});
    return new Response(null,{status:204,headers:{
      "access-control-allow-origin":origin,
      "access-control-allow-methods":"POST,OPTIONS",
      "access-control-allow-headers":"apikey,authorization,content-type",
      "access-control-max-age":"86400",
      "vary":"Origin"
    }});
  }
  if(req.method!=="POST")return json({error:"Method not allowed"},405,origin);
  if(!ALLOWED_ORIGINS.has(origin))return json({error:"Background removal is only available from the MQD designer."},403,origin);

  try{
    const providerKey=String(Deno.env.get("MQD_PHOTOROOM_API_KEY")||"").trim();
    if(!providerKey)return json({error:"Background removal is not configured yet.",code:"provider_not_configured"},503,origin);

    const url=Deno.env.get("SUPABASE_URL")||"",key=serviceKey();
    if(!url||!key)return json({error:"Background removal service is unavailable."},503,origin);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});

    const forwarded=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim();
    const ip=forwarded||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
    const salt=Deno.env.get("SUPABASE_URL")||"mqd";
    const ipHash=await sha256(ip+"|"+salt);
    const {data:allowed,error:limitError}=await supabase.rpc("mqd_consume_background_removal",{p_ip_hash:ipHash,p_limit:20});
    if(limitError || (allowed!==true && allowed!==false))return json({error:"Usage limits are temporarily unavailable. Please try again later.",code:"rate_limit_unavailable"},503,origin);
    if(allowed===false)return json({error:"Daily background-removal limit reached. Please try again tomorrow.",code:"rate_limited"},429,origin);

    const form=await req.formData();
    const file=form.get("image_file");
    if(!(file instanceof File)||!file.size)return json({error:"Choose an image first."},400,origin);
    if(file.size>15*1024*1024)return json({error:"This image is too large for background removal. Please use an image under 15 MB."},413,origin);
    if(!["image/png","image/jpeg","image/webp"].includes(file.type))return json({error:"Use a PNG, JPG, or WebP image."},400,origin);

    const providerForm=new FormData();
    providerForm.append("image_file",file,file.name||"artwork");
    providerForm.append("format","png");
    providerForm.append("size","full");
    providerForm.append("crop","false");

    const provider=await fetch("https://sdk.photoroom.com/v1/segment",{
      method:"POST",
      headers:{"x-api-key":providerKey},
      body:providerForm
    });
    if(!provider.ok){
      const detail=(await provider.text().catch(()=>"")).slice(0,500);
      console.error("Photoroom background removal failed",provider.status,detail);
      if(provider.status===402||provider.status===403||provider.status===429)return json({error:"Background removal credits are unavailable right now. Please try again later.",code:"provider_quota"},503,origin);
      return json({error:"Background removal could not process this image. Try a clearer logo or a different file.",code:"provider_error"},502,origin);
    }

    const result=await provider.arrayBuffer();
    if(!result.byteLength)return json({error:"Background removal returned an empty image."},502,origin);
    return new Response(result,{
      status:200,
      headers:{
        "content-type":"image/png",
        "cache-control":"no-store",
        "content-disposition":"inline; filename=background-removed.png",
        "access-control-allow-origin":origin,
        "vary":"Origin"
      }
    });
  }catch(error){
    console.error("mqd-remove-background failed",error);
    return json({error:"Background removal could not finish. Please try again."},500,origin);
  }
});
