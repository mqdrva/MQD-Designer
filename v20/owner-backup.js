import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
import {requireAdminMfa} from './admin-security.js?v=1';
const supabase=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co','sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4');
const status=document.getElementById('backupStatus');
const buckets=['garments','customer-artwork','mqd-library-assets','mqd-production'];
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function fileHandle(root,parts,create=false){
  if(parts.some(p=>!p||p==='.'||p==='..'||/[\\/]/.test(p)))throw new Error('Invalid file path in backup.');
  let dir=root;for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create});return dir.getFileHandle(parts.at(-1),{create});
}
async function write(handle,bytes){const stream=await handle.createWritable();try{await stream.write(bytes);await stream.close();}catch(error){await stream.abort().catch(()=>{});throw error;}}
async function list(bucket,prefix,offset){
  const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('Sign in through Owner Orders first.');
  const response=await fetch('https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-owner-orders',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'backup-list',bucket,prefix,offset}),signal:AbortSignal.timeout(30000)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not list files.');return result;
}
async function saveManifest(root,manifest){await write(await root.getFileHandle('manifest.json',{create:true}),JSON.stringify(manifest,null,2));}
async function backup(parent){
  await requireAdminMfa(supabase);
  const startedAt=new Date().toISOString(),root=await parent.getDirectoryHandle('MQD-backup-'+startedAt.replace(/[:.]/g,'-'),{create:true});
  const manifest={version:1,startedAt,completedAt:null,complete:false,files:[]};await saveManifest(root,manifest);
  try{
    for(const bucket of buckets){
      const folders=[''];
      while(folders.length){
        const prefix=folders.shift();let offset=0;
        do{
          const page=await list(bucket,prefix,offset);folders.push(...page.folders);
          for(const file of page.files){
            status.textContent=`Backing up ${bucket}: ${manifest.files.length} files verified…`;
            const response=await fetch(file.url,{signal:AbortSignal.timeout(120000)});if(!response.ok)throw new Error('A file download failed. Start a new backup.');
            const bytes=await response.arrayBuffer();if(file.size&&bytes.byteLength!==file.size)throw new Error('A source file changed during backup. Start a new backup.');
            // Encode every source segment; the manifest retains exact storage paths.
            const localParts=[bucket,...file.path.split('/').map(p=>'f-'+encodeURIComponent(p))],handle=await fileHandle(root,localParts,true),hash=await digest(bytes);
            await write(handle,bytes);const saved=await handle.getFile();if(await digest(await saved.arrayBuffer())!==hash)throw new Error('Saved file verification failed.');
            manifest.files.push({bucket,path:file.path,localParts,size:bytes.byteLength,sha256:hash,updatedAt:file.updatedAt});
          }
          await saveManifest(root,manifest);offset=page.nextOffset;
        }while(offset!==null);
      }
    }
    manifest.complete=true;manifest.completedAt=new Date().toISOString();await saveManifest(root,manifest);
    status.textContent=`Backup complete: ${manifest.files.length} files saved and verified. Keep this folder private. Run another backup after new orders or uploads.`;
  }catch(error){await saveManifest(root,manifest).catch(()=>{});throw error;}
}
async function verify(root){
  const handle=await root.getFileHandle('manifest.json'),manifest=JSON.parse(await (await handle.getFile()).text());
  if(manifest.version!==1||!Array.isArray(manifest.files)||!manifest.complete)throw new Error('This backup is incomplete. Make a fresh backup.');
  for(const [index,file] of manifest.files.entries()){
    status.textContent=`Verifying file ${index+1} of ${manifest.files.length}…`;
    const saved=await (await fileHandle(root,file.localParts)).getFile();
    if(saved.size!==file.size||await digest(await saved.arrayBuffer())!==file.sha256)throw new Error('A backup file is missing or changed. Make a fresh backup.');
  }
  status.textContent=`Verified all ${manifest.files.length} files. This checks the saved files; a full database restore must be tested separately.`;
}
for(const [id,action,mode] of [['startBackup',backup,'readwrite'],['verifyBackup',verify,'read']]){
  document.getElementById(id).onclick=async()=>{
    if(!window.showDirectoryPicker){status.textContent='Please open this page in desktop Chrome or Edge to choose a private backup folder.';return;}
    const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    try{const folder=await window.showDirectoryPicker({mode});await action(folder);}
    catch(error){status.textContent=error.name==='AbortError'?'Cancelled. No completed backup was created.':error.message;}
    finally{buttons.forEach(b=>b.disabled=false);}
  };
}
