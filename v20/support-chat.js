import {supportRequest,supportNode,renderSupportMessages} from './support-chat-api.js';
const STORAGE='mqd-human-support-v1';
export function buildSupportChat({onUnread}){
 const root=supportNode('section',null,'mqd-support');root.hidden=true;
 const note=supportNode('p','Message the MQD team. We may be away; replies are not instant. Keep this browser tab to return to your private chat. It expires after 30 days. Do not send payment details or passwords.','mqd-support-note');
 const list=supportNode('div',null,'mqd-support-messages');list.setAttribute('role','log');list.setAttribute('aria-label','Conversation with MQD');
 const status=supportNode('p',null,'mqd-support-status');status.setAttribute('role','status');
 const form=supportNode('form',null,'mqd-support-form'),input=supportNode('textarea'),send=supportNode('button','Send message');input.maxLength=2000;input.required=true;input.rows=2;input.placeholder='Your message to MQD';input.setAttribute('aria-label','Your message to MQD');send.type='submit';
 const refresh=supportNode('button','Refresh replies'),end=supportNode('button','Forget this chat on this device');refresh.type=end.type='button';
 form.append(input,send);root.append(note,list,status,form,refresh,end);
 let access=null,pending=null,busy=false,polling=false,visible=false,timer=null,lastSeq=0,generation=0;
 try{const saved=JSON.parse(sessionStorage.getItem(STORAGE)||'null');if(saved&&/^[a-f0-9]{64}$/.test(saved.token)){access=saved;pending=saved.pending||null;if(pending)input.value=pending.message;}}catch{}
 const persist=()=>{sessionStorage.setItem(STORAGE,JSON.stringify({...access,pending}));};
 const active=()=>visible&&!document.hidden;
 const schedule=()=>{clearTimeout(timer);if(access?.created)timer=setTimeout(poll,active()?12000:60000);};
 async function markSeen(){if(!active()||!lastSeq)return;await supportRequest({action:'seen',id:access.id,seq:lastSeq},access);onUnread(0);}
 async function poll(){
  if(!access?.created||polling||busy){schedule();return;}polling=true;const current=generation;
  try{const data=await supportRequest({action:'read',id:access.id},access);if(current!==generation)return;renderSupportMessages(list,data.messages);lastSeq=data.messages.at(-1)?.seq||0;onUnread(data.unread);status.textContent=data.notificationPending?'Your messages are saved. MQD’s email alert is pending; you can still receive replies here.':'Replies from MQD appear here. We may be away.';if(active())await markSeen();}
  catch(e){if(current!==generation)return;status.textContent=e.status===404?'This private chat is unavailable or expired. Forget it below to start a new chat.':'Could not refresh replies. Reconnecting; you can also use Refresh replies.';}
  finally{polling=false;schedule();}
 }
 form.onsubmit=async e=>{
  e.preventDefault();if(busy)return;const message=input.value.trim();if(!message)return;
  busy=true;let saved=false;send.disabled=true;input.disabled=true;status.textContent='Saving your message…';
  try{
   if(!access){const bytes=crypto.getRandomValues(new Uint8Array(32));access={id:crypto.randomUUID(),token:Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join(''),created:false};}
   if(!pending||pending.message!==message)pending={requestId:crypto.randomUUID(),message};
   // Save credentials and retry ID before sending: an interrupted response is safe to retry.
   persist();const data=await supportRequest({action:access.created?'send':'create',id:access.id,...pending},access);
   saved=true;access.created=true;pending=null;persist();input.value='';status.textContent=data.notification==='sent'?'Message saved. MQD has been notified.':'Message saved. MQD’s email alert is pending.';
  }catch(e){status.textContent=e.name==='TimeoutError'?'The response took too long. Retry the same message safely.':e.message||'Could not save. Please try again.';}
  finally{busy=false;send.disabled=false;input.disabled=false;if(active())input.focus();if(saved)await poll();else schedule();}
 };
 refresh.onclick=poll;
 end.onclick=()=>{if(busy||!confirm('Forget access to this chat on this device? MQD will retain its conversation record. You will no longer be able to read replies here.'))return;generation++;sessionStorage.removeItem(STORAGE);access=pending=null;lastSeq=0;clearTimeout(timer);list.replaceChildren();input.value='';status.textContent='You can start a new private chat.';onUnread(0);};
 document.addEventListener('visibilitychange',()=>{if(active())poll();});window.addEventListener('online',poll);
 schedule();
 return {root,setVisible(value){visible=value;if(value){poll();input.focus();}else schedule();}};
}
