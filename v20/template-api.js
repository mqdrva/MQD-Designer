export const TEMPLATE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-shirt-templates';
export async function templateRequest(body,token){
 const response=await fetch(TEMPLATE_URL,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Shirt templates are not available yet. Start from scratch or try again later.');return result;
}
