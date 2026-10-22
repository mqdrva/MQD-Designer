export const VOTING_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-design-vote';
export async function voteRequest(body,{authenticated=false,signal}={}){
 const headers={'Content-Type':'application/json',apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4'};
 if(authenticated){const token=await window.MQDCustomerAuth?.getAccessToken?.();if(!token)throw new Error('Please sign in first.');headers.Authorization='Bearer '+token;}
 const response=await fetch(VOTING_URL,{method:'POST',headers,body:JSON.stringify(body),signal});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Could not load voting.');return result;
}
// Browser-only markers: no network requests or device fingerprinting.
const markerMemory=new Map();
export function readBrowserMarker(key){
 try{const value=localStorage.getItem(key);if(value)return value;}catch{}
 try{const prefix=encodeURIComponent(key)+'=';const part=document.cookie.split(';').map(v=>v.trim()).find(v=>v.startsWith(prefix));if(part)return decodeURIComponent(part.slice(prefix.length));}catch{}
 return markerMemory.get(key)||'';
}
export function writeBrowserMarker(key,value){
 markerMemory.set(key,value);
 try{localStorage.setItem(key,value);}catch{}
 try{document.cookie=encodeURIComponent(key)+'='+encodeURIComponent(value)+'; Path=/; Max-Age=34560000; SameSite=Lax; Secure';}catch{}
}
export function voterToken(){
 const key='mqd-voter-token-v1';let token=readBrowserMarker(key);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(token))token=crypto.randomUUID();
 writeBrowserMarker(key,token);return token;
}
