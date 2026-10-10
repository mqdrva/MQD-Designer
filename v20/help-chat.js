import {validateDesignRequest} from './design-request-contract.js';
const CHAT_STORAGE_KEY='mqd-help-chat-v1';
const state={open:false,busy:false,messages:[]};

function el(tag,attrs={},children=[]){
  const node=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k==='class')node.className=v;
    else if(k==='text')node.textContent=v;
    else if(k.startsWith('on'))node.addEventListener(k.slice(2).toLowerCase(),v);
    else node.setAttribute(k,v);
  }
  for(const child of [].concat(children||[]))if(child)node.append(child);
  return node;
}

function loadState(){
  try{
    const saved=JSON.parse(sessionStorage.getItem(CHAT_STORAGE_KEY)||'{}');
    if(Array.isArray(saved.messages))state.messages=saved.messages.slice(-12);
  }catch{}
}
function saveState(){
  try{sessionStorage.setItem(CHAT_STORAGE_KEY,JSON.stringify({messages:state.messages.slice(-12)}));}catch{}
}
function currentContext(){
  return{
    page:location.pathname,
    product:document.querySelector('#productSelect option:checked')?.textContent||'',
    zone:document.querySelector('#zoneName')?.textContent||'',
    mobile:matchMedia('(max-width:850px)').matches
  };
}
function addMessage(role,content){
  state.messages.push({role,content});
  state.messages=state.messages.slice(-12);
  saveState();
  renderMessages();
}
function renderMessages(){
  const list=document.querySelector('#mqdHelpMessages');if(!list)return;
  list.innerHTML='';
  if(!state.messages.length){
    const welcome=el('div',{class:'mqd-help-msg assistant'});
    welcome.textContent='Hi! I’m MQD Help. Ask me how to use the designer, upload artwork, download a mockup, checkout, shipping, or returns.';
    list.append(welcome);
  }else{
    for(const msg of state.messages){
      const row=el('div',{class:'mqd-help-msg '+msg.role});
      row.textContent=msg.content;
      list.append(row);
    }
  }
  list.scrollTop=list.scrollHeight;
}
async function sendMessage(text){
  const message=String(text||'').trim();if(!message||state.busy)return;
  addMessage('user',message);
  state.busy=true;
  const send=document.querySelector('#mqdHelpSend'),input=document.querySelector('#mqdHelpInput');
  if(send)send.disabled=true;if(input)input.disabled=true;
  const typing=el('div',{class:'mqd-help-msg assistant typing',text:'MQD Help is typing…'});
  document.querySelector('#mqdHelpMessages')?.append(typing);
  try{
    const history=state.messages.slice(0,-1).slice(-8);
    const r=await fetch('/api/mqd-help',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history,context:currentContext()})});
    const data=await r.json();
    typing.remove();
    addMessage('assistant',data.answer||'I could not answer that right now. Please email mqdrva@gmail.com for help.');
  }catch(error){
    typing.remove();
    addMessage('assistant','I could not connect right now. Please try again, or email mqdrva@gmail.com for help.');
  }finally{
    state.busy=false;
    if(send)send.disabled=false;
    if(input){input.disabled=false;input.focus();}
  }
}
function buildChat(){
  loadState();
  const launcher=el('button',{id:'mqdHelpLauncher',class:'mqd-help-launcher','aria-label':'Open MQD Help',text:'Help'});
  const panel=el('section',{id:'mqdHelpPanel',class:'mqd-help-panel','aria-label':'MQD website help'});
  const header=el('div',{class:'mqd-help-head'},[
    el('div',{},[el('strong',{text:'MQD Help'}),el('span',{text:'Website & order questions'})]),
    el('button',{class:'mqd-help-close','aria-label':'Close help',text:'×'})
  ]);
  const messages=el('div',{id:'mqdHelpMessages',class:'mqd-help-messages'});
  const chips=el('div',{class:'mqd-help-chips'});
  for(const q of ['How do I add my logo?','How do I download a mockup?','How long is shipping?']){
    chips.append(el('button',{type:'button',text:q,onClick:()=>sendMessage(q)}));
  }
  const form=el('form',{class:'mqd-help-form'},[
    el('input',{id:'mqdHelpInput',type:'text',maxlength:'1200',placeholder:'Ask a question…',autocomplete:'off','aria-label':'Ask MQD Help'}),
    el('button',{id:'mqdHelpSend',type:'submit',text:'Send'})
  ]);
  const tabs=el('div',{class:'mqd-help-tabs'},[
    el('button',{type:'button',text:'Ask a question',id:'mqdChatTab'}),
    el('button',{type:'button',text:'Request a design',id:'mqdRequestTab'})
  ]);
  const request=el('form',{class:'mqd-design-request',hidden:'',id:'mqdDesignRequest'});
  request.innerHTML=`<p>Let MQD help design your shirts. We'll email you to confirm options and pricing before creating your mockup.</p>
    <label>Your name<input name="name" required maxlength="100" autocomplete="name"></label>
    <label>Email<input name="email" type="email" required maxlength="254" autocomplete="email"></label>
    <div class="mqd-request-product"><label>Garment<input name="garment" required maxlength="160" placeholder="e.g. Premium short sleeve or Everyday cotton"></label>
    <label>Quantity<input name="quantity" type="number" required min="1" max="9999" value="5"></label></div>
    <label>Design details<textarea name="brief" required minlength="10" maxlength="2000" rows="3" placeholder="Business name, colors, design ideas, and when you need them"></textarea></label>
    <label class="mqd-request-honeypot" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label>
    <p class="mqd-request-note">No payment or order is placed. Send your logo when MQD replies. <a href="/privacy.html">Privacy</a></p>
    <button type="submit">Send design request</button><p role="status" aria-live="polite" id="mqdRequestStatus"></p>`;
  const setMode=design=>{
    messages.hidden=chips.hidden=form.hidden=design;request.hidden=!design;
    panel.classList.toggle('design-mode',design);
    tabs.querySelector('#mqdChatTab').setAttribute('aria-pressed',String(!design));
    tabs.querySelector('#mqdRequestTab').setAttribute('aria-pressed',String(design));
  };
  tabs.querySelector('#mqdChatTab').onclick=()=>setMode(false);
  tabs.querySelector('#mqdRequestTab').onclick=()=>{setMode(true);request.elements.name.focus();};
  let requestId=crypto.randomUUID(), fingerprint='';
  request.addEventListener('submit',async event=>{
    event.preventDefault();const button=request.querySelector('button[type="submit"]'),status=request.querySelector('#mqdRequestStatus');
    const values=Object.fromEntries(new FormData(request));values.page=location.pathname;
    const next=JSON.stringify(values);if(next!==fingerprint){requestId=crypto.randomUUID();fingerprint=next;}
    values.requestId=requestId;
    try{
      validateDesignRequest(values);button.disabled=true;status.textContent='Sending your request…';
      const response=await fetch('https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-design-request',{method:'POST',headers:{'Content-Type':'application/json',apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4'},body:JSON.stringify(values),signal:AbortSignal.timeout(18000)});
      const result=await response.json();if(!response.ok||!result.received)throw new Error(result.error||'Could not send your request. Please try again.');
      request.reset();requestId=crypto.randomUUID();fingerprint='';status.textContent='Your request has been sent to MQD. We’ll reply to the email you provided.';
    }catch(error){status.textContent=error.name==='TimeoutError'?'Sending took too long. Please try again; we will avoid sending duplicates.':error.message||'Could not connect. Please try again or email mqdrva@gmail.com.';}
    finally{button.disabled=false;}
  });
  panel.append(header,tabs,messages,chips,form,request);
  setMode(false);
  document.body.append(launcher,panel);
  const close=header.querySelector('.mqd-help-close');
  const setOpen=open=>{state.open=open;panel.classList.toggle('open',open);launcher.classList.toggle('hidden',open);if(open&&!panel.classList.contains('design-mode'))setTimeout(()=>document.querySelector('#mqdHelpInput')?.focus(),60);};
  launcher.onclick=()=>setOpen(true);close.onclick=()=>{setOpen(false);launcher.focus();};
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.open){setOpen(false);launcher.focus();}});
  document.addEventListener('click',event=>{
    if(!event.target.closest('[data-mqd-design-request]'))return;
    event.preventDefault();setMode(true);setOpen(true);
    const selected=document.querySelector('#productSelect option:checked')?.textContent||document.querySelector('#product option:checked')?.textContent;
    if(selected)request.elements.garment.value=selected;
    setTimeout(()=>request.elements.name.focus(),80);
  });
  if(location.hash==='#request-design'){setMode(true);setOpen(true);}
  form.addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#mqdHelpInput');const value=input.value;input.value='';sendMessage(value);});
  renderMessages();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildChat);else buildChat();
