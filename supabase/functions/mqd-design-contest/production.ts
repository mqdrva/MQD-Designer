// Only called after verified admin + authenticator checks in monthly.ts.
export async function productionFiles(db:any,entry:any){
 const snapshot=entry.design_snapshot,files:any[]=[],missing:string[]=[];
 if(!snapshot)return {entry,files,missing:['Saved design / original artwork is required. Contact the entrant before production.'],available:false};
 const seen=new Set<string>();
 async function add(bucket:string,path:string,name:string){
  if(seen.has(bucket+'/'+path))return;seen.add(bucket+'/'+path);
  if(files.length>=100)throw new Error('This entry has too many artwork files.');
  // Signing also checks object existence. Never accept a client-supplied URL or bucket.
  const {data,error}=await db.storage.from(bucket).createSignedUrl(path,600);
  if(error||!data?.signedUrl){missing.push(name);return;}
  files.push({name,url:data.signedUrl});
 }
 let n=0;
 for(const [zone,state] of Object.entries<any>(snapshot.design?.zones||{})){
  for(const layer of state.layers||[]){
   if(layer.type!=='image')continue;
   const name=String(zone).replace(/[^a-zA-Z0-9_-]/g,'_')+'/'+(++n)+'-';
   if(layer.libraryAssetId){
    const {data:asset,error}=await db.from('mqd_library_assets').select('render_path').eq('id',layer.libraryAssetId).maybeSingle();
    if(error||!asset?.render_path){missing.push(name+'library-artwork');continue;}
    await add('mqd-library-assets',asset.render_path,name+asset.render_path.split('/').pop());continue;
   }
   if(!layer.storagePath){missing.push(name+'artwork');continue;}
   for(const field of ['storagePath','originalStoragePath']){
    const path=layer[field];if(!path)continue;
    if(typeof path!=='string'||!entry.user_id||!path.startsWith(entry.user_id+'/designs/')||path.split('/').some((s:string)=>s==='..'||s==='.')||path.includes('\\')){missing.push(name+field+' (invalid reference)');continue;}
    await add('customer-artwork',path,name+path.split('/').pop());
   }
  }
 }
 if(!snapshot.design?.zones||!Object.keys(snapshot.design.zones).length)missing.push('Garment layout is missing.');
 return {entry,files,missing,available:missing.length===0};
}
