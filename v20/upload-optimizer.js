// MQD upload optimizer: keep full-resolution originals for production while using a lighter preview in the editor.
(() => {
  const nativeReadAsDataURL = FileReader.prototype.readAsDataURL;
  const MAX_PREVIEW_EDGE = 2048;
  const ORIGINAL_DB = 'mqd-upload-originals';
  const ORIGINAL_STORE = 'files';

  function openOriginalDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(ORIGINAL_DB,1);
      req.onupgradeneeded=()=>{
        if(!req.result.objectStoreNames.contains(ORIGINAL_STORE)) req.result.createObjectStore(ORIGINAL_STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }

  async function saveOriginal(file){
    const db=await openOriginalDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(ORIGINAL_STORE,'readwrite');
      tx.objectStore(ORIGINAL_STORE).put({file,name:file.name,type:file.type,size:file.size,lastModified:file.lastModified,savedAt:Date.now()},file.name);
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
  }

  async function makePreviewBlob(file){
    if(typeof createImageBitmap!=='function') return file;
    const bitmap=await createImageBitmap(file);
    try{
      const maxEdge=Math.max(bitmap.width,bitmap.height);
      const scale=Math.min(1,MAX_PREVIEW_EDGE/Math.max(1,maxEdge));
      if(scale===1 && file.size<=6*1024*1024) return file;
      const width=Math.max(1,Math.round(bitmap.width*scale));
      const height=Math.max(1,Math.round(bitmap.height*scale));
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{alpha:true});
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality='high';
      ctx.drawImage(bitmap,0,0,width,height);
      const outputType=file.type==='image/png'?'image/png':(file.type==='image/webp'?'image/webp':'image/jpeg');
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,outputType,0.92));
      return blob||file;
    } finally {
      bitmap.close?.();
    }
  }

  FileReader.prototype.readAsDataURL=function(blob){
    if(!(blob instanceof File)||!/^image\//i.test(blob.type||'')) return nativeReadAsDataURL.call(this,blob);
    const reader=this;
    const addButton=document.getElementById('addImageBtn');
    const oldLabel=addButton?.querySelector('span:last-child')?.textContent||'';
    if(addButton){addButton.disabled=true;const label=addButton.querySelector('span:last-child');if(label)label.textContent='Preparing…';}
    const restoreButton=()=>{if(addButton){addButton.disabled=false;const label=addButton.querySelector('span:last-child');if(label)label.textContent=oldLabel||'Add Image';}};
    (async()=>{
      try{await saveOriginal(blob);}catch(err){console.warn('Could not cache full-resolution original',err);}
      let preview=blob;
      try{preview=await makePreviewBlob(blob);}catch(err){console.warn('Preview optimization skipped',err);}
      reader.addEventListener('loadend',restoreButton,{once:true});
      nativeReadAsDataURL.call(reader,preview);
    })().catch(err=>{
      console.warn('Image preparation fallback',err);
      reader.addEventListener('loadend',restoreButton,{once:true});
      nativeReadAsDataURL.call(reader,blob);
    });
  };
})();
