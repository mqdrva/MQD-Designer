// Keep large original artwork below the REST gateway's per-request capacity.
// Only the authenticated owner handler calls this after full master validation.
// Staging is private; finalization uses the existing atomic revision procedures.
export async function saveTeamMasterRequest(db,params,productId=null){
 const rpc=productId?'mqd_save_owner_garment_master':'mqd_save_team_master',args=productId?{...params,p_product:productId}:params;
 const chars=Object.values(params.p_draft.payload.design.zones).reduce((n,z)=>n+z.layers.reduce((m,l)=>m+(typeof l.src==='string'?l.src.length:0),0),0);
 if(chars<8*1024*1024)return db.rpc(rpc,args);
 const body=JSON.stringify({...params,p_product:productId}).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 if(body.length>49*1024*1024)return {error:{code:'master_size_limit',message:'Request is too large.'}};
 const size=2*1024*1024,id=crypto.randomUUID(),parts=Math.ceil(body.length/size);
 const begin=await db.rpc('mqd_begin_master_upload',{p_upload:id,p_team:params.p_team,p_parts:parts,p_bytes:body.length});if(begin.error)return begin;
 try{
  for(let part=0;part<parts;part++){
   const saved=await db.rpc('mqd_put_master_upload_part',{p_upload:id,p_part:part,p_text:body.slice(part*size,(part+1)*size)});if(saved.error)return saved;
  }
  return await db.rpc('mqd_finish_master_upload',{p_upload:id});
 }finally{
  // Scoped cleanup also handles an interrupted final response; a committed
  // master is never removed. Expired unfinished uploads are pruned on begin.
  try{await db.rpc('mqd_abort_master_upload',{p_upload:id});}catch{}
 }
}

// Read bounded pieces from one revision; never return a mixed revision.
export async function readTeamMasterRequest(db,team,product){
 const args={p_team:team,p_product:product||null,p_revision:null,p_part:0};
 const first=await db.rpc('mqd_read_team_master_part',args);if(first.error||!first.data)return first;
 const {revision,parts,text,versionId}=first.data;
 if(!Number.isInteger(parts)||parts<1||parts>26)throw Error('Saved master size is unavailable.');
 const chunks=[text];for(let part=1;part<parts;part++){const next=await db.rpc('mqd_read_team_master_part',{...args,p_revision:revision,p_part:part});if(next.error)return next;if(next.data?.revision!==revision)throw Error('Master changed. Reopen the saved draft.');chunks.push(next.data.text);}
 return {data:{revision,draft:JSON.parse(chunks.join('')),version_id:versionId}};
}
