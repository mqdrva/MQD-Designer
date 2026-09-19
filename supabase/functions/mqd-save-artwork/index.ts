import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.95.0";
import {boundedFormData,consumeBudget,UploadError} from "../_shared/mqd-upload-guard.js";
const origins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function headers(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(req)});}
export function validArtworkPath(path:string,userId:string){const parts=path.split('/');return path.length<=1024&&parts.length>=4&&parts[0]===userId&&parts[1]==='designs'&&/^[0-9a-f-]{36}$/i.test(parts[2])&&parts.every(p=>p!=='.'&&p!=='..'&&/^[a-zA-Z0-9._-]+$/.test(p));}
export function imageSignature(bytes:Uint8Array,type:string){return type==='image/png'?bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:type==='image/webp'?new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP':false;}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:headers(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return json(req,{error:'Sign in is required'},401);
    const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error}=await supabase.auth.getUser(token);if(error||!user||user.is_anonymous)return json(req,{error:'Sign in with email or Google to save designs'},401);
    await consumeBudget(supabase,'saved-attempt:'+user.id,200,0);
    await consumeBudget(supabase,'saved-attempt:global',2000,0);
    const form=await boundedFormData(req),path=String(form.get('path')||''),file=form.get('file');
    if(!validArtworkPath(path,user.id))return json(req,{error:'Invalid artwork path'},400);
    if(!(file instanceof File)||!file.size||file.size>20*1024*1024)return json(req,{error:'Choose an image no larger than 20 MiB'},413);
    if(!imageSignature(new Uint8Array(await file.slice(0,12).arrayBuffer()),file.type))return json(req,{error:'Use a valid PNG, JPG, or WebP image'},400);
    await consumeBudget(supabase,'saved-bytes:'+user.id,200,file.size,512*1024*1024);
    await consumeBudget(supabase,'saved-bytes:global',2000,file.size,10*1024*1024*1024);
    const {error:uploadError}=await supabase.storage.from('customer-artwork').upload(path,file,{contentType:file.type,upsert:true});
    if(uploadError)return json(req,{error:'Artwork could not be saved. Please try again.'},500);
    return json(req,{ok:true,path});
  }catch(error){return json(req,{error:error instanceof UploadError?error.message:'Artwork could not be saved. Please try again.'},error instanceof UploadError?error.status:500);}
});
