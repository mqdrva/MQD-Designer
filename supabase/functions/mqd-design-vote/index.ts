import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const json=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,'Content-Type':'application/json'}});
const validId=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const normalize=(v:any):any=>Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['src','image','originalStoragePath','backgroundOriginalSrc'].includes(k)).map(([k,x])=>[k,normalize(x)])):v;
const hash=async(v:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)))).map(x=>x.toString(16).padStart(2,'0')).join('');
function key(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  if(Number(req.headers.get('content-length')||0)>20000)return json({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>20000)return json({error:'Request too large'},413);
  const b=JSON.parse(raw),admin=createClient(Deno.env.get('SUPABASE_URL')!,key(),{auth:{persistSession:false,autoRefreshToken:false}});
  const call=async(name:string,args:any)=>{const {data,error}=await admin.rpc(name,args);if(error)throw new Error(error.message);return data;};
  if(b.action==='public'||b.action==='vote'){
   if(!validId(b.pollId))return json({error:'Voting page not found'},404);
   let recorded;
   if(b.action==='vote'){
    if(!validId(b.optionId)||!validId(b.voterToken))return json({error:'Invalid vote'},400);
    const salt=key(),network=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
    recorded=await call('mqd_poll_vote',{p_poll:b.pollId,p_option:b.optionId,p_voter:await hash(salt+b.pollId+b.voterToken),p_network:await hash(salt+network)});
   }
   const p=await call(b.resultsOnly?'mqd_poll_results':'mqd_poll_public',{p_poll:b.pollId});if(!p)return json({error:'Voting page not found'},404);
   return json({...p,recorded});
  }
  // Permanent-account creation/listing is authenticated here, including JWT validity.
  const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return json({error:'Sign in with Google or Email to manage voting pages.'},401);
  if(b.action==='open'){
   if(!validId(b.pollId)||!validId(b.designId))throw new Error('Invalid design.');
   const {data:p,error:pe}=await admin.from('mqd_polls').select('id').eq('id',b.pollId).eq('user_id',user.id).maybeSingle();if(pe||!p)throw new Error('Voting page not found.');
   const {data:o,error:oe}=await admin.from('mqd_poll_options').select('design_snapshot,design_id').eq('poll_id',p.id).eq('design_id',b.designId).maybeSingle();if(oe||!o)throw new Error('Voting design not found.');
   const {data:d,error:de}=await admin.from('customer_designs').select('design_json').eq('id',o.design_id).eq('user_id',user.id).maybeSingle();if(de||!d)throw new Error('The saved design is no longer available.');
   return json({payload:{...d.design_json,design:o.design_snapshot}});
  }
  if(b.action==='mine'){
   const {data:polls,error}=await admin.from('mqd_polls').select('id,title,closes_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false});if(error)throw error;
   const unlocked=!polls?.length||!!await call('mqd_poll_unlock',{p_user:user.id,p_poll:polls[0].id});
   const {data:designs,error:de}=await admin.from('customer_designs').select('id,name,product_name,product_id,preview_path').eq('user_id',user.id).neq('status','archived').order('updated_at',{ascending:false}).limit(50);if(de)throw de;
   const {data:choices,error:ce}=await admin.from('mqd_poll_options').select('poll_id,design_id,label').in('poll_id',(polls||[]).map(p=>p.id));if(ce&&polls?.length)throw ce;
   return json({polls:(polls||[]).map(p=>({...p,choices:(choices||[]).filter(o=>o.poll_id===p.id)})),canCreate:unlocked,designs:(designs||[]).filter(d=>d.preview_path)});
  }
  if(b.action==='create'){
   if(!Array.isArray(b.designIds)||b.designIds.length<2||b.designIds.length>3||!b.designIds.every(validId))throw new Error('Choose two or three saved designs.');
   const {data:designs,error}=await admin.from('customer_designs').select('*').eq('user_id',user.id).in('id',b.designIds);if(error)throw error;if(designs?.length!==b.designIds.length)throw new Error('A selected design is unavailable.');
   const options=[];
   for(const id of b.designIds){
    const d=designs.find(d=>d.id===id);if(!d.preview_path?.startsWith(user.id+'/designs/'))throw new Error('Save a garment preview before creating a vote.');
    const {data:blob,error:be}=await admin.storage.from('customer-artwork').download(d.preview_path);if(be||!blob)throw new Error('Could not load a saved garment preview.');
    if(blob.size>2000000||!['image/png','image/jpeg'].includes(blob.type))throw new Error('Preview is too large. Resave the design and try again.');
    const bytes=new Uint8Array(await blob.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));
    options.push({design_id:d.id,product_id:d.product_id,design_snapshot:normalize(d.design_json?.design),label:d.name,preview:`data:${blob.type};base64,${btoa(str)}`});
   }
   const pollId=await call('mqd_poll_create',{p_user:user.id,p_title:b.title,p_closes:b.closesAt,p_options:options});return json({pollId});
  }
  return json({error:'Unknown action'},400);
 }catch(e){console.error('Voting request failed',e.message);return json({error:e.message||'Voting request failed'},400);}
});
