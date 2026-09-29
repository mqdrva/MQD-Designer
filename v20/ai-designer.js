import {AI_PRODUCTS,sanitizePlan,productForPlan,decodePlan,decodePrompt} from './ai-design-contract.js';
import {createContextId,validContextId,saveDraftAssets,loadDraftAssets,removeDraftAssets} from './ai-draft-assets.js';
import {buildDraftPayload} from './ai-draft-builder.js';

const $=id=>document.getElementById(id);
const CHATGPT_URL='https://chatgpt.com/';
let contextId=createContextId();
let assets={logo:null,artwork:null};
let lastPlan=null;
let busy=false;
const sessionKey='mqd-ai-draft-context';

function setStatus(message,tone=''){$('aiDesignerStatus').textContent=message;$('aiDesignerStatus').dataset.tone=tone;}
function currentProductId(){return $('productSelect')?.value||window.MQDDesigner?.getContext?.()?.productId||'tshirt';}
function updateAssetLabels(){
  $('aiLogoName').textContent=assets.logo?.filename||'No logo selected';
  $('aiArtworkName').textContent=assets.artwork?.filename||'No background image selected';
}
function rememberSession(){try{sessionStorage.setItem(sessionKey,contextId);}catch{}}
async function persist(){
  await saveDraftAssets(contextId,{assets,prompt:$('aiDesignerPrompt').value,plan:lastPlan});
  rememberSession();
}
async function restore(id){
  const record=await loadDraftAssets(id);
  contextId=id;assets=record?.assets||{logo:null,artwork:null};lastPlan=record?.plan||null;
  $('aiDesignerPrompt').value=record?.prompt||'';
  updateAssetLabels();rememberSession();return record;
}
function waitForDesigner(timeout=20000){
  const start=Date.now();
  return new Promise((resolve,reject)=>{
    const tick=()=>{
      if(window.MQDDesigner?.exportDesign&&window.MQDDesigner?.loadDesign)return resolve(window.MQDDesigner);
      if(Date.now()-start>timeout)return reject(new Error('The designer is still loading. Please try again.'));
      setTimeout(tick,80);
    };tick();
  });
}
async function readImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file?.type))throw new Error('Choose a PNG, JPG, or WebP image.');
  if(file.size>20*1024*1024)throw new Error('Choose an image smaller than 20 MB.');
  const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('The image could not be read.'));reader.readAsDataURL(file);});
  const img=new Image();img.src=src;
  try{await img.decode();}catch{throw new Error('This image could not be opened. Choose a valid PNG, JPG, or WebP.');}
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>64000000)throw new Error('Choose an image with fewer than 64 million pixels.');
  return {src,filename:file.name,width:img.naturalWidth,height:img.naturalHeight};
}
async function run(action){
  if(busy)return;
  busy=true;
  const controls=['aiGenerate','aiArtworkGenerate','aiApply','aiDesignerReset','aiLogoUpload','aiArtworkUpload','aiDraftUpload','aiImportJson'].map($);
  controls.forEach(control=>{control.disabled=true;});
  try{await action();}catch(error){setStatus(error.message,'bad');}
  finally{busy=false;controls.forEach(control=>{control.disabled=false;});}
}
async function acceptPlan(raw){
  if(!raw||raw.version!=='mqd-ai-plan-v1'||!AI_PRODUCTS.some(p=>p.id===raw.productId)||!Array.isArray(raw.zones)||!raw.zones.length)throw new Error('This is not a MyMerchNow draft. Import the design-plan.json file from ChatGPT.');
  const product=productForPlan(raw.productId);
  if(raw.zones.length!==product.zones.length||new Set(raw.zones.map(z=>z?.zone)).size!==product.zones.length)throw new Error('The draft must include every garment zone exactly once. Ask ChatGPT to include the sleeves and collar too.');
  if(raw.contextId!=null&&!validContextId(raw.contextId))throw new Error('The draft reference was changed. Ask ChatGPT to copy the contextId exactly from your request.');
  for(const zone of raw.zones){
    if(!product.zones.includes(zone.zone)||!Array.isArray(zone.elements)||zone.elements.length>6||zone.elements.some(el=>!['logo','text','artwork'].includes(el?.kind)))throw new Error('The draft contains an unsupported zone or layer. Ask ChatGPT to correct the draft.');
  }
  const safe=sanitizePlan(raw);
  if(safe.contextId&&safe.contextId!==contextId)await restore(safe.contextId);
  // An unmatched draft cannot silently borrow artwork from another request.
  if(!safe.contextId){contextId=createContextId();assets={logo:null,artwork:null};updateAssetLabels();}
  lastPlan={...safe,contextId};$('aiApply').hidden=false;
  await persist();await applyPlan(lastPlan);
}
async function applyPlan(plan){
  const designer=await waitForDesigner();
  const payload=buildDraftPayload(plan,assets,designer.exportDesign());
  await designer.loadDesign(payload,{notify:false});
  $('productSelect').value=payload.product.id;
  lastPlan=sanitizePlan(plan);
  setStatus('Draft applied with all required images. Review the front, back, and print quality before saving.','good');
  $('aiGenerate').textContent='Copy revision & open ChatGPT';$('aiApply').hidden=false;
  return lastPlan;
}
function buildChatGPTRequest(prompt){
  const product=productForPlan(currentProductId());
  return [
    'Create a downloadable apparel layout draft in this chat. This is the MyMerchNow file-import workflow: do not call the MyMerchNow plugin, which is paused. Create the JSON file directly. Do not generate an image in this step; I will request the background separately.',
    `Starting garment: ${product.name} (${product.id}). Valid zones: ${product.zones.join(', ')}.`,
    `Customer request: ${prompt}`,
    `Draft contextId: ${contextId}. Copy this exactly into the draft so my uploaded logo is restored in the website.`,
    `Logo selected on website: ${assets.logo?'yes':'no'}. Background image selected on website: ${assets.artwork?'yes':'no'}.`,
    'If a patterned, abstract, photographic, water, or illustrated background is requested, include kind artwork layers for a background image I will generate and upload separately. Never substitute solid color or text slashes for the requested artwork.',
    'Return a downloadable design-plan.json AND a JSON code block using this shape:',
    JSON.stringify({version:'mqd-ai-plan-v1',contextId,productId:product.id,summary:'Brief description',zones:[{zone:product.zones[0],background:'#000000',elements:[{kind:'artwork',x:0,y:0,scale:1,rotation:0},{kind:'logo',x:0,y:-15,scale:.4,rotation:0}]}]}),
    'Use kind artwork for the downloaded background image, kind logo for my original logo, and kind text with text, color, font, bold, x, y, scale, rotation for words or a phone number. Allowed fonts: Inter, Montserrat, Poppins, Oswald, Bebas Neue, Anton, Archivo Black, Black Ops One, Righteous, Russo One, League Spartan.',
    'Include EVERY garment zone. For an all-over background, include an artwork layer in every zone at scale 1. Use x/y -100 to 100 (0=center), at most six layers per zone. Logo scale is a fraction of the contained zone size: use about 0.4 for a centered front logo and 0.25 for a smaller back logo, at most 0.8. Text scale is a font-size multiplier: use 0.8 to 1.0 for a readable phone number, NOT 0.18. Put the phone number below the logo with a larger y, such as 25.',
    lastPlan?`Current draft to revise (retain unrequested details): ${JSON.stringify(lastPlan)}`:'',
    'Explain that I must return to the original website tab, import design-plan.json using Import draft, and upload the downloaded background image. The draft is not complete until its required images have been applied. Do not invent a website link or claim to have changed the website.',
    'Do not change garment models, UVs, mappings, templates, renderer behavior, pricing, checkout, or authentication.'
  ].filter(Boolean).join('\n');
}
async function openInChatGPT(){
  const prompt=$('aiDesignerPrompt').value.trim();
  if(!prompt)throw new Error('Describe the design before opening ChatGPT.');
  await persist();
  const request=buildChatGPTRequest(prompt);
  await copyAndOpen(request,'Request copied. Paste it into ChatGPT, download design-plan.json, and import it here. Your logo is saved in this browser for 24 hours.');
}
async function openBackgroundInChatGPT(){
  const prompt=$('aiDesignerPrompt').value.trim();
  if(!prompt)throw new Error('Describe your background in the design request first.');
  await persist();
  const request=`Generate a flat, high-resolution background artwork image for an all-over print garment. Brief: ${prompt}\nCreate ONLY the background described in the brief. No shirt mockup, garment silhouette, logo, text, letters, phone number, watermark, or cutlines. Let the pattern fill the entire rectangular image edge to edge. Keep it suitable for placing a separate logo on top. I will download this image and upload it into MyMerchNow myself. Do not call the MyMerchNow plugin or claim to have changed the website.`;
  await copyAndOpen(request,'Background request copied. Paste it into ChatGPT, download the generated image, then upload it here under Background image.');
}
async function copyAndOpen(request,message){
  $('aiCopiedRequest').value=request;$('aiRequestDetails').hidden=false;$('aiChatGPTLink').hidden=false;
  try{await navigator.clipboard.writeText(request);}catch{
    $('aiRequestDetails').open=true;
    throw new Error('Automatic copying was blocked. Copy the request shown below, then use Open ChatGPT. Your logo is saved.');
  }
  window.open(CHATGPT_URL,'_blank','noopener,noreferrer');
  setStatus(message,'good');
  $('aiChatGPTLink').hidden=false;
}
function openPanel(){$('aiDesignerPanel').classList.remove('hidden');$('aiDesignerToggle').setAttribute('aria-expanded','true');}
function closePanel(){$('aiDesignerPanel').classList.add('hidden');$('aiDesignerToggle').setAttribute('aria-expanded','false');}
async function resetAI(){
  await removeDraftAssets(contextId);
  contextId=createContextId();assets={logo:null,artwork:null};lastPlan=null;
  for(const id of ['aiLogoUpload','aiArtworkUpload','aiDraftUpload','aiDesignerPrompt','aiDraftJson','aiCopiedRequest'])$(id).value='';
  $('aiRequestDetails').hidden=true;$('aiRequestDetails').open=false;$('aiChatGPTLink').hidden=true;
  updateAssetLabels();rememberSession();
  $('aiApply').hidden=true;$('aiGenerate').textContent='Copy request & open ChatGPT';
  setStatus('New draft started. Upload your logo and describe your design.','');
}
async function initialize(){
  const hash=new URLSearchParams(location.hash.slice(1));
  const rawPlan=location.hash.slice(1).split('&').find(part=>part.startsWith('ai-plan='));
  let plan=null;
  if(rawPlan){
    try{plan=decodePlan(decodeURIComponent(rawPlan.slice(8)));}catch{}
    if(!plan){openPanel();throw new Error('This draft link is incomplete. Import the draft file from ChatGPT instead.');}
  }
  let storedId=null;try{storedId=sessionStorage.getItem(sessionKey);}catch{}
  const id=plan?.contextId||(!rawPlan&&validContextId(storedId)?storedId:null);
  if(id)await restore(id);else rememberSession();
  if(plan){openPanel();await acceptPlan(plan);history.replaceState(null,'',location.pathname+location.search);}
  else if(hash.has('ai-prompt')){$('aiDesignerPrompt').value=decodePrompt(hash.get('ai-prompt'));openPanel();}
  else if(lastPlan){$('aiApply').hidden=false;setStatus('Your draft and images are restored. Click Apply Draft to preview it.','');}
}

$('aiDesignerToggle').addEventListener('click',()=>{$('aiDesignerPanel').classList.contains('hidden')?openPanel():closePanel();});
$('aiDesignerClose').addEventListener('click',closePanel);
$('aiGenerate').addEventListener('click',()=>run(openInChatGPT));
$('aiArtworkGenerate').addEventListener('click',()=>run(openBackgroundInChatGPT));
$('aiApply').addEventListener('click',()=>run(async()=>{if(lastPlan)await applyPlan(lastPlan);}));
$('aiDesignerReset').addEventListener('click',()=>run(resetAI));
for(const [id,kind] of [['aiLogoUpload','logo'],['aiArtworkUpload','artwork']]){
  $(id).addEventListener('change',event=>run(async()=>{
    const file=event.target.files?.[0];if(!file)return;
    setStatus('Saving your image…','working');
    const asset=await readImage(file);
    const next={...assets,[kind]:asset};
    await saveDraftAssets(contextId,{assets:next,prompt:$('aiDesignerPrompt').value,plan:lastPlan});
    assets=next;updateAssetLabels();rememberSession();
    setStatus(lastPlan?'Image saved. Click Apply Draft to preview the complete design.':'Image saved. Describe your design and continue in ChatGPT.','good');
  }));
}
$('aiDraftUpload').addEventListener('change',event=>run(async()=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>64000)throw new Error('The draft file is too large. Upload only design-plan.json here.');
  let plan;try{plan=JSON.parse(await file.text());}catch{throw new Error('This file is not valid draft JSON. Choose design-plan.json from ChatGPT.');}
  await acceptPlan(plan);
}));
$('aiImportJson').addEventListener('click',()=>run(async()=>{
  const text=$('aiDraftJson').value.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
  if(text.length>64000)throw new Error('The draft is too large.');
  let plan;try{plan=JSON.parse(text);}catch{throw new Error('Paste only the draft JSON code block from ChatGPT.');}
  await acceptPlan(plan);
}));
$('aiDesignerPrompt').addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();run(openInChatGPT);}});
updateAssetLabels();run(initialize);
window.MQDAIDesigner={getPlan:()=>lastPlan,applyPlan,open:openPanel};
