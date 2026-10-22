export const SUPPORT_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-support-chat';
export const SUPPORT_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
export async function supportRequest(body,{token='',jwt=''}={}){
 const headers={'Content-Type':'application/json',apikey:SUPPORT_KEY};
 if(token)headers['x-mqd-chat-token']=token;if(jwt)headers.Authorization='Bearer '+jwt;
 const response=await fetch(SUPPORT_URL,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok){const error=Error(result.error||'Chat unavailable. Please try again.');error.status=response.status;throw error;}return result;
}
export function supportNode(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
export function renderSupportMessages(host,messages){
 const nearBottom=host.scrollHeight-host.scrollTop-host.clientHeight<80;
 host.replaceChildren();for(const m of messages){const article=supportNode('article',null,'mqd-support-message '+m.sender);article.append(supportNode('strong',m.sender==='owner'?'MQD':'You'),supportNode('p',m.body),supportNode('small',new Date(m.created_at).toLocaleString()));host.append(article);}
 if(nearBottom)host.scrollTop=host.scrollHeight;
}
export function ownerChatTarget(value){return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value||'')?'/owner-chat.html?chat='+encodeURIComponent(value):'';}
