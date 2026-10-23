export const TEAM_LOGO_BYTES=15*1024*1024;
export async function readSetupLogo(file,{team=false}={}){
 const max=team?TEAM_LOGO_BYTES:500*1024;
 if(!file||file.size>max||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPEG or WebP logo up to '+(team?'15 MB.':'500 KB.'));
 const bitmap=await createImageBitmap(file);
 try{
  const original=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read the logo.'));reader.readAsDataURL(new Blob([file],{type:file.type}));});
  if(!team)return {original,preview:original};
  // Only the page branding is reduced. The original data remains byte-for-byte intact.
  let edge=Math.min(1024,Math.max(bitmap.width,bitmap.height)),preview;
  do{const ratio=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);preview=canvas.toDataURL('image/png');edge=Math.floor(edge/2);}while(preview.length>650000&&edge>=32);
  if(preview.length>650000)throw new Error('A page preview could not be prepared. Your original was not changed.');
  return {original,preview};
 }finally{bitmap.close();}
}
