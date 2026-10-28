// Models only the private transport. Handler tests still exercise their normal
// database fixture for the final atomic revision save.
export function masterUploadDb(db){
 const uploads=new Map();
 return {rpc:async(name,args)=>{
  if(name==='mqd_begin_master_upload'){uploads.set(args.p_upload,{...args,parts:new Map()});return{data:true};}
  if(name==='mqd_put_master_upload_part'){const u=uploads.get(args.p_upload);u.parts.set(args.p_part,args.p_text);return{data:true};}
  if(name==='mqd_abort_master_upload'){uploads.delete(args.p_upload);return{data:true};}
  if(name==='mqd_finish_master_upload'){const u=uploads.get(args.p_upload),p=JSON.parse([...u.parts].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join('')),secondary=!!p.p_product;if(!secondary)delete p.p_product;return db.rpc(secondary?'mqd_save_owner_garment_master':'mqd_save_team_master',p);}
  return db.rpc(name,args);
 }};
}
