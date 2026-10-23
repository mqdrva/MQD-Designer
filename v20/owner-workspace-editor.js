import {ownerCall} from './owner-team-workspace.js';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
import {templateLayers} from './template-contract.js';
import {validateTeamMaster} from '../supabase/functions/_shared/mqd-team-masters.js';
export async function mountOwnerWorkspaceEditor(id){
 const workspace=await ownerCall('workspace-load',{id});
 if(workspace.editingMode!=='strict')return;
 const result=await ownerCall('master-load',{id});let revision=result.revision,draft=result.draft;
 if(draft)await window.MQDDesigner.loadDesign(draft.payload,{notify:false});
 const box=document.createElement('section');box.className='card';const heading=document.createElement('h2');heading.textContent='Owner master studio';const note=document.createElement('p');note.textContent='Add the original artwork, backgrounds, and name / number text. Save here, then return to choose the editable text fields and publish a master version. Saving does not publish or contact anyone.';
 const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Save owner master draft';const status=document.createElement('p');status.setAttribute('role','status');
 const back=document.createElement('a');back.href='/team-setup.html?ownerWorkspace=1&workspaceId='+encodeURIComponent(id);back.textContent='Return to owner setup and member permissions';
 button.onclick=async()=>{button.disabled=true;try{const payload=window.MQDDesigner.exportDesign();for(const zone of GARMENT_MAPPING[payload.product.id]?.zones||[])payload.design.zones[zone]||={background:'#FFFFFF',layers:[]};const rules=templateLayers(payload).map(({zone,layer})=>draft?.rules.find(r=>r.zone===zone&&r.layerId===layer.id)||{zone,layerId:layer.id,role:'locked',label:(layer.text||layer.filename||layer.label||layer.id).slice(0,100)});const next={name:draft?.name||workspace.packet.shop.name+' master',payload,rules};validateTeamMaster(next);const saved=await ownerCall('master-save',{id,revision,publish:false,draft:next});revision=saved.revision;draft=next;status.textContent='Master draft saved. Return to owner setup to choose member fields and publish.';}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
 box.append(heading,note,button,back,status);document.querySelector('.shop-intro').after(box);
}
