export const CONTEST_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-design-contest';
export const CONTEST_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
export async function contestRequest(body,token=''){
 const headers={'Content-Type':'application/json',apikey:CONTEST_KEY};if(token)headers.Authorization='Bearer '+token;
 const response=await fetch(CONTEST_URL,{method:'POST',headers,body:JSON.stringify(body)});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Could not load contest.');return result;
}
