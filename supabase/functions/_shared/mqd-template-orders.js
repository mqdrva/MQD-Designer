import {UUID,assertCustomizedTemplate,templateLayers} from './mqd-template-contract.js';
export async function verifyTemplateOrder(supabase,payload){
  const ref=payload?.design?.template;if(!ref){if(templateLayers(payload).some(x=>x.layer.templateLayerId||x.layer.templateRole||x.layer.templateAssetPath))throw new Error('Template reference is missing.');return null;}
  if(ref.demo)throw new Error('Unpublished demo designs cannot be ordered.');
  if(!UUID.test(ref.id)||!UUID.test(ref.versionId))throw new Error('Invalid template identifier.');
  // Historical versions intentionally remain valid for existing copies and orders.
  const {data,error}=await supabase.from('mqd_shirt_template_versions').select('snapshot').eq('id',ref.versionId).eq('template_id',ref.id).maybeSingle();
  if(error||!data)throw new Error('The approved template version could not be verified.');
  assertCustomizedTemplate(payload,data.snapshot);return data.snapshot;
}
export async function prepareTemplateOrder(supabase,payload,form,customerPrefix=null){
  const version=await verifyTemplateOrder(supabase,payload);if(!version)return;
  const submittedFiles=form.getAll('asset'),submittedMeta=form.getAll('assetMeta').map(v=>JSON.parse(String(v||'{}')));
  for(const {layer} of templateLayers(payload).filter(x=>x.layer.templateRole==='logo')){
    const index=submittedMeta.findIndex(m=>m.layerId===layer.id&&m.kind!=='original-source');let file=index<0?null:submittedFiles[index];
    if(!file&&customerPrefix&&layer.storagePath?.startsWith(customerPrefix)&&!layer.storagePath.includes('..')){const result=await supabase.storage.from('customer-artwork').download(layer.storagePath);if(result.error)throw new Error('Could not read replacement logo.');file=result.data;}
    if(!file||typeof file==='string')throw new Error('Upload a replacement logo for every designated slot.');
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hash!==layer.templateReplacementHash)throw new Error('The replacement logo does not match the submitted artwork.');
  }
  const locked=templateLayers(payload).filter(x=>x.layer.templateRole==='locked'&&x.layer.type==='image');
  // Ignore client files for locked artwork. Fetch the immutable approved master server-side.
  const ids=new Set(locked.map(x=>x.layer.id)),files=form.getAll('asset'),metadata=form.getAll('assetMeta');
  form.delete('asset');form.delete('assetMeta');
  for(let i=0;i<files.length;i++)if(!ids.has(JSON.parse(String(metadata[i]||'{}')).layerId)){form.append('asset',files[i]);form.append('assetMeta',String(metadata[i]||'{}'));}
  let totalBytes=form.getAll('asset').reduce((n,file)=>n+(typeof file==='string'?0:file.size),0);
  for(const {zone,layer} of locked){
    const path=layer.templateAssetPath;
    if(typeof path!=='string'||!path.startsWith(version.id+'/')||path.includes('..'))throw new Error('Invalid approved template artwork.');
    const {data,error}=await supabase.storage.from('mqd-template-published').download(path);
    if(error||!data)throw new Error('The approved template artwork could not be loaded.');
    totalBytes+=data.size;if(totalBytes>64*1024*1024)throw new Error('Template artwork exceeds the 64 MB order limit.');
    form.append('asset',data,layer.filename||'template-artwork.png');form.append('assetMeta',JSON.stringify({zone,layerId:layer.id,source:'approved-template',templateVersionId:version.id}));
  }
}
