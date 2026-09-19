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
  panel.append(header,messages,chips,form);
  document.body.append(launcher,panel);
  const close=header.querySelector('.mqd-help-close');
  const setOpen=open=>{state.open=open;panel.classList.toggle('open',open);launcher.classList.toggle('hidden',open);if(open)setTimeout(()=>document.querySelector('#mqdHelpInput')?.focus(),60);};
  launcher.onclick=()=>setOpen(true);close.onclick=()=>setOpen(false);
  form.addEventListener('submit',e=>{e.preventDefault();const input=document.querySelector('#mqdHelpInput');const value=input.value;input.value='';sendMessage(value);});
  renderMessages();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',buildChat);else buildChat();
