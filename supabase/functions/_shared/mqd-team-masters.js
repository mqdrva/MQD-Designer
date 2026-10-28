import {GARMENT_MAPPING} from './shirt-games/mapping.js';
import {cloneTemplate,templateLayers,UUID} from './mqd-template-contract.js';
import {maxZoneLayers} from './mqd-layer-capacity.js';
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
// Compare large inline originals directly. Serializing two complete designs just
// to compare them duplicates tens of megabytes and can exhaust the Edge runtime.
function sameJson(a,b){
 if(a===b)return true;
 if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((value,i)=>sameJson(value,b[i]));
 const ak=Object.keys(a).filter(k=>a[k]!==undefined).sort(),bk=Object.keys(b).filter(k=>b[k]!==undefined).sort();
 return ak.length===bk.length&&ak.every((key,i)=>key===bk[i]&&sameJson(a[key],b[key]));
}
// Object containers must be independent; primitive source strings are immutable
// and can safely be shared while validating. structuredClone copies their bytes.
const comparisonCopy=value=>Array.isArray(value)?value.map(comparisonCopy):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,comparisonCopy(v)])):value;
const fail=message=>{throw new Error(message);};
export function validateTeamMaster(master){
 const p=master?.payload;
 if(typeof master?.name!=='string'||!master.name.trim()||master.name.length>100)fail('Enter a master design name.');
 if(p?.schema!=='mqd-design-v1'||!p.product?.id||!p.design?.zones?.Front||!p.design.zones.Back)fail('Choose a saved editable 3D garment design.');
 const mapping=GARMENT_MAPPING[p.product.id];
 if(!mapping||stable(p.templates)!==stable(mapping.templates)||p.product.model!==mapping.model||stable(Object.keys(p.design.zones).sort())!==stable([...mapping.zones].sort()))fail('Keep the approved garment model and production mapping.');
 if(p.design.template||p.design.teamMaster)fail('Use an original master, not a member or gallery copy.');
 const permissions=p.design.teamPermissions;if(permissions!==undefined&&(!permissions||typeof permissions!=='object'||Array.isArray(permissions)||Object.keys(permissions).some(k=>!['wholeGarmentColor','backgroundImage'].includes(k))||Object.values(permissions).some(v=>typeof v!=='boolean')))fail('Choose a supported whole-garment color permission.');
 if(permissions?.wholeGarmentColor){const colors=Object.values(p.design.zones).map(z=>z.background);if(colors.some(c=>typeof c!=='string'||!/^#[a-f0-9]{6}$/i.test(c))||new Set(colors.map(c=>c.toUpperCase())).size!==1)fail('Apply one solid base color to every zone before allowing whole-shirt colors.');}
 if(p.design.teamBackground!==undefined)fail('Keep optional member backgrounds out of the master; members add their own independent image.');
 const rows=templateLayers(p),ids=new Set();
 if(!rows.length||rows.length>100||!Array.isArray(master.rules)||master.rules.length!==rows.length)fail('Designate every master layer.');
 for(const [zone,state] of Object.entries(p.design.zones))if(!Array.isArray(state.layers)||state.layers.length+(permissions?.backgroundImage?1:0)>maxZoneLayers(p.product,zone))fail('The master exceeds the garment layer limit.');
 for(const {zone,layer} of rows){
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(layer.id||'')||ids.has(layer.id))fail('Master layers need unique identifiers.');ids.add(layer.id);
  if(!['text','image'].includes(layer.type)||layer.visible===false||layer.libraryAssetId)fail('Include visible original artwork and text only.');
  if(layer.type==='image'&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(layer.src||''))fail('Include the original uploaded artwork.');
  for(const k of ['x','y','scale','rotation'])if(!Number.isFinite(layer[k]))fail('Invalid master placement.');
  const rules=master.rules.filter(r=>r.zone===zone&&r.layerId===layer.id),r=rules[0];
  if(rules.length!==1||!['locked','text','logoColor'].includes(r.role)||r.role==='text'&&layer.type!=='text')fail('Only explicitly designated text fields may change.');
  if(r.role==='logoColor'&&(layer.type!=='image'||!layer.teamLogo))fail('Choose a single-color logo treatment before allowing logo color.');
  if(layer.teamLogo!==undefined&&(layer.type!=='image'||!layer.teamLogo||Object.keys(layer.teamLogo).sort().join(',')!=='color,mode'||!['alpha-v1','dark-on-white-v1'].includes(layer.teamLogo.mode)||!/^#[a-f0-9]{6}$/i.test(layer.teamLogo.color||'')))fail('Choose a supported logo treatment and solid color.');
  if(r.allowMove!==undefined&&(typeof r.allowMove!=='boolean'||r.role!=='text'))fail('Only designated text may be movable.');
  if(r.allowMove&&['x','y'].some(k=>layer[k]< -100||layer[k]>100))fail('Keep movable text within the positioning limits.');
  if(typeof r.label!=='string'||!r.label.trim()||r.label.length>100)fail('Name every member field.');
  if(r.role==='text'){
   if(!Number.isInteger(r.maxLength)||r.maxLength<1||r.maxLength>100)fail('Set a field limit from 1 to 100 characters.');
   if(r.choices!==undefined&&(!Array.isArray(r.choices)||!r.choices.length||r.choices.length>50||r.choices.some(c=>typeof c!=='string'||!c.trim()||c.length>r.maxLength)))fail('Enter valid allowed choices.');
   if(r.choices&&!r.choices.includes(layer.text))fail('The sample text must match an allowed choice for '+r.label+'.');
  }
 }
 return master;
}
export function cloneTeamMaster(version,uuid=()=>crypto.randomUUID(),clone=structuredClone){
 validateTeamMaster(version);
 const copy=cloneTemplate({...version,template_id:version.team_id},uuid,clone);
 copy.design.teamMaster={teamId:version.team_id,versionId:version.id,copyId:copy.design.template.copyId,name:version.name};
 delete copy.design.template;
 return copy;
}
export function assertTeamMemberCopy(payload,version,{complete=true}={}){
 const ref=payload?.design?.teamMaster;
 if(!ref||ref.teamId!==version.team_id||ref.versionId!==version.id||!UUID.test(ref.copyId))fail('This copy does not belong to the selected team master.');
 const expected=cloneTeamMaster(version,()=>ref.copyId,comparisonCopy),actual=comparisonCopy(payload);
 // Copy identifiers and save/view state are local; every production property is protected.
 for(const p of [expected,actual]){delete p.designId;delete p.savedAt;delete p.activeZone;delete p.orderOptions;delete p.totalQuantity;delete p.design.teamMaster;p.product={id:p.product.id,model:p.product.model};}
 // PostgreSQL jsonb reorders zone keys; only layer order within a zone is meaningful.
 const byZone=(left,right)=>left.zone.localeCompare(right.zone);
 if(version.payload.design.teamPermissions?.wholeGarmentColor){let selected=null;for(const zone of Object.keys(expected.design.zones)){const color=actual.design?.zones?.[zone]?.background;if(typeof color!=='string'||!/^#[a-f0-9]{6}$/i.test(color)||selected&&color.toUpperCase()!==selected)fail('Choose one solid color for the whole garment.');selected=color.toUpperCase();expected.design.zones[zone].background=color;}}
 if(version.payload.design.teamPermissions?.backgroundImage&&actual.design.teamBackground!==undefined){
  const bg=actual.design.teamBackground;
  if(!bg||Object.keys(bg).sort().join(',')!=='filename,src'||typeof bg.filename!=='string'||bg.filename.length>120||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(bg.src||'')||bg.src.length>20*1024*1024+64)fail('Choose an original PNG, JPEG or WebP background up to 15 MB.');
  expected.design.teamBackground=bg;
 }
 const a=templateLayers(actual).sort(byZone),e=templateLayers(expected).sort(byZone);
 for(let i=0;i<e.length;i++){
  if(!a[i]||a[i].zone!==e[i].zone||a[i].layer.templateLayerId!==e[i].layer.templateLayerId)fail('Master layers and order cannot change.');
  const rule=version.rules.find(r=>r.layerId===e[i].layer.templateLayerId&&r.zone===e[i].zone);
  delete a[i].layer.id;delete e[i].layer.id;
  if(rule.role==='logoColor'){const color=a[i].layer.teamLogo?.color;if(!/^#[a-f0-9]{6}$/i.test(color||''))fail('Choose a solid logo color.');e[i].layer.teamLogo.color=color;}
  if(rule.role==='text'){
   const value=a[i].layer.text;
   if(typeof value!=='string'||value.length>rule.maxLength||/[\u0000-\u001f\u007f]/.test(value)||complete&&!value.trim()||rule.choices&&!rule.choices.includes(value))fail('Enter an allowed value for '+rule.label+'.');
   e[i].layer.text=value;
   if(rule.allowMove)for(const coordinate of ['x','y']){const position=a[i].layer[coordinate];if(!Number.isFinite(position)||position< -100||position>100)fail('Keep member text within the positioning limits.');e[i].layer[coordinate]=position;}
  }
 }
 if(!sameJson(actual,expected))fail('Protected artwork, styling, garment and placement cannot change.');
 return true;
}
