import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
import {requireAdminMfa} from './admin-security.js?v=1';
import {supportRequest,SUPPORT_KEY,supportNode,renderSupportMessages,ownerChatTarget} from './support-chat-api.js';
const db=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co',SUPPORT_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=id=>document.getElementById(id);
let selected=new URLSearchParams(location.search).get('chat'),page=0,busy=false,refreshing=false,ready=false,pending=null;
if(!ownerChatTarget(selected))selected=null;
$('signIn').href='/owner/'+(selected?'?chat='+encodeURIComponent(selected):'');
async function request(body){const {data,error}=await db.auth.getSession();if(error||!data.session)throw Error('Sign in to the owner portal again.');return supportRequest(body,{jwt:data.session.access_token});}
async function detail(){
 if(!selected)return;const id=selected,data=await request({action:'read',id});if(selected!==id)return;
 $('conversation').hidden=false;$('heading').textContent='Conversation '+id.slice(0,8);
 // Shared renderer labels guest messages "You"; owner view uses "Customer".
 renderSupportMessages($('messages'),data.messages);for(const label of $('messages').querySelectorAll('.customer strong'))label.textContent='Customer';
 $('notification').textContent=data.notifications.length?data.notifications.map(n=>'Email alert: '+n.status+(n.last_error?' — '+n.last_error:'')).join('\n'):'All email alerts accepted by the provider.';
 $('retry').hidden=!data.notifications.some(n=>n.status==='pending'||n.status==='sending');
 if(!document.hidden&&data.messages.length)await request({action:'seen',id,seq:data.messages.at(-1).seq});
}
async function refresh(){
 if(!ready||refreshing||busy||document.hidden)return;refreshing=true;
 try{const {conversations}=await request({action:'list',page});$('conversations').replaceChildren();for(const c of conversations){const button=supportNode('button',(c.unread?c.unread+' unread · ':'')+'Chat '+c.id.slice(0,8)+' · '+new Date(c.updated_at).toLocaleString());button.type='button';button.setAttribute('aria-current',String(c.id===selected));button.onclick=async()=>{if(busy)return;selected=c.id;pending=null;$('reply').elements.message.value='';history.replaceState(null,'',ownerChatTarget(selected));try{await detail();}catch(e){$('status').textContent=e.message;}};$('conversations').append(button);}$('previous').disabled=page===0;$('next').disabled=conversations.length<30;await detail();$('status').textContent=conversations.length?'Inbox updated.':'No conversations on this page.';}
 catch(e){$('status').textContent=e.message;$('signIn').hidden=false;if(e.status===401||e.status===403){ready=false;$('inbox').hidden=true;}}
 finally{refreshing=false;}
}
$('reply').onsubmit=async e=>{e.preventDefault();if(busy||!selected)return;busy=true;const input=e.currentTarget.elements.message,button=e.currentTarget.querySelector('button');button.disabled=true;input.disabled=true;const id=selected,message=input.value.trim();try{if(!pending||pending.message!==message)pending={requestId:crypto.randomUUID(),message};await request({action:'send',id,...pending});pending=null;input.value='';$('status').textContent='Reply saved. The customer will see it in their chat.';await detail();}catch(e){$('status').textContent=e.message;}finally{busy=false;button.disabled=false;input.disabled=false;}};
$('refresh').onclick=refresh;$('previous').onclick=()=>{page=Math.max(0,page-1);refresh();};$('next').onclick=()=>{page++;refresh();};
$('retry').onclick=async()=>{if(!selected)return;$('retry').disabled=true;try{await request({action:'retry',id:selected});await detail();}catch(e){$('status').textContent=e.message;}finally{$('retry').disabled=false;}};
window.addEventListener('online',refresh);document.addEventListener('visibilitychange',refresh);
db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){ready=false;$('inbox').hidden=true;$('messages').replaceChildren();$('signIn').hidden=false;}});
async function init(){try{await requireAdminMfa(db);ready=true;$('inbox').hidden=false;await refresh();}catch(e){$('status').textContent=e.message;$('signIn').hidden=false;}}
setInterval(refresh,15000);init();
