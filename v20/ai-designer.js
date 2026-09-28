import {AI_PRODUCTS,AI_FONTS,sanitizePlan,productForPlan,decodePlan,decodePrompt} from './ai-design-contract.js';

const $=id=>document.getElementById(id);
const API_URL='/api/ai-design';
let logoDataUrl='';
let logoFilename='uploaded-logo.png';
let lastPlan=null;
let busy=false;

function setStatus(message,tone=''){
  const el=$('aiDesignerStatus');
  if(!el)return;
  el.textContent=message||'';
  el.dataset.tone=tone;
}
function addMessage(role,text){
  const host=$('aiDesignerConversation');
  if(!host||!text)return;
  const row=document.createElement('div');
  row.className='ai-message '+(role==='user'?'user':'assistant');
  const label=document.createElement('strong');
  label.textContent=role==='user'?'You':'AI Designer';
  const body=document.createElement('div');
  body.textContent=text;
  row.append(label,body);
  host.appendChild(row);
  host.scrollTop=host.scrollHeight;
}
function currentProductId(){
  return $('productSelect')?.value||window.MQDDesigner?.getContext?.()?.productId||'tshirt';
}
function findExistingLogo(){
  try{
    const payload=window.MQDDesigner?.exportDesign?.();
    for(const zone of Object.values(payload?.design?.zones||{})){
      for(const layer of zone?.layers||[]){
        if(layer?.type==='image'&&!layer.libraryAssetId&&typeof layer.src==='string'&&layer.src.startsWith('data:image/')){
          return{src:layer.src,filename:layer.filename||'current-artwork.png'};
        }
      }
    }
  }catch{}
  return null;
}
function waitForDesigner(timeout=12000){
  const started=Date.now();
  return new Promise((resolve,reject)=>{
    const tick=()=>{
      if(window.MQDDesigner?.exportDesign&&window.MQDDesigner?.loadDesign)return resolve(window.MQDDesigner);
      if(Date.now()-started>timeout)return reject(new Error('The designer is still loading. Please try again.'));
      setTimeout(tick,80);
    };
    tick();
  });
}
function fileToOptimizedDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file?.type?.startsWith('image/'))return reject(new Error('Choose a PNG, JPG, or WebP logo.'));
    if(file.size>15*1024*1024)return reject(new Error('Please use a logo smaller than 15 MB.'));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('The logo could not be read.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('The logo image could not be opened.'));
      img.onload=()=>{
        const max=1800,ratio=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const png=canvas.toDataURL('image/png');
        resolve(png);
      };
      img.src=String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
function makeLogoLayer(el,id){
  return{
    id,type:'image',label:'AI Logo',filename:logoFilename,src:logoDataUrl,
    x:el.x,y:el.y,scale:el.scale,rotation:el.rotation,
    flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},
    visible:true,aiManaged:true
  };
}
function makeTextLayer(el,id){
  return{
    id,type:'text',label:'AI Text',text:el.text||'Text',
    x:el.x,y:el.y,scale:el.scale,rotation:el.rotation,visible:true,
    color:el.color,font:AI_FONTS.includes(el.font)?el.font:'Inter',
    strokeColor:el.strokeColor,strokeWidth:el.strokeWidth,letterSpacing:0,
    bold:el.bold!==false,italic:el.italic===true,align:el.align||'center',
    aiManaged:true
  };
}
function nextLayerId(){
  return 'ai-layer-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
}
async function applyPlan(plan){
  const designer=await waitForDesigner();
  const safe=sanitizePlan(plan,{fallbackProductId:currentProductId()});
  const product=productForPlan(safe.productId);
  if(!product)throw new Error('The AI selected an unavailable garment.');

  const current=designer.exportDesign();
  if(!logoDataUrl){
    const existing=findExistingLogo();
    if(existing){logoDataUrl=existing.src;logoFilename=existing.filename;}
  }

  const sameProduct=current?.product?.id===product.id;
  const existingZones=sameProduct?(current?.design?.zones||{}):{};
  const design={zones:{}};
  let skippedLogo=false;

  for(const row of safe.zones){
    const preserved=(existingZones[row.zone]?.layers||[]).filter(layer=>layer?.libraryAssetId);
    const layers=[...preserved];
    for(const el of row.elements){
      if(el.kind==='logo'){
        if(!logoDataUrl){skippedLogo=true;continue;}
        if(layers.length<6)layers.push(makeLogoLayer(el,nextLayerId()));
      }else if(el.kind==='text'&&layers.length<6){
        layers.push(makeTextLayer(el,nextLayerId()));
      }
    }
    design.zones[row.zone]={background:row.background,layers};
  }

  const active=safe.zones.find(z=>z.elements.length)?.zone||product.zones[0];
  const payload={
    schema:'mqd-design-v1',
    product:{id:product.id},
    activeZone:active,
    design
  };
  await designer.loadDesign(payload,{notify:false});
  if($('productSelect'))$('productSelect').value=product.id;
  lastPlan=safe;

  if(skippedLogo){
    setStatus('Draft applied. Upload your logo in the AI panel and click Apply Draft to place the logo elements.','warn');
  }else{
    setStatus('AI draft applied. You can keep editing normally, or type another instruction below.','good');
  }
  addMessage('assistant',safe.summary);
  $('aiGenerate').textContent='Update Design';
  $('aiApply').hidden=false;
  return safe;
}
async function requestPlan(mode){
  if(busy)return;
  const prompt=$('aiDesignerPrompt')?.value.trim();
  if(!prompt){setStatus('Describe what you want the shirt to look like.','warn');$('aiDesignerPrompt')?.focus();return;}
  busy=true;
  $('aiGenerate').disabled=true;
  $('aiApply').disabled=true;
  setStatus(mode==='revise'?'Updating your design…':'Creating your first draft…','working');
  addMessage('user',prompt);
  try{
    const response=await fetch(API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        message:prompt,
        mode,
        currentProductId:currentProductId(),
        currentPlan:mode==='revise'?lastPlan:null,
        hasLogo:Boolean(logoDataUrl||findExistingLogo())
      })
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'The AI designer could not create a draft.');
    lastPlan=sanitizePlan(result.plan,{fallbackProductId:currentProductId()});
    await applyPlan(lastPlan);
    $('aiDesignerPrompt').value='';
  }catch(error){
    console.error(error);
    setStatus(error.message||'The AI designer could not create a draft.','bad');
  }finally{
    busy=false;
    $('aiGenerate').disabled=false;
    $('aiApply').disabled=false;
  }
}
function openPanel(){
  $('aiDesignerPanel')?.classList.remove('hidden');
  $('aiDesignerToggle')?.setAttribute('aria-expanded','true');
  setTimeout(()=>$('aiDesignerPrompt')?.focus(),50);
}
function closePanel(){
  $('aiDesignerPanel')?.classList.add('hidden');
  $('aiDesignerToggle')?.setAttribute('aria-expanded','false');
}
function resetAI(){
  lastPlan=null;
  logoDataUrl='';
  logoFilename='uploaded-logo.png';
  $('aiLogoUpload').value='';
  $('aiLogoName').textContent='No AI logo selected';
  $('aiDesignerConversation').innerHTML='';
  $('aiDesignerPrompt').value='';
  $('aiGenerate').textContent='Generate Draft';
  $('aiApply').hidden=true;
  setStatus('Describe a design. AI can change customer artwork, text, colors, placement and garment choice — never the frozen garment engine.','');
}
function handleLaunchLink(){
  const raw=location.hash.slice(1);
  if(!raw)return;
  const params=new URLSearchParams(raw);
  const encodedPlan=params.get('ai-plan');
  const encodedPrompt=params.get('ai-prompt');
  if(encodedPlan){
    const plan=decodePlan(encodedPlan);
    if(plan){
      lastPlan=plan;
      openPanel();
      $('aiDesignerPrompt').value='Apply the design draft from ChatGPT.';
      setStatus(plan.zones.some(z=>z.elements.some(e=>e.kind==='logo'))
        ?'ChatGPT sent a draft. Upload your logo if the design uses one, then click Apply Draft.'
        :'ChatGPT sent a draft. Click Apply Draft to open it in the designer.','good');
      $('aiApply').hidden=false;
    }
  }else if(encodedPrompt){
    const prompt=decodePrompt(encodedPrompt);
    if(prompt){
      openPanel();
      $('aiDesignerPrompt').value=prompt;
      setStatus('This request came from ChatGPT. Add your logo if needed, then click Generate Draft.','good');
    }
  }
  if(encodedPlan||encodedPrompt)history.replaceState(null,'',location.pathname+location.search);
}

$('aiDesignerToggle')?.addEventListener('click',()=>{
  if($('aiDesignerPanel')?.classList.contains('hidden'))openPanel();else closePanel();
});
$('aiDesignerClose')?.addEventListener('click',closePanel);
$('aiGenerate')?.addEventListener('click',()=>requestPlan(lastPlan?'revise':'create'));
$('aiApply')?.addEventListener('click',async()=>{
  if(!lastPlan)return;
  try{await applyPlan(lastPlan)}catch(error){setStatus(error.message,'bad');}
});
$('aiDesignerReset')?.addEventListener('click',resetAI);
$('aiLogoUpload')?.addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    setStatus('Preparing your logo…','working');
    logoDataUrl=await fileToOptimizedDataUrl(file);
    logoFilename=file.name||'uploaded-logo.png';
    $('aiLogoName').textContent=logoFilename;
    setStatus(lastPlan?'Logo ready. Click Apply Draft to place it, or give AI another instruction.':'Logo ready. Describe the design you want.','good');
  }catch(error){
    event.target.value='';
    logoDataUrl='';
    $('aiLogoName').textContent='No AI logo selected';
    setStatus(error.message,'bad');
  }
});
$('aiDesignerPrompt')?.addEventListener('keydown',event=>{
  if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();requestPlan(lastPlan?'revise':'create');}
});

resetAI();
handleLaunchLink();
window.MQDAIDesigner={
  getPlan:()=>lastPlan,
  applyPlan,
  open:openPanel
};
