import {createTeamEditQueue} from './team-edit-queue.js';
import {mountTeamColorPresets} from './team-color-presets.js';
import {cloneTeamMaster,assertTeamMemberCopy} from '../supabase/functions/_shared/mqd-team-masters.js';
export async function mountTeamMember(master,{payload=null}={}){
 const designer=window.MQDDesigner;if(!designer)throw new Error('Team master requires the 3D designer.');
 await window.MQDTeamFlush?.().catch(()=>{});
 const copy=payload||cloneTeamMaster(master);assertTeamMemberCopy(copy,master,{complete:false});
 window.MQDTeamMaster=master;await designer.loadDesign(copy,{notify:false});
 const edits=createTeamEditQueue(designer,current=>assertTeamMemberCopy(current,master,{complete:false}),()=>window.dispatchEvent(new Event('mqd:shop-design-change')));window.MQDTeamFlush=()=>edits.flush();
 document.getElementById('teamMemberFields')?.remove();
 const box=document.createElement('fieldset');box.id='teamMemberFields';const legend=document.createElement('legend');legend.textContent=master.name+' · Your personal copy';box.append(legend);
 const note=document.createElement('p');note.textContent='Edit names below. Drag permitted names on the print-zone canvas or use their movement sliders. Logos, artwork and styling stay protected. Text can move and shirt colors can change only where MQD has allowed it. Your edits affect only your copy.';box.append(note);
 for(const rule of master.rules.filter(r=>r.role==='text')){
  const label=document.createElement('label');label.textContent=rule.label;const layer=copy.design.zones[rule.zone].layers.find(l=>l.templateLayerId===rule.layerId);const input=document.createElement(rule.choices?'select':'input');
  if(rule.choices)for(const choice of rule.choices)input.add(new Option(choice,choice));else{input.type='text';input.maxLength=rule.maxLength;}
  const update=mutate=>edits.apply(current=>mutate(current.design.zones[rule.zone].layers.find(l=>l.templateLayerId===rule.layerId)));
  input.value=layer.text;input.onchange=async()=>{const value=input.value;try{await update(l=>l.text=value);}catch(error){document.getElementById('shopStatus').textContent=error.message;}};label.append(input);box.append(label);
  if(rule.allowMove)for(const [key,title] of [['x','left / right'],['y','up / down']]){const position=document.createElement('label');position.textContent=rule.label+' '+title;const slider=document.createElement('input');slider.type='range';slider.min='-100';slider.max='100';slider.step='1';slider.value=layer[key];slider.dataset.teamLayer=rule.layerId;slider.dataset.teamZone=rule.zone;slider.dataset.teamCoordinate=key;slider.onchange=async()=>{const value=Number(slider.value);try{await update(l=>l[key]=value);}catch(error){document.getElementById('shopStatus').textContent=error.message;}};position.append(slider);box.append(position);}

 }
 if(master.payload.design.teamPermissions?.wholeGarmentColor){
  const applyColor=async color=>{await edits.apply(current=>{for(const zone of Object.values(current.design.zones))zone.background=color.toUpperCase();});box.querySelector('input[type=color]').value=color.toLowerCase();};
  const label=document.createElement('label');label.textContent='Custom whole-shirt color';const picker=document.createElement('input');picker.type='color';picker.value=copy.design.zones.Front.background;picker.onchange=()=>applyColor(picker.value).catch(error=>document.getElementById('shopStatus').textContent=error.message);label.append(picker);box.append(label);mountTeamColorPresets({container:box,applyColor,allowMaster:true});
 }
 const preview=document.createElement('button');preview.type='button';preview.className='btn team-member-preview';preview.textContent='Preview my shirt';preview.onclick=()=>window.dispatchEvent(new Event('mqd:show-preview'));box.append(preview);
 document.getElementById('shopForm').prepend(box);
 if(window.MQDTeamTextMoved)window.removeEventListener('mqd:team-text-moved',window.MQDTeamTextMoved);
 window.MQDTeamTextMoved=event=>{const moved=event.detail;try{assertTeamMemberCopy(designer.exportDesign(),master,{complete:false});for(const slider of box.querySelectorAll('[data-team-coordinate]'))if(slider.dataset.teamLayer===moved.layerId&&slider.dataset.teamZone===moved.zone)slider.value=moved[slider.dataset.teamCoordinate];edits.apply(current=>{const layer=current.design.zones[moved.zone]?.layers.find(l=>l.templateLayerId===moved.layerId);if(!layer)throw new Error('Name layer unavailable.');layer.x=moved.x;layer.y=moved.y;}).catch(error=>document.getElementById('shopStatus').textContent=error.message);}catch(error){document.getElementById('shopStatus').textContent=error.message;}};
 window.addEventListener('mqd:team-text-moved',window.MQDTeamTextMoved);
 const mobileEdit=document.getElementById('mobileEditLayer');if(mobileEdit)mobileEdit.textContent='Personalize';
 const mobileOrder=document.querySelector('[data-mobile-pane="order"]');if(mobileOrder)mobileOrder.textContent='Personalize & Order';
 // Designated text inputs and move-only canvas gestures are the authoring controls for this mode. Server validation
 // independently enforces the same rule, including saved-file and direct API requests.
 for(const selector of ['#addImageBtn','#addTextBtn','#artUpload','#applyAll','#undo','#redo','#productSelect','#addText','#imageUpload','#zoneColor','#zoneHex','#copyGarment','#clearDesign','#addBusinessLogo'])document.querySelectorAll(selector).forEach(el=>el.disabled=true);
 const style=document.createElement('style');style.id='teamMasterControls';style.textContent='body[data-team-master="true"] #controlPane > :not(.shop-request),body[data-team-master="true"] .editor-toolbar,body[data-team-master="true"] [data-mobile-pane="control"]{display:none!important} body[data-team-master="true"] #teamMemberFields label{display:block;margin:12px 0} body[data-team-master="true"] #teamMemberFields input,body[data-team-master="true"] #teamMemberFields select{width:100%;box-sizing:border-box;padding:10px}';if(!document.getElementById(style.id))document.head.append(style);document.body.dataset.teamMaster='true';
 return copy;
}
