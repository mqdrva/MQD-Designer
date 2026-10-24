import {templateLayers} from './template-contract.js';
import {validateTeamMaster} from '../supabase/functions/_shared/mqd-team-masters.js';
export function renderTeamMasterRules(fields,draft){
 fields.replaceChildren();if(!draft)return;for(const rule of draft.rules){
  const row=document.createElement('div');row.style.margin='12px 0';row.dataset.ruleLayer=rule.layerId;row.dataset.ruleZone=rule.zone;const layer=templateLayers(draft.payload).find(x=>x.zone===rule.zone&&x.layer.id===rule.layerId).layer;
  const label=document.createElement('label');label.textContent=rule.zone+' · '+(layer.text||layer.filename||layer.label||rule.layerId)+' ';const permission=document.createElement('select');permission.add(new Option('Locked for customers (owner can edit)','locked'));if(layer.type==='text')permission.add(new Option('Customer can edit this text','text'));permission.value=rule.role;permission.onchange=()=>{rule.role=permission.value;if(rule.role==='locked')delete rule.allowMove;rule.maxLength=rule.maxLength||30;renderTeamMasterRules(fields,draft);};label.append(permission);row.append(label);
  if(rule.role==='text'){
   const moveLabel=document.createElement('label'),move=document.createElement('input');move.type='checkbox';move.checked=rule.allowMove===true;move.onchange=()=>rule.allowMove=move.checked;moveLabel.append(move,document.createTextNode(' Members may move this text within its zone'));row.append(moveLabel);
   for(const [title,value,update] of [['Field label',rule.label,v=>rule.label=v],['Maximum characters',rule.maxLength||30,v=>rule.maxLength=Number(v)],['Allowed choices, separated by commas (optional)',(rule.choices||[]).join(', '),v=>{if(v.trim())rule.choices=v.split(',').map(x=>x.trim());else delete rule.choices;}]]){const l=document.createElement('label');l.textContent=title;const input=document.createElement('input');input.value=value;input.oninput=()=>update(input.value);l.append(input);row.append(l);}
  }fields.append(row);
 }
}
export function mountTeamMasterAuthor(parent,call,{studioUrl=null,allowPublish=true,onLoaded=()=>{}}={}){
 const section=document.createElement('section');section.className='card';
 const heading=document.createElement('h2');heading.textContent='Team master design';
 const help=document.createElement('p');help.textContent=(studioUrl?'Open the garment designer, save the owner master there, then return here and load the saved master to choose member fields. Strict masters support one 3D garment, selected text edits and optional name movement. ':'')+'Create your design in the existing designer and save its editable design JSON. Load it here, choose the member fields, then save a draft. Use the explicit Publish control when ready. Publishing never changes purchased orders. The flexible locked-logo designer remains available until a master is published.';
 const link=document.createElement('a');link.href=studioUrl||'/?owner=1';link.target=studioUrl?'_self':'_blank';link.rel='noopener';link.textContent='Open garment designer';
 const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Load editable master design');
 const name=document.createElement('input');name.placeholder='Master design name';name.maxLength=100;name.setAttribute('aria-label','Master design name');
 const colorLabel=document.createElement('label');const colorPermission=document.createElement('input');colorPermission.type='checkbox';colorLabel.append(colorPermission,document.createTextNode(' Members may choose one whole-shirt color (logos and artwork stay locked)'));colorPermission.onchange=()=>{if(draft)draft.payload.design.teamPermissions={wholeGarmentColor:colorPermission.checked};};
 const fields=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');
 let draft=null,revision=0;
 const render=()=>{fields.replaceChildren();name.value=draft?.name||'';colorPermission.checked=!!draft?.payload.design.teamPermissions?.wholeGarmentColor;if(!draft)return;renderTeamMasterRules(fields,draft);
 };
 const load=document.createElement('button');load.type='button';load.textContent='Load saved master';load.onclick=async()=>{load.disabled=true;try{const r=await call('master-load');draft=r.draft;revision=r.revision;render();onLoaded(r);status.textContent=draft?'Saved draft loaded.':'No saved master yet.';}catch(e){status.textContent=e.message;}finally{load.disabled=false;}};
 file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>45*1024*1024)throw new Error('This original exceeds the master upload limit. Keep the original intact and contact MQD.');const p=JSON.parse(await f.text());const payload=p.schema==='mqd-shop-design-v1'?p.design:p;draft={name:name.value||'Team master',payload,rules:templateLayers(payload).map(({zone,layer})=>({zone,layerId:layer.id,role:'locked',label:layer.label||layer.text||layer.filename||layer.id}))};validateTeamMaster(draft);render();status.textContent='Design loaded. Select only the text fields members may change.';}catch(e){draft=null;status.textContent=e.message;}};
 section.append(heading,help,link,file,name,colorLabel,fields,load);
 for(const publish of allowPublish?[false,true]:[false]){const button=document.createElement('button');button.type='button';button.textContent=publish?'Publish new master version':'Save master draft';button.onclick=async()=>{button.disabled=true;try{if(!draft)throw new Error('Load a master design first.');draft.name=name.value;validateTeamMaster(draft);const r=await call('master-save',{draft,revision,publish});revision=r.revision;status.textContent=publish?'New master published. Existing member copies and orders retain their original version.':'Master draft saved.';}catch(e){status.textContent=e.message;}finally{button.disabled=false;}};section.append(button);}
 section.append(status);parent.append(section);load.click();return section;
}
