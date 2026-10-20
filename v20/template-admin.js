import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
import {requireAdminMfa} from './admin-security.js?v=1';
import {TEMPLATE_CATEGORIES,templateLayers} from './template-contract.js';
import {templateRequest} from './template-api.js';
const db=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co','sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4');
const $=id=>document.getElementById(id);let rows=[],current=null;
async function request(body){await requireAdminMfa(db);const {data,error}=await db.auth.getSession();if(error)throw error;return templateRequest(body,data.session?.access_token);}
async function action(job){try{$('ownerStatus').textContent='Working…';await job();$('ownerStatus').textContent='Ready.';}catch(error){$('ownerStatus').textContent=error.message;}}
async function refresh(){
 const result=await request({action:'owner-list'});rows=result.templates||[];$('ownerApp').hidden=false;$('sourceDesign').replaceChildren();
 for(const d of result.designs||[]){const o=document.createElement('option');o.value=d.id;o.textContent=d.name+' · '+d.product_name;$('sourceDesign').append(o);}
 $('templateList').replaceChildren();for(const row of rows){const b=document.createElement('button');b.textContent=row.draft.name+(row.published_version_id?' · Published':' · Draft');b.onclick=()=>open(row);$('templateList').append(b);}
 if(current){const row=rows.find(r=>r.id===current.id);if(row)open(row);}
}
function open(row){
 current=structuredClone(row);$('templateSettings').hidden=false;$('templateName').value=row.draft.name;$('templateRange').value=row.draft.range||'All-over print';$('templateTitle').textContent=row.draft.payload.product.name;
 $('versionStatus').textContent=row.published_version_id?'Published version: '+row.published_version_id+'. Draft changes do not affect it.':'Unpublished draft';$('templateCategories').replaceChildren();
 const legend=document.createElement('legend');legend.textContent='Categories';$('templateCategories').append(legend);
 for(const category of TEMPLATE_CATEGORIES){const label=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.value=category;c.checked=row.draft.categories.includes(category);label.append(c,document.createTextNode(' '+category));label.style.cssText='display:inline-block;margin:10px';$('templateCategories').append(label);}
 $('templateRules').replaceChildren();for(const {zone,layer} of templateLayers(row.draft.payload)){
  const rule=current.draft.rules.find(r=>r.zone===zone&&r.layerId===layer.id),wrap=document.createElement('div');wrap.className='rule';const label=document.createElement('label');label.textContent=zone+' · '+(layer.label||layer.id);const input=document.createElement('input');input.value=rule.label;input.maxLength=100;input.setAttribute('aria-label','Customer label for '+zone+' '+layer.id);input.onchange=()=>rule.label=input.value;label.append(input);const select=document.createElement('select');select.setAttribute('aria-label','Permission for '+zone+' '+layer.id);
  for(const [value,text] of [['locked','Locked artwork'],...(layer.type==='image'?[['logo','Replaceable logo']]:[['text','Editable text']])]){const o=document.createElement('option');o.value=value;o.textContent=text;select.append(o);}select.value=rule.role;select.onchange=()=>rule.role=select.value;wrap.append(label,select);$('templateRules').append(wrap);
 }
 $('previewStatus').textContent=['Front','Back'].map(side=>side+': '+(row.draft.previews?.[side]?'uploaded':'needed')).join(' · ');
}
async function save(){if(!current)throw new Error('Choose a template.');current.draft.name=$('templateName').value;current.draft.range=$('templateRange').value;current.draft.categories=[...$('templateCategories').querySelectorAll('input:checked')].map(c=>c.value);await request({action:'save',id:current.id,draft:current.draft});}
$('createTemplate').onclick=()=>action(async()=>{const result=await request({action:'create',designId:$('sourceDesign').value});current=result.template;await refresh();});
$('refreshTemplates').onclick=()=>action(refresh);
$('saveTemplate').onclick=()=>action(async()=>{await save();await refresh();});
$('publishTemplate').onclick=()=>action(async()=>{await save();await request({action:'publish',id:current.id});await refresh();});
$('unpublishTemplate').onclick=()=>action(async()=>{await request({action:'unpublish',id:current.id});await refresh();});
$('previewTemplate').onclick=()=>action(async()=>{await save();const result=await request({action:'preview',id:current.id});localStorage.setItem('mqd-owner-template-preview',JSON.stringify(result.payload));location.assign('/index.html?owner=1&templateOwnerPreview=1');});
for(const [id,side] of [['frontPreview','Front'],['backPreview','Back']])$(id).onchange=()=>action(async()=>{if(!current)throw new Error('Choose a template.');const file=$(id).files?.[0];if(!file||file.size>2*1024*1024)throw new Error('Choose a preview under 2 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});await request({action:'preview-upload',id:current.id,side,data});await refresh();});
void action(refresh);
