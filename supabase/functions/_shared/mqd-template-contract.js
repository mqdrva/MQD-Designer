// Shared browser/server contract. No credentials, network access, or mutable catalog state.
export const TEMPLATE_CATEGORIES=['Pressure Washing','Lawn Care','HVAC','Pool Care','General Business'];
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const normalize=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function templateLayers(payload){return Object.entries(payload?.design?.zones||{}).flatMap(([zone,state])=>(state.layers||[]).map(layer=>({zone,layer})));}
export function assertTemplateDraft(draft){
  if(!draft||typeof draft.name!=='string'||!draft.name.trim()||draft.name.length>100)throw new Error('Enter a design name (up to 100 characters).');
  if(!Array.isArray(draft.categories)||!draft.categories.length||draft.categories.some(c=>!TEMPLATE_CATEGORIES.includes(c)))throw new Error('Choose at least one supported category.');
  const p=draft.payload;
  if(p?.schema!=='mqd-design-v1'||!p.product?.id||!p.design?.zones?.Front||!p.design?.zones?.Back)throw new Error('Use an editable 3D shirt design with Front and Back zones.');
  if(JSON.stringify(draft).length>3_000_000)throw new Error('Template settings are too large. Save artwork first.');
  if(Object.values(p.design.zones).some(z=>!Array.isArray(z.layers)||z.layers.length>6))throw new Error('Each zone supports up to six layers.');
  const rows=templateLayers(p),ids=new Set();
  if(!rows.length||rows.length>100||Object.keys(p.design.zones).length>12)throw new Error('Use 1–100 layers in supported garment zones.');
  for(const {zone,layer} of rows){
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,100}$/.test(layer.id||'')||ids.has(layer.id)||!['image','text'].includes(layer.type))throw new Error('Each template layer needs a unique identifier and supported type.');
    ids.add(layer.id);
    const rule=draft.rules?.find(r=>r.zone===zone&&r.layerId===layer.id);
    if(!rule||!['locked','logo','text'].includes(rule.role))throw new Error('Designate every layer as locked artwork, replaceable logo, or editable text.');
    if(rule.role==='text'&&layer.type!=='text'||rule.role==='logo'&&layer.type!=='image')throw new Error('Logo slots require images; editable details require text layers.');
    if(!rule.label?.trim()||rule.label.length>100)throw new Error('Give each field a clear label.');
    if(rule.role==='text'&&!normalize(layer.text))throw new Error('Editable details need sample text.');
    for(const key of ['x','y','scale','rotation'])if(!Number.isFinite(Number(layer[key]??(key==='scale'?1:0))))throw new Error('Layer placement must contain finite numbers.');
    if(layer.visible===false)throw new Error('Remove hidden layers before preparing a template.');
  }
  if(draft.rules.length!==rows.length||!draft.rules.some(r=>r.role==='logo'))throw new Error('Include at least one replaceable logo and exactly one rule per layer.');
  return draft;
}
export function cloneTemplate(version,uuid=()=>crypto.randomUUID()){
  const payload=structuredClone(version.payload),copyId=uuid();
  delete payload.designId;delete payload.orderOptions;delete payload.totalQuantity;
  for(const {zone,layer} of templateLayers(payload)){
    const rule=version.rules.find(r=>r.zone===zone&&r.layerId===layer.id);
    layer.templateLayerId=layer.id;layer.id='template-'+uuid();layer.templateRole=rule.role;layer.templateLocked=rule.role==='locked';
    delete layer.storagePath;delete layer.originalStoragePath;
  }
  payload.design.template={id:version.template_id,versionId:version.id,copyId,name:version.name,
    fields:version.rules.filter(r=>r.role!=='locked').map(r=>({...r,sampleText:r.role==='text'?templateLayers(version.payload).find(x=>x.zone===r.zone&&x.layer.id===r.layerId).layer.text:null}))};
  payload.designId=uuid();payload.savedAt=new Date().toISOString();return payload;
}
export function remainingTemplateFields(payload){
  const ref=payload?.design?.template;if(!ref)return[];
  return(ref.fields||[]).filter(field=>{
    const row=templateLayers(payload).find(x=>x.zone===field.zone&&x.layer.templateLayerId===field.layerId);
    return !row||row.layer.visible===false||(field.role==='text'?!normalize(row.layer.text)||normalize(row.layer.text)===normalize(field.sampleText):!row.layer.templateReplaced);
  }).map(field=>field.label+' ('+field.zone+')');
}
export function assertCustomizedTemplate(payload,version){
  const ref=payload?.design?.template;
  if(!ref||ref.id!==version.template_id||ref.versionId!==version.id||!UUID.test(ref.copyId))throw new Error('The template reference is invalid. Choose this look again.');
  if(payload.product?.id!==version.payload.product.id||stable(payload.engine)!==stable(version.payload.engine)||stable(payload.templates)!==stable(version.payload.templates))throw new Error('Keep the approved garment and print-zone mapping for this look.');
  const rows=templateLayers(payload),seen=new Set();
  for(const row of rows){if(seen.has(row.layer.id))throw new Error('Duplicate layer identifiers.');seen.add(row.layer.id);}
  for(const [zone,state] of Object.entries(version.payload.design.zones)){const expected=(state.layers||[]).map(l=>l.id);const actual=(payload.design.zones[zone]?.layers||[]).filter(l=>l.templateLayerId).map(l=>l.templateLayerId);if(stable(actual)!==stable(expected))throw new Error('Keep the approved template layer order.');}
  const missing=[];
  for(const rule of version.rules){
    const source=templateLayers(version.payload).find(x=>x.zone===rule.zone&&x.layer.id===rule.layerId)?.layer;
    const matches=rows.filter(x=>x.layer.templateLayerId===rule.layerId);
    const target=matches[0]?.layer;
    if(matches.length!==1||matches[0].zone!==rule.zone||!target||target.visible===false)throw new Error('Keep all designated template layers in their approved zones.');
    if(target.templateRole!==rule.role||target.templateLocked!==(rule.role==='locked'))throw new Error('Template layer permissions cannot be changed.');
    if(rule.role==='locked'){
      const clean=layer=>Object.fromEntries(Object.entries(layer).filter(([k])=>!['id','src','image','storagePath','originalStoragePath','templateLayerId','templateRole','templateLocked','backgroundOriginalSrc'].includes(k)));
      if(stable(clean(source))!==stable(clean(target)))throw new Error('Locked template artwork cannot be changed.');
    }else if(rule.role==='text'){
      if(!normalize(target.text)||normalize(target.text)===normalize(source.text))missing.push(rule.label+' ('+rule.zone+')');
    }else{
      if(!/^[0-9a-f]{64}$/.test(target.templateReplacementHash||'')||target.templateReplacementHash===source.templateAssetHash||!target.templateReplaced||(source.templateAssetPath?target.templateAssetPath===source.templateAssetPath:target.src===source.src))missing.push(rule.label+' ('+rule.zone+')');
      if(['x','y','rotation','flipX','flipY'].some(k=>(target[k]??0)!==(source[k]??0)))throw new Error('Keep replacement logos in their designated slots.');
    }
  }
  for(const [zone,state] of Object.entries(version.payload.design.zones))if(payload.design.zones[zone]?.background!==state.background)throw new Error('Keep the approved template background colors.');
  if(missing.length)throw new Error('Replace the sample details before checkout: '+missing.join(', ')+'.');
  return true;
}
export function logoFitScale(oldSize,newSize,zoneSize,oldScale=1,crop={}){
  if([...oldSize,...newSize,...zoneSize].some(n=>!Number.isFinite(n)||n<=0))throw new Error('Logo dimensions are invalid.');
  const oldBase=Math.max(zoneSize[0]/oldSize[0],zoneSize[1]/oldSize[1])*oldScale;
  const nextBase=Math.max(zoneSize[0]/newSize[0],zoneSize[1]/newSize[1]);
  const visibleW=Math.max(.1,1-(Number(crop.left)||0)-(Number(crop.right)||0)),visibleH=Math.max(.1,1-(Number(crop.top)||0)-(Number(crop.bottom)||0));
  return Math.min(oldSize[0]*visibleW*oldBase/newSize[0]/nextBase,oldSize[1]*visibleH*oldBase/newSize[1]/nextBase);
}
