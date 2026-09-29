// Artwork stays on this origin and is matched to one draft, never "the last logo".
const DB_NAME='mqd-ai-draft-assets';
const STORE='drafts';
const MAX_AGE=24*60*60*1000;
export const validContextId=value=>typeof value==='string'&&/^[a-f0-9]{32}$/.test(value);
export const createContextId=()=>crypto.randomUUID().replaceAll('-','');

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('This browser could not save your artwork. Keep this tab open and enable site storage before continuing.'));
  });
}
async function transaction(mode,action){
  const db=await openDatabase();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,mode);
      let result;
      tx.oncomplete=()=>resolve(result);
      tx.onerror=tx.onabort=()=>reject(new Error('Your artwork could not be saved in this browser. Please free some site storage and try again.'));
      action(tx.objectStore(STORE),value=>{result=value;});
    });
  }finally{db.close();}
}
export async function saveDraftAssets(id,assets){
  if(!validContextId(id))throw new Error('Invalid draft reference.');
  await transaction('readwrite',store=>{
    store.put({id,updatedAt:Date.now(),...assets});
    const cursor=store.openCursor();
    cursor.onsuccess=()=>{
      const row=cursor.result;
      if(!row)return;
      if(row.value.updatedAt<Date.now()-MAX_AGE)row.delete();
      row.continue();
    };
  });
}
export async function loadDraftAssets(id){
  if(!validContextId(id))return null;
  return transaction('readwrite',(store,done)=>{
    const request=store.get(id);
    request.onsuccess=()=>{
      const record=request.result;
      if(!record)return done(null);
      if(record.updatedAt<Date.now()-MAX_AGE){store.delete(id);return done(null);}
      done(record);
    };
  });
}
export async function removeDraftAssets(id){
  if(validContextId(id))await transaction('readwrite',store=>store.delete(id));
}
