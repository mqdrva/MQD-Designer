import {templateRequest} from './template-api.js';
import {cloneTemplate,remainingTemplateFields} from './template-contract.js';
const params=new URLSearchParams(location.search);
function showTemplateControls(){
 const fields=window.MQDDesigner.templateFields();let panel=document.getElementById('templateCustomize');
 if(!fields){panel?.remove();return;}
 if(!panel){panel=document.createElement('section');panel.id='templateCustomize';panel.setAttribute('aria-label','Customize your look');panel.style.cssText='padding:16px;background:#fff7ee;border:1px solid #ffd2a8;border-radius:12px;margin:12px 0';const target=document.getElementById('layers')?.closest('section')||document.getElementById('layers')?.parentElement;target?.before(panel);}
 if(panel.dataset.copy===fields.copyId){for(const field of fields.fields){const input=panel.querySelector('[data-field-id="'+field.layerId+'"]');if(input&&field.role==='text'&&document.activeElement!==input)input.value=field.value;}return;}panel.dataset.copy=fields.copyId;panel.replaceChildren();
 const title=document.createElement('h3');title.textContent=fields.name;const steps=document.createElement('p');steps.textContent='1. Replace logo → 2. Edit business details → 3. Review shirt';steps.style.lineHeight='1.6';panel.append(title,steps);
 for(const field of fields.fields){
   const label=document.createElement('label');label.textContent=field.label+' · '+field.zone;label.style.cssText='display:block;margin:14px 0;font-size:13px;font-weight:700';
   const input=document.createElement('input');input.style.cssText='display:block;width:100%;box-sizing:border-box;padding:10px;margin-top:6px;font:inherit;border:1px solid #ccc;border-radius:8px;background:#fff';input.dataset.fieldId=field.layerId;input.setAttribute('aria-label',field.label+' · '+field.zone);
   if(field.role==='logo'){input.type='file';input.accept='image/png,image/jpeg,image/webp';}else{input.type='text';input.maxLength=180;input.value=field.value;}
   const status=document.createElement('span');status.setAttribute('role','status');status.style.cssText='display:block;font-weight:400;margin-top:4px';
   input.onchange=async()=>{try{await window.MQDDesigner.templateFieldEdit(field.layerId,field.role==='logo'?input.files?.[0]:input.value);status.textContent=field.role==='logo'?'Logo replaced ✓':'Details updated ✓';}catch(error){status.textContent=error.message;}};label.append(input,status);panel.append(label);
 }
 const review=document.createElement('button');review.textContent='Review shirt';review.className='btn orange';review.onclick=()=>{const left=remainingTemplateFields(window.MQDDesigner.exportDesign());if(left.length){alert('Still to replace: '+left.join(', '));return;}window.dispatchEvent(new CustomEvent('mqd:show-preview',{detail:{reason:'template-review'}}));};panel.append(review);
 if(params.has('templateDemo')){const reopen=document.createElement('button');reopen.className='btn';reopen.textContent='Reopen saved demo';reopen.style.marginTop='12px';reopen.onclick=()=>location.assign('/index.html?templateDemo='+encodeURIComponent(params.get('templateDemo'))+'&resumeDemo=1');panel.append(reopen);}
 const scratch=document.createElement('a');scratch.href='/index.html';scratch.textContent='Start from scratch';scratch.style.cssText='display:block;margin-top:16px';panel.append(scratch);
}
window.addEventListener('mqd:selection-changed',showTemplateControls);
export async function loadSelectedTemplate({onLoad=()=>{}}={}){
 if(!params.has('template')&&!params.has('templateDemo')&&!params.has('templateOwnerPreview'))return;
 let payload;
 if(params.has('templateDemo')){
   const {demoVersions}=await import('./template-demo.js');const version=demoVersions.find(v=>v.template_id===params.get('templateDemo'));if(!version)throw new Error('Choose an available demo design.');
   payload=cloneTemplate(version);payload.design.template.demo=true;
   if(params.has('resumeDemo')){const saved=JSON.parse(localStorage.getItem('mqd-template-demo-save')||'null');if(!saved||saved.design?.template?.id!==version.template_id)throw new Error('Save this demo before reopening it.');payload=saved;}
 }else if(params.has('templateOwnerPreview')){
   const raw=localStorage.getItem('mqd-owner-template-preview');if(!raw)throw new Error('Open the preview from Shirt Templates again.');payload=JSON.parse(raw);localStorage.removeItem('mqd-owner-template-preview');
 }else payload=(await templateRequest({action:'select',id:params.get('template'),versionId:params.get('templateVersion')})).payload;
 const started=Date.now();while(!window.MQDDesigner?.loadDesign){if(Date.now()-started>20000)throw new Error('The designer is still loading. Please refresh.');await new Promise(r=>setTimeout(r,100));}
 await Promise.all(Object.values(payload.design.zones).flatMap(state=>state.layers.filter(l=>l.type==='image'&&l.src).map(l=>new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{l.image=img;resolve();};img.onerror=()=>reject(new Error('Template artwork could not be loaded.'));img.src=l.src;}))));
 await window.MQDDesigner.loadDesign(payload,{notify:false});onLoad();showTemplateControls();
 if(params.has('templateDemo')){const note=document.createElement('div');note.textContent='UNPUBLISHED DEMO · Saved locally only. Ordering is disabled.';note.style.cssText='padding:12px;background:#fff0c9;font:700 14px Arial;text-align:center';document.querySelector('header')?.after(note);}
}
