const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export const AUTH_SAVE_MARKER='mqd-pending-design-save-v1';
export function authSaveResumeId(location,storage){
  const fromUrl=new URL(location.href).searchParams.get('resumeDesign');
  if(validId(fromUrl))return fromUrl;
  try{const id=storage.getItem(AUTH_SAVE_MARKER);return validId(id)?id:null;}catch{return null;}
}
export function authSaveRedirectUrl(location,id){
  const url=new URL(location.origin+location.pathname);
  if(validId(id))url.searchParams.set('resumeDesign',id);
  return url.href;
}
export function createAuthSaveRecovery({read,write,uuid=()=>crypto.randomUUID()}){
  const running=new Map();
  const key=id=>'auth-save:'+id;
  async function prepare(payload){
    if(payload?.schema!=='mqd-design-v1'||!payload.product?.id||!payload.design)throw new Error('The current design could not be backed up.');
    const record={schema:'mqd-auth-save-v1',id:uuid(),designId:uuid(),createdAt:Date.now(),status:'pending',userId:null,payload:structuredClone(payload)};
    await write(key(record.id),record);
    return record.id;
  }
  async function recover(id,{user=null,restore,save}){
    if(!validId(id))return {status:'none'};
    const record=await read(key(id));
    if(!record)return {status:'missing'};
    if(record.schema!=='mqd-auth-save-v1'||record.id!==id||!validId(record.designId))throw new Error('This design backup is invalid.');
    if(record.userId&&user&&!user.is_anonymous&&record.userId!==user.id)throw new Error('Sign in to the same account to finish saving this design. The local backup is retained.');
    if(record.status==='saved')return {status:'saved',designId:record.designId};
    if(record.status==='cancelled')return {status:'cancelled'};
    if(!record.payload?.product?.id||!record.payload.design)throw new Error('This design backup is incomplete.');
    const permanent=user&&!user.is_anonymous;
    if(record.userId&&permanent&&record.userId!==user.id)throw new Error('Sign in to the same account to finish saving this design. The local backup is retained.');
    if(permanent){record.userId=user.id;await write(key(id),record);}
    await restore(structuredClone(record.payload));
    if(!permanent)return {status:'restored'};
    const result=await save(structuredClone(record.payload),record.designId);
    // A durable receipt prevents repeated callbacks or old email links from
    // creating another design. Failed saves retain the complete local backup.
    await write(key(id),{...record,status:'saved',payload:null,savedAt:Date.now()});
    return {status:'saved',designId:record.designId,result};
  }
  function resume(id,options){
    if(running.has(id))return running.get(id);
    const job=recover(id,options).finally(()=>running.delete(id));running.set(id,job);return job;
  }
  async function cancel(id){
    if(!validId(id))return;
    const record=await read(key(id));
    if(record?.status==='pending')await write(key(id),{...record,status:'cancelled'});
  }
  async function update(id,payload,user){
    if(!validId(id))return false;const record=await read(key(id));
    if(record?.status!=='pending')return false;
    if(record.userId&&record.userId!==user?.id)throw new Error('Sign in to the same account to finish saving this design.');
    if(payload?.schema!=='mqd-design-v1'||!payload.product?.id||!payload.design)throw new Error('The current design could not be backed up.');
    await write(key(id),{...record,payload:structuredClone(payload)});return true;
  }
  return {prepare,resume,cancel,update};
}
