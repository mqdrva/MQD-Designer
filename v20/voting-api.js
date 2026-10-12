export const VOTING_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-design-vote';
export async function voteRequest(body,{authenticated=false,signal}={}){
 const headers={'Content-Type':'application/json',apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4'};
 if(authenticated){const token=await window.MQDCustomerAuth?.getAccessToken?.();if(!token)throw new Error('Please sign in first.');headers.Authorization='Bearer '+token;}
 const response=await fetch(VOTING_URL,{method:'POST',headers,body:JSON.stringify(body),signal});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Could not load voting.');return result;
}
export function voterToken(){
 const key='mqd-voter-token-v1';let token=localStorage.getItem(key);if(!/^[a-f0-9-]{36}$/i.test(token||'')){token=crypto.randomUUID();localStorage.setItem(key,token);}return token;
}
