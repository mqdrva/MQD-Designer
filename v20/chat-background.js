import {backgroundPrompt,addChatBackground} from './chat-background-payload.js';
const $=id=>document.getElementById(id);
const prompt=$('chatBackgroundPrompt'),status=$('chatBackgroundStatus');
const setStatus=(text,tone='')=>{status.textContent=text;status.dataset.tone=tone;};
const savedKey='mqd-chat-background-description';
try{prompt.value=sessionStorage.getItem(savedKey)||'';}catch{}
prompt.addEventListener('input',()=>{try{sessionStorage.setItem(savedKey,prompt.value);}catch{}});
$('chatBackgroundToggle').addEventListener('click',()=>{
  const panel=$('chatBackgroundPanel');panel.classList.toggle('hidden');
  $('chatBackgroundToggle').setAttribute('aria-expanded',String(!panel.classList.contains('hidden')));
});
$('chatBackgroundClose').addEventListener('click',()=>{
  $('chatBackgroundPanel').classList.add('hidden');$('chatBackgroundToggle').setAttribute('aria-expanded','false');
});
$('chatBackgroundCreate').addEventListener('click',async()=>{
  if(!prompt.value.trim()){prompt.focus();setStatus('Describe the background you want first.','bad');return;}
  const request=backgroundPrompt(prompt.value);
  $('chatBackgroundCopy').value=request;$('chatBackgroundManual').hidden=false;$('chatBackgroundOpen').hidden=false;
  try{await navigator.clipboard.writeText(request);}catch{
    $('chatBackgroundManual').open=true;
    setStatus('Copy the prompt shown below, then click Open ChatGPT Images.','');return;
  }
  window.open('https://chatgpt.com/images/','_blank','noopener,noreferrer');
  setStatus('Prompt copied. Paste it into ChatGPT Images and send. Save the image, then return to this tab and upload it below. If no tab opened, click Open ChatGPT Images.','good');
});
$('chatBackgroundUpload').addEventListener('change',async event=>{
  const input=event.target,file=input.files?.[0];if(!file)return;
  input.disabled=true;
  try{
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw new Error('Choose a PNG, JPG, or WebP image smaller than 20 MB.');
    setStatus('Loading your background…');
    const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The image could not be read.'));reader.readAsDataURL(file);});
    const image=new Image();image.src=src;await image.decode();
    if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>64000000)throw new Error('Choose an image smaller than 64 million pixels.');
    const designer=window.MQDDesigner;if(!designer?.exportDesign)throw new Error('The garment is still loading. Please upload the image again in a moment.');
    const current=designer.exportDesign();
    const zones=$('chatBackgroundAreas').value==='all'?Object.keys(current.templates):[current.activeZone];
    await designer.loadDesign(addChatBackground(current,{src,filename:file.name},zones),{notify:false});
    $('chatBackgroundFilename').textContent=file.name;
    setStatus('Background applied beneath your existing artwork. Use Add Image for your logo and Add Text for words. Review each side, then Save Design.','good');
  }catch(error){setStatus(error.message||'The image could not be opened. Try a PNG or JPG.','bad');}
  finally{input.disabled=false;input.value='';}
});
