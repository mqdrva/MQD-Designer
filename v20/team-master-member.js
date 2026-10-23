import {mountTeamColorPresets} from './team-color-presets.js';
import {cloneTeamMaster,assertTeamMemberCopy} from '../supabase/functions/_shared/mqd-team-masters.js';
export async function mountTeamMember(master,{payload=null}={}){
 const designer=window.MQDDesigner;if(!designer)throw new Error('Team master requires the 3D designer.');
 const copy=payload||cloneTeamMaster(master);assertTeamMemberCopy(copy,master,{complete:false});
 await designer.loadDesign(copy,{notify:false});window.MQDTeamMaster=master;
 document.getElementById('teamMemberFields')?.remove();
 const box=document.createElement('fieldset');box.id='teamMemberFields';const legend=document.createElement('legend');legend.textContent=master.name+' · Your personal copy';box.append(legend);
 const note=document.createElement('p');note.textContent='Use only the controls below. Logos, artwork and styling stay protected. Text can move and shirt colors can change only where MQD has allowed it. Your edits affect only your copy.';box.append(note);
 for(const rule of master.rules.filter(r=>r.role==='text')){
  const label=document.createElement('label');label.textContent=rule.label;const layer=copy.design.zones[rule.zone].layers.find(l=>l.templateLayerId===rule.layerId);const input=document.createElement(rule.choices?'select':'input');
  if(rule.choices)for(const choice of rule.choices)input.add(new Option(choice,choice));else{input.type='text';input.maxLength=rule.maxLength;}
  const update=async mutate=>{const current=designer.exportDesign();mutate(current.design.zones[rule.zone].layers.find(l=>l.templateLayerId===rule.layerId));assertTeamMemberCopy(current,master,{complete:false});await designer.loadDesign(current,{notify:false});window.dispatchEvent(new Event('mqd:shop-design-change'));};
  input.value=layer.text;input.onchange=async()=>{try{await update(l=>l.text=input.value);}catch(error){document.getElementById('shopStatus').textContent=error.message;}};label.append(input);box.append(label);
  if(rule.allowMove)for(const [key,title] of [['x','left / right'],['y','up / down']]){const position=document.createElement('label');position.textContent=rule.label+' '+title;const slider=document.createElement('input');slider.type='range';slider.min='-100';slider.max='100';slider.step='1';slider.value=layer[key];slider.onchange=async()=>{try{await update(l=>l[key]=Number(slider.value));}catch(error){document.getElementById('shopStatus').textContent=error.message;}};position.append(slider);box.append(position);}

 }
 if(master.payload.design.teamPermissions?.wholeGarmentColor){
  const applyColor=async color=>{const current=designer.exportDesign();for(const zone of Object.values(current.design.zones))zone.background=color.toUpperCase();assertTeamMemberCopy(current,master,{complete:false});await designer.loadDesign(current,{notify:false});window.dispatchEvent(new Event('mqd:shop-design-change'));};
  const label=document.createElement('label');label.textContent='Custom whole-shirt color';const picker=document.createElement('input');picker.type='color';picker.value=copy.design.zones.Front.background;picker.onchange=()=>applyColor(picker.value).catch(error=>document.getElementById('shopStatus').textContent=error.message);label.append(picker);box.append(label);mountTeamColorPresets({container:box,applyColor,allowMaster:true});
 }
 document.getElementById('shopForm').prepend(box);
 const mobileOrder=document.querySelector('[data-mobile-pane="order"]');if(mobileOrder)mobileOrder.textContent='Personalize & Order';
 // Member inputs above are the only authoring controls for this mode. Server validation
 // independently enforces the same rule, including saved-file and direct API requests.
 for(const selector of ['#addImageBtn','#addTextBtn','#artUpload','#applyAll','#undo','#redo','#productSelect','#addText','#imageUpload','#zoneColor','#zoneHex','#copyGarment','#clearDesign','#addBusinessLogo'])document.querySelectorAll(selector).forEach(el=>el.disabled=true);
 const style=document.createElement('style');style.id='teamMasterControls';style.textContent='body[data-team-master="true"] #controlPane > :not(.shop-request),body[data-team-master="true"] .editor-toolbar,body[data-team-master="true"] [data-mobile-pane="control"]{display:none!important} body[data-team-master="true"] #teamMemberFields label{display:block;margin:12px 0} body[data-team-master="true"] #teamMemberFields input,body[data-team-master="true"] #teamMemberFields select{width:100%;box-sizing:border-box;padding:10px}';if(!document.getElementById(style.id))document.head.append(style);document.body.dataset.teamMaster='true';
 return copy;
}
