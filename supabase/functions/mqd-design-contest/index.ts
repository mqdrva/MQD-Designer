import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {hasAdminMfa} from '../_shared/mqd-admin-security.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{...cors,'Content-Type':'application/json'}});
const validId=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function key(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const raw=await req.text();if(raw.length>20000)return json({error:'Request too large'},413);
  const b=JSON.parse(raw),admin=createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false,autoRefreshToken:false}});
  const rpc=async(name:string,args:any)=>{const {data,error}=await admin.rpc(name,args);if(error)throw new Error(error.message);return data;};
  if(b.action==='list'){
   const {data,error}=await admin.from('mqd_contests').select('id,title,description,closes_at,created_at').order('created_at',{ascending:false}).limit(50);if(error)throw error;return json({contests:data});
  }
  if(b.action==='public'||b.action==='vote'){
   if(!validId(b.contestId))return json({error:'Contest not found'},404);
   let recorded;
   if(b.action==='vote'){
    if(!validId(b.optionId)||!validId(b.voterToken))return json({error:'Invalid vote'},400);
    const network=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
    recorded=await rpc('mqd_contest_vote',{p_contest:b.contestId,p_option:b.optionId,p_voter:await hash(key()+b.contestId+b.voterToken),p_network:await hash(key()+network)});
   }
   const result=await rpc('mqd_contest_public',{p_contest:b.contestId,p_previews:!b.resultsOnly});if(!result)return json({error:'Contest not found'},404);return json({...result,recorded});
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user)return json({error:'Sign in to the owner portal.'},401);
  if(user.app_metadata?.role!=='admin')return json({error:'Owner access required.'},403);
  if(!await hasAdminMfa(admin,token))return json({error:'Verify your owner account with your authenticator.',code:'MFA_REQUIRED'},403);
  if(b.action==='designs'){
   const {data,error}=await admin.from('customer_designs').select('id,name,preview_path').eq('user_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(50);if(error)throw error;
   const designs=[];for(const d of data||[]){if(!d.preview_path?.startsWith(user.id+'/designs/'))continue;const {data:s,error:e}=await admin.storage.from('customer-artwork').createSignedUrl(d.preview_path,600);if(!e)designs.push({id:d.id,name:d.name,preview:s.signedUrl});}
   return json({designs});
  }
  if(b.action==='close'){
   if(!validId(b.contestId))throw new Error('Invalid contest.');
   const {data,error}=await admin.from('mqd_contests').update({closes_at:new Date().toISOString()}).eq('id',b.contestId).select('id').maybeSingle();if(error)throw error;if(!data)throw new Error('Contest not found.');return json({closed:true});
  }
  if(b.action==='create'){
   if(typeof b.title!=='string'||!b.title.trim()||b.title.trim().length>100||typeof b.description!=='string'||b.description.length>1000)throw new Error('Enter a title and a short description.');
   if(!Array.isArray(b.designIds)||b.designIds.length<2||b.designIds.length>12||new Set(b.designIds).size!==b.designIds.length||!b.designIds.every(validId))throw new Error('Choose 2–12 different saved designs.');
   if(b.publishPreviews!==true)throw new Error('Confirm publication of the selected garment previews.');
   const {data:designs,error}=await admin.from('customer_designs').select('id,name,preview_path').eq('user_id',user.id).in('id',b.designIds);if(error)throw error;if(designs?.length!==b.designIds.length)throw new Error('A selected design is unavailable.');
   const options=[];
   for(const id of b.designIds){const d=designs.find(d=>d.id===id);if(!d.preview_path?.startsWith(user.id+'/designs/'))throw new Error('Save a garment preview first.');
    const {data:blob,error}=await admin.storage.from('customer-artwork').download(d.preview_path);if(error||!blob)throw new Error('Could not load preview.');
    if(blob.size>2000000||!['image/png','image/jpeg'].includes(blob.type))throw new Error('Resave the design with a smaller preview.');
    const bytes=new Uint8Array(await blob.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));
    options.push({label:d.name,preview:`data:${blob.type};base64,${btoa(str)}`});
   }
   return json({contestId:await rpc('mqd_contest_create',{p_user:user.id,p_title:b.title.trim(),p_description:b.description,p_closes:b.closesAt,p_options:options})});
  }
  return json({error:'Unknown action'},400);
 }catch(e){return json({error:e.message||'Contest request failed'},400);}
});
