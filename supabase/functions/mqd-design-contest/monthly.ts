import {hasAdminMfa} from '../_shared/mqd-admin-security.js';
const validId=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const columns='id,title,description,closes_at,opens_at,announces_at,round_month';
async function rpc(db:any,name:string,args:any={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error(error.message);return data;}
async function rounds(db:any){await rpc(db,'mqd_monthly_ensure');const {data,error}=await db.from('mqd_contests').select(columns).not('round_month','is',null).order('round_month',{ascending:false}).limit(18);if(error)throw error;return data||[];}
async function preview(db:any,path:string,user:string){
 if(!path?.startsWith(user+'/designs/'))throw new Error('Save a garment preview first.');
 const {data:blob,error}=await db.storage.from('customer-artwork').download(path);if(error||!blob)throw new Error('Could not load your saved preview.');
 if(blob.size>2000000||!['image/png','image/jpeg'].includes(blob.type))throw new Error('Resave your design with a smaller PNG or JPEG preview.');
 const bytes=new Uint8Array(await blob.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return `data:${blob.type};base64,${btoa(str)}`;
}
export async function monthlyAction(req:Request,b:any,db:any,json:any){
 if(b.action!=='monthly'&&!String(b.action).startsWith('monthly_'))return null;
 if(b.action==='monthly'){
  const all=await rounds(db),now=Date.now();const current=all.filter((r:any)=>Date.parse(r.closes_at)>now).sort((a:any,c:any)=>Date.parse(a.closes_at)-Date.parse(c.closes_at))[0]||null;
  const history=[];for(const r of all.filter((r:any)=>Date.parse(r.announces_at)<=now).slice(0,6)){const result=await rpc(db,'mqd_contest_public',{p_contest:r.id,p_previews:false});history.push({contest:r,outcome:result.outcome,total:result.total});}
  let approved=0;if(current){const {count,error}=await db.from('mqd_contest_options').select('id',{head:true,count:'exact'}).eq('contest_id',current.id).eq('eligible',true);if(error)throw error;approved=count||0;}
  return json({current,approved,history,server_now:new Date().toISOString()});
 }
 const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
 const {data:{user},error}=await db.auth.getUser(token);
 if(error||!user||user.is_anonymous||!user.email_confirmed_at)return json({error:'Sign in with a verified account to submit your design.'},401);
 const owner=['monthly_rounds','monthly_queue','monthly_preview','monthly_review','monthly_owner_submit'].includes(b.action);
 if(owner){if(user.app_metadata?.role!=='admin')return json({error:'Owner access required.'},403);if(!await hasAdminMfa(db,token))return json({error:'Verify your owner account with your authenticator.',code:'MFA_REQUIRED'},403);}
 if(b.action==='monthly_rounds')return json({rounds:await rounds(db)});
 if(b.action==='monthly_designs'){
  const {data,error}=await db.from('customer_designs').select('id,name').eq('user_id',user.id).eq('product_id','tshirt').neq('status','archived').order('updated_at',{ascending:false}).limit(100);if(error)throw error;return json({designs:data});
 }
 if(b.action==='monthly_mine'){
  const {data,error}=await db.from('mqd_contest_submissions').select('id,contest_id,label,status,option_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(24);if(error)throw error;return json({entries:data});
 }
 if(b.action==='monthly_submit'||b.action==='monthly_owner_submit'){
  if(!validId(b.contestId)||b.consent!==true)throw new Error('Choose the round and confirm permission to publish your garment preview.');
  const label=String(b.label||'').trim();if(!label||label.length>100)throw new Error('Enter a public design title of up to 100 characters.');
  let image='',snapshot=null,design=null,email=user.email,source='';
  if(b.action==='monthly_submit'){
   if(!validId(b.designId))throw new Error('Choose a saved all-over-print short-sleeve T-shirt.');
   const {data:d,error}=await db.from('customer_designs').select('id,preview_path,design_json').eq('id',b.designId).eq('user_id',user.id).eq('product_id','tshirt').neq('status','archived').maybeSingle();if(error||!d)throw new Error('Choose your saved all-over-print short-sleeve T-shirt.');
   image=await preview(db,d.preview_path,user.id);snapshot=d.design_json;design=d.id;
  }else{
   image=String(b.preview||'');email=String(b.email||'').trim().toLowerCase();source=String(b.sourceUrl||'').trim();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw new Error('Enter the entrant’s contact email.');
   if(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(image)||image.length>700000)throw new Error('Choose a smaller PNG or JPEG garment preview.');
   if(source&&(!/^https:\/\//.test(source)||source.length>1000))throw new Error('Use an HTTPS source link or leave it blank.');
  }
  const submissionId=await rpc(db,'mqd_monthly_submit',{p_contest:b.contestId,p_user:b.action==='monthly_submit'?user.id:null,p_design:design,p_label:label,p_email:email,p_preview:image,p_snapshot:snapshot,p_source:source});
  return json({submissionId,status:'pending'});
 }
 if(b.action==='monthly_queue'){
  if(!validId(b.contestId))throw new Error('Choose a round.');
  const page=Math.max(0,Math.min(50,Math.floor(Number(b.page)||0)));
  const {data,error,count}=await db.from('mqd_contest_submissions').select('id,label,status,option_id,created_at',{count:'exact'}).eq('contest_id',b.contestId).order('created_at').range(page*20,page*20+19);if(error)throw error;return json({entries:data,count,page});
 }
 if(b.action==='monthly_preview'){
  if(!validId(b.submissionId))throw new Error('Choose an entry.');
  const {data,error}=await db.from('mqd_contest_submissions').select('id,label,preview,contact_email,source_url,review_note,design_snapshot').eq('id',b.submissionId).maybeSingle();if(error)throw error;if(!data)throw new Error('Entry not found.');return json({entry:data});
 }
 if(b.action==='monthly_review'){
  if(!validId(b.submissionId)||!['approve','reject','disqualify'].includes(b.decision)||typeof b.note!=='string'||b.note.length>500)throw new Error('Invalid review.');
  await rpc(db,'mqd_monthly_review',{p_submission:b.submissionId,p_owner:user.id,p_decision:b.decision,p_note:b.note});return json({reviewed:true});
 }
 return json({error:'Unknown monthly contest action.'},400);
}
