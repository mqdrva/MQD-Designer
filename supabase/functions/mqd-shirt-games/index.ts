import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {handleGameAction} from '../_shared/shirt-games/service.mjs';
import {createGameRepository} from '../_shared/shirt-games/repository.mjs';
import {garmentPriceCents} from '../_shared/mqd-promotion-pricing.js';
import {hasAdminMfa} from '../_shared/mqd-admin-security.js';
const origins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function allowed(origin:string){return origins.has(origin)||/^https:\/\/mqd-designer-vercel-[a-z0-9-]+\.vercel\.app$/.test(origin)}
function headers(origin:string){return {'Content-Type':'application/json','Cache-Control':'private, no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey, authorization, content-type, x-game-token','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}}
function serviceKey(){const direct=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(direct)return direct;try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||''}catch{return ''}}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:headers(allowed(origin)?origin:'https://mymerchnow.app')});
 if(!allowed(origin))return json({error:'Use the Shirt Games website to access this service.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return json({error:'POST required'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();if(!url||!key)return json({error:'Game service is not configured'},503);
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const raw=await req.text();if(raw.length>12*1024*1024)return json({error:'Photo upload is too large'},413);
  let input;try{input=JSON.parse(raw)}catch{return json({error:'Invalid request'},400)}
  const route=String(input.route||'');const body=input.body||{};
  const ip=(req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+'|'+url));const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('');
  const rate=await db.rpc('mqd_shirt_game_rate',{p_hash:hash,p_limit:route==='create'?10:120});if(rate.error)return json({error:'Game service is temporarily unavailable'},503);if(!rate.data)return json({error:'Please wait a moment before trying again.'},429);
  const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');let user=null;
  if(jwt){const auth=await db.auth.getUser(jwt);if(!auth.error)user=auth.data.user;}
  const repo=createGameRepository(db,{ownerMfa:()=>hasAdminMfa(db,jwt),price:garmentPriceCents,prepareDesign:async(draft:any,buyer:any,payload:any,name:string)=>{
   const customer=createClient(url,'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4',{global:{headers:{Authorization:'Bearer '+jwt}},auth:{persistSession:false,autoRefreshToken:false}});const {error}=await customer.from('customer_designs').upsert({id:draft.id,user_id:buyer.id,product_id:draft.snapshot.product,product_name:name,name:'Shirt Games — '+name,status:'draft',design_json:payload,zone_colors:Object.fromEntries(Object.keys(draft.snapshot.templateManifest).map(zone=>[zone,draft.snapshot.color]))},{onConflict:'id'});if(error)throw Object.assign(new Error('Could not save the game design to your customer account'),{status:409});
  },checkout:async(prepared:any)=>{
   const response=await fetch(url+'/functions/v1/create-mqd-checkout',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4',Authorization:'Bearer '+jwt},body:JSON.stringify({orderNumbers:[prepared.orderNumber],checkoutToken:crypto.randomUUID()})});const result=await response.json();if(!response.ok)throw Object.assign(new Error(result.error||'Checkout could not open'),{status:response.status});const destination=new URL(result.url);if(destination.protocol!=='https:'||destination.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination');return {url:destination.toString()};
  }});
  const result=await handleGameAction({route,body,user,actorToken:req.headers.get('x-game-token')||'',repo});return json(result);
 }catch(error){const e=error as Error&{status?:number};return json({error:e.status?e.message:'The game service could not complete this request. Please try again.'},e.status||500)}
});
