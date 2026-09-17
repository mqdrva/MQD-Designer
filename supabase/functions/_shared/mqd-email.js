const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_FROM='Morales Quality Designs <notifications@mymerchnow.app>';

async function vaultSecret(supabase,name){
  try{
    const {data,error}=await supabase.rpc('mqd_get_vault_secret',{secret_name:name});
    if(error)return'';
    return String(data||'').trim();
  }catch{return'';}
}

async function emailConfig(supabase){
  const apiKey=(Deno.env.get('MQD_RESEND_API_KEY')||await vaultSecret(supabase,'mqd_resend_api_key')).trim();
  const from=(Deno.env.get('MQD_EMAIL_FROM')||await vaultSecret(supabase,'mqd_email_from')||DEFAULT_FROM).trim();
  return{apiKey,from};
}

export function escapeMqdEmailHtml(value){
  return String(value??'').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

async function deliverRow(supabase,row){
  if(!row?.id||row.status==='sent')return{status:row?.status||'skipped'};
  const {apiKey,from}=await emailConfig(supabase);
  if(!apiKey||!from){
    await supabase.from('mqd_email_notifications').update({last_error:'Email provider is not configured yet',updated_at:new Date().toISOString()}).eq('id',row.id);
    return{status:'pending',configured:false};
  }
  const html=String(row.payload?.html||'');
  const text=String(row.payload?.text||'');
  try{
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},
      body:JSON.stringify({from,to:[row.recipient],subject:row.subject,html:html||undefined,text:text||undefined})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(String(result?.message||result?.error||`Email provider returned ${response.status}`));
    const now=new Date().toISOString();
    await supabase.from('mqd_email_notifications').update({status:'sent',attempts:Number(row.attempts||0)+1,provider_message_id:String(result?.id||'')||null,last_error:null,sent_at:now,updated_at:now}).eq('id',row.id);
    return{status:'sent',id:result?.id||null};
  }catch(error){
    const now=new Date().toISOString(),message=error instanceof Error?error.message:String(error);
    await supabase.from('mqd_email_notifications').update({status:'failed',attempts:Number(row.attempts||0)+1,last_error:message.slice(0,500),updated_at:now}).eq('id',row.id);
    return{status:'failed',error:message};
  }
}

export async function queueMqdEmail(supabase,{orderId,kind,recipient,subject,html,text,meta={}}){
  const to=String(recipient||'').trim().toLowerCase();
  if(!orderId||!kind||!EMAIL.test(to))return{status:'skipped'};
  const payload={html:String(html||''),text:String(text||''),meta};
  const {error:insertError}=await supabase.from('mqd_email_notifications').upsert({order_id:orderId,kind,recipient:to,subject:String(subject||'MQD order update').slice(0,240),payload,status:'pending',updated_at:new Date().toISOString()},{onConflict:'order_id,kind,recipient',ignoreDuplicates:true});
  if(insertError){console.error('MQD email queue insert failed',insertError.message);return{status:'failed',error:insertError.message};}
  const {data:row,error:readError}=await supabase.from('mqd_email_notifications').select('*').eq('order_id',orderId).eq('kind',kind).eq('recipient',to).maybeSingle();
  if(readError||!row){console.error('MQD email queue lookup failed',readError?.message||'missing row');return{status:'failed',error:readError?.message||'Queue record missing'};}
  return await deliverRow(supabase,row);
}

export async function retryPendingMqdEmails(supabase,limit=8){
  const {data,error}=await supabase.from('mqd_email_notifications').select('*').in('status',['pending','failed']).lt('attempts',5).order('created_at',{ascending:true}).limit(Math.max(1,Math.min(25,Number(limit)||8)));
  if(error){console.error('MQD email retry lookup failed',error.message);return[];}
  const results=[];
  for(const row of data||[])results.push(await deliverRow(supabase,row));
  return results;
}

export async function mqdOwnerEmails(supabase){
  const configured=String(Deno.env.get('MQD_OWNER_ORDER_EMAILS')||'').split(',').map(x=>x.trim().toLowerCase()).filter(x=>EMAIL.test(x));
  if(configured.length)return[...new Set(configured)];
  try{
    const {data,error}=await supabase.auth.admin.listUsers({page:1,perPage:1000});
    if(error)return[];
    return[...new Set((data?.users||[]).filter(user=>user?.app_metadata?.role==='admin'&&EMAIL.test(String(user.email||''))).map(user=>String(user.email).toLowerCase()))];
  }catch{return[];}
}