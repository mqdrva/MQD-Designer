import {AI_PRODUCTS,AI_TSHIRT_CHEST_LAYOUT,sanitizePlan,productForPlan,decodePlan,decodePrompt} from './ai-design-contract.js';
import {createContextId,validContextId,saveDraftAssets,loadDraftAssets,removeDraftAssets} from './ai-draft-assets.js';
import {buildDraftPayload} from './ai-draft-builder.js';
import {decodeTransfer} from './ai-transfer-contract.js';

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
  const controls=['aiGenerate','aiApply','aiDesignerReset','aiLogoUpload','aiArtworkUpload','aiDraftUpload','aiImportJson'].map($);
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
  $('aiGenerate').textContent='Revise in ChatGPT';$('aiApply').hidden=false;
  return lastPlan;
}
function buildChatGPTRequest(prompt){
  const product=productForPlan(currentProductId());
  // Keep placement from an earlier draft without showing ChatGPT the old artwork.
  // A full prior plan can make a new background request look like an image edit.
  const previousLayout=lastPlan?lastPlan.zones.map(zone=>({
    zone:zone.zone,
    background:zone.background,
    elements:zone.elements.filter(element=>element.kind!=='artwork').map(element=>({
      kind:element.kind,text:element.text,x:element.x,y:element.y,scale:element.scale,
      rotation:element.rotation,color:element.color,font:element.font,bold:element.bold,
      letterSpacing:element.letterSpacing,order:element.order
    }))
  })):null;
  return [
    'Prepare the MyMerchNow shirt layout only. Call prepare_design_preview and show its exact Upload background and view shirt link. Do NOT generate an image in this conversation or call an image tool. For a requested visual background, give the customer a short, standalone background-only prompt to paste into a separate ChatGPT Images chat. They will save that image and upload it once through the prepared link. For a layout-only revision, reuse the saved website background. If the tool is unavailable or fails, explain the connection error without claiming the shirt is ready.',
    `Starting garment: ${product.name} (${product.id}). Valid zones: ${product.zones.join(', ')}.`,
    `Customer request: ${prompt}`,
    `Draft contextId: ${contextId}. Copy this exactly into the draft so my uploaded logo is restored in the website.`,
    `Logo stored on website: ${assets.logo?'yes':'no'}. The logo image is not attached to this ChatGPT message and must never be sent to the image generator.`,
    `Website background available for layout-only reuse: ${assets.artwork?'yes':'no'}. This is not an image attached to ChatGPT and is not an image-edit target. Ignore it if the customer describes a new background.`,
    'If a patterned, kid-friendly, abstract, photographic, water, or illustrated background is requested, include kind artwork layers in the layout. Do not generate that image here. After preparing the layout, provide a standalone prompt distilled ONLY from the background portion of the customer request for a separate ChatGPT Images chat. Ask for a NEW flat rectangular image from text alone, edge to edge, with no shirt mockup, logo, phone number, text, cutlines, or garment silhouette. Never substitute solid color or text slashes for the requested artwork. For a layout-only revision, reuse the saved website background and do not request another image.',
    'Build the layout internally using this shape (do not show the JSON as your main answer):',
    JSON.stringify({version:'mqd-ai-plan-v1',contextId,productId:product.id,summary:'Brief description',zones:[{zone:product.zones[0],background:'#000000',elements:[{kind:'artwork',x:0,y:0,scale:1,rotation:0},AI_TSHIRT_CHEST_LAYOUT.frontLogo]}]}),
    'Use kind artwork for the downloaded background image, kind logo for my original logo, and kind text with text, color, font, bold, x, y, scale, rotation for words or a phone number. Allowed fonts: Inter, Montserrat, Poppins, Oswald, Bebas Neue, Anton, Archivo Black, Black Ops One, Righteous, Russo One, League Spartan.',
    'Include EVERY garment zone. For an all-over background, include an artwork layer in every zone at x 0, y 0, scale 1. Use x/y -100 to 100 (negative y is higher), at most six layers per zone. Logo scale is a fraction of the contained zone size, at most 0.8. Text scale is a font-size multiplier: use 0.8 to 1.0 for a readable phone number, NOT 0.18. letterSpacing is allowed from -10 to 30.',
    product.id==='tshirt'?`For a standard centered chest logo with smaller back logo and phone below, use this placement reference unless the customer explicitly asks for a different location or size: ${JSON.stringify(AI_TSHIRT_CHEST_LAYOUT)}. Replace the phone text with the customer's wording. Center means horizontally centered on the chest, not low on the stomach. The back phone remains near the upper-back logo, not below the middle of the shirt. Preserve explicit adjustments in a revision.`:'',
    previousLayout?`Previous logo and text layout to retain unless the customer changes it (no prior artwork included): ${JSON.stringify(previousLayout)}`:'',
    `Return website: ${location.origin}${location.pathname}${location.search}`,
    'Call prepare_design_preview with productId, summary, contextId, EVERY zone, the exact returnUrl above, and backgroundAction="upload". OMIT backgroundFile: the pending layout link does not require an image. Do not send internal file paths or invent URLs. If this is only a layout revision and a website background is available, call with backgroundAction="reuse" instead. Use "none" for a plain solid-color design without artwork layers.',
    'Visibly publish the tool-provided link labeled "Upload background and view shirt". Tell the customer to open https://chatgpt.com/images/ in a separate chat, paste your short background-only prompt, save the resulting image, then open the MyMerchNow link in the SAME browser where they uploaded their logo and choose the image once. Their logo, text, and layout are already waiting there; the shirt preview appears after upload. Do not generate an image in this layout conversation, show JSON as the main answer, or claim the shirt is finished before upload. If a background image was already made for this request, reuse it rather than asking for another generation.',
    'Do not change garment models, UVs, mappings, templates, renderer behavior, pricing, checkout, or authentication.'
  ].filter(Boolean).join('\n');
}
async function openInChatGPT(){
  const prompt=$('aiDesignerPrompt').value.trim();
  if(!prompt){
    $('aiDesignerPrompt').focus();
    throw new Error('Type your shirt description in the box above, then click Continue in ChatGPT. The example is only a guide.');
  }
  await persist();
  let availability;
  try{const response=await fetch('/api/ai-handoff-status',{cache:'no-store'});if(response.ok)availability=await response.json();}catch{}
  if(!availability?.enabled)throw new Error('Automatic background transfer is not connected on this test page yet. Your logo and request are saved. No ChatGPT request was sent; wait for the connected test link.');
  const request=buildChatGPTRequest(prompt);
  await copyAndOpen(request,'Request copied. In ChatGPT, select @MyMerchNow, paste, and send. Save the shirt link it returns. If you requested a background, make it separately in ChatGPT Images, then open the shirt link here and choose the image once.');
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
  $('aiApply').hidden=true;$('aiGenerate').textContent='Continue in ChatGPT';
  setStatus('New draft started. Upload your logo and describe your design.','');
}
async function initialize(){
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('ai-transfer')){
    openPanel();
    const transfer=decodeTransfer(hash.get('ai-transfer'));
    await restore(transfer.plan.contextId);
    lastPlan=transfer.plan;
    if(transfer.needsBackgroundUpload){
      assets.artwork=null;
      await persist();updateAssetLabels();
      $('aiBackgroundStep').open=true;
      $('aiApply').hidden=true;
      setStatus('Your logo and layout are ready. Save the background image from ChatGPT, then choose it below. Your finished shirt will appear automatically.','');
      history.replaceState(null,'',location.pathname+location.search);
      return;
    }
    await persist();
    if(transfer.artwork){
      setStatus('Receiving your generated background from ChatGPT…','working');
      const response=await fetch('/api/ai-artwork',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(transfer.artwork)});
      if(!response.ok){const problem=await response.json().catch(()=>({}));throw new Error(problem.error||'The background could not be transferred. Reopen this link to retry; you do not need to generate another image.');}
      const blob=await response.blob();
      assets.artwork=await readImage(new File([blob],transfer.artwork.file_name,{type:blob.type}));
      await persist();updateAssetLabels();
    }
    await acceptPlan(transfer.plan);
    history.replaceState(null,'',location.pathname+location.search);
    return;
  }
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
  else if(lastPlan){
    const needsBackground=lastPlan.zones.some(z=>z.elements.some(e=>e.kind==='artwork'))&&!assets.artwork;
    $('aiApply').hidden=needsBackground;
    if(needsBackground){openPanel();$('aiBackgroundStep').open=true;}
    setStatus(needsBackground?'Your logo and layout are saved. Choose the background image you saved from ChatGPT below to finish your shirt.':'Your draft and images are restored. Click Apply Draft to preview it.','');
  }
}

$('aiDesignerToggle').addEventListener('click',()=>{$('aiDesignerPanel').classList.contains('hidden')?openPanel():closePanel();});
$('aiDesignerClose').addEventListener('click',closePanel);
$('aiGenerate').addEventListener('click',()=>run(openInChatGPT));
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
    if(lastPlan)await applyPlan(lastPlan);
    else setStatus('Image saved. Describe your design and continue in ChatGPT.','good');
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
window.addEventListener('hashchange',()=>{if(location.hash.includes('ai-transfer=')||location.hash.includes('ai-plan='))run(initialize);});
window.MQDAIDesigner={getPlan:()=>lastPlan,applyPlan,open:openPanel};
