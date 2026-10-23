import {templateLayers} from './template-contract.js';
import {validateTeamMaster} from '../supabase/functions/_shared/mqd-team-masters.js';
export function mountTeamMasterAuthor(parent,call,{studioUrl=null}={}){
 const section=document.createElement('section');section.className='card';
 const heading=document.createElement('h2');heading.textContent='Team master design';
 const help=document.createElement('p');help.textContent=(studioUrl?'Open the garment designer, save the owner master there, then return here and load the saved master to choose member fields. Strict masters support one 3D garment and text-only edits. ':'')+'Create your design in the existing designer and save its editable design JSON. Load it here, choose the member fields, then save a draft or publish a new version. Publishing never changes purchased orders. The flexible locked-logo designer remains available until a master is published.';
 const link=document.createElement('a');link.href=studioUrl||'/?owner=1';link.target=studioUrl?'_self':'_blank';link.rel='noopener';link.textContent='Open garment designer';
 const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Load editable master design');
 const name=document.createElement('input');name.placeholder='Master design name';name.maxLength=100;name.setAttribute('aria-label','Master design name');
 const fields=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');
 let draft=null,revision=0;
 const render=()=>{fields.replaceChildren();name.value=draft?.name||'';if(!draft)return;for(const rule of draft.rules){
  const row=document.createElement('div');row.style.margin='12px 0';const layer=templateLayers(draft.payload).find(x=>x.zone===rule.zone&&x.layer.id===rule.layerId).layer;
  const label=document.createElement('label');label.textContent=rule.zone+' · '+(layer.text||layer.filename||layer.label||rule.layerId)+' ';const permission=document.createElement('select');permission.add(new Option('Locked artwork and styling','locked'));if(layer.type==='text')permission.add(new Option('Member can change text only','text'));permission.value=rule.role;permission.onchange=()=>{rule.role=permission.value;rule.maxLength=rule.maxLength||30;render();};label.append(permission);row.append(label);
  if(rule.role==='text'){
   for(const [title,value,update] of [['Field label',rule.label,v=>rule.label=v],['Maximum characters',rule.maxLength||30,v=>rule.maxLength=Number(v)],['Allowed choices, separated by commas (optional)',(rule.choices||[]).join(', '),v=>{if(v.trim())rule.choices=v.split(',').map(x=>x.trim());else delete rule.choices;}]]){const l=document.createElement('label');l.textContent=title;const input=document.createElement('input');input.value=value;input.oninput=()=>update(input.value);l.append(input);row.append(l);}
  }fields.append(row);
 }};
 const load=document.createElement('button');load.type='button';load.textContent='Load saved master';load.onclick=async()=>{load.disabled=true;try{const r=await call('master-load');draft=r.draft;revision=r.revision;render();status.textContent=draft?'Saved draft loaded.':'No saved master yet.';}catch(e){status.textContent=e.message;}finally{load.disabled=false;}};
 file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>45*1024*1024)throw new Error('This original exceeds the master upload limit. Keep the original intact and contact MQD.');const p=JSON.parse(await f.text());const payload=p.schema==='mqd-shop-design-v1'?p.design:p;draft={name:name.value||'Team master',payload,rules:templateLayers(payload).map(({zone,layer})=>({zone,layerId:layer.id,role:'locked',label:layer.label||layer.text||layer.filename||layer.id}))};validateTeamMaster(draft);render();status.textContent='Design loaded. Select only the text fields members may change.';}catch(e){draft=null;status.textContent=e.message;}};
 section.append(heading,help,link,file,name,fields,load);
 for(const publish of [false,true]){const button=document.createElement('button');button.type='button';button.textContent=publish?'Publish new master version':'Save master draft';button.onclick=async()=>{button.disabled=true;try{if(!draft)throw new Error('Load a master design first.');draft.name=name.value;validateTeamMaster(draft);const r=await call('master-save',{draft,revision,publish});revision=r.revision;status.textContent=publish?'New master published. Existing member copies and orders retain their original version.':'Master draft saved.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};section.append(button);}
 section.append(status);parent.append(section);load.click();return section;
}
