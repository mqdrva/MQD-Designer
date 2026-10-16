(()=>{
  const Zip=window.JSZip;
  if(!Zip?.prototype?.generateAsync)return;
  const originalGenerate=Zip.prototype.generateAsync;
  const nativeFetch=window.fetch.bind(window);
  const views=['front','left-side','back','right-side'];
  // The long-sleeve model's saved Left Sleeve is on +X. Name its proof
  // from the wearer's side, without changing any garment or artwork mapping.
  const cameraViewFor=(productId,view)=>productId==='long-sleeve-tshirt'?({'left-side':'right-side','right-side':'left-side'}[view]||view):view;
  const LIBRARY_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-artwork-library';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';


  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const safePart=value=>String(value||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100);
  async function withTimeout(work,ms,message){
    let timer;
    try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]);}
    finally{clearTimeout(timer);}
  }
  function dataUrl(blob){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
    });
  }
  function canvasHasGarment(canvas){
    try{
      const probe=document.createElement('canvas');probe.width=32;probe.height=32;
      const ctx=probe.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,32,32);ctx.drawImage(canvas,0,0,32,32);
      const pixels=ctx.getImageData(0,0,32,32).data;
      for(let i=3;i<pixels.length;i+=4)if(pixels[i]>18)return true;
    }catch{return true;}
    return false;
  }
  async function waitForGarment(canvas,timeout=12000){
    const started=Date.now();await sleep(250);
    while(Date.now()-started<timeout){if(canvas.width>10&&canvas.height>10&&canvasHasGarment(canvas))return;await sleep(150);}
    throw new Error('Timed out waiting for the 3D garment preview.');
  }
  function canvasPng(canvas){
    return new Promise((resolve,reject)=>{
      try{
        const out=document.createElement('canvas');out.width=1000;out.height=1000;
        const ctx=out.getContext('2d');ctx.fillStyle='#F7F7F7';ctx.fillRect(0,0,1000,1000);
        const max=900,scale=Math.min(max/Math.max(1,canvas.width),max/Math.max(1,canvas.height));
        const w=canvas.width*scale,h=canvas.height*scale;ctx.drawImage(canvas,(1000-w)/2,(1000-h)/2,w,h);
        out.toBlob(blob=>blob?resolve(blob):reject(new Error('Preview PNG could not be created.')),'image/png');
      }catch(error){reject(error);}
    });
  }
  async function libraryAsset(productId,zone,assetId,cache){
    const key=`${productId}::${zone}`;
    if(!cache.has(key))cache.set(key,(async()=>{
      const response=await nativeFetch(LIBRARY_URL,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'catalog',productId,zone}),signal:AbortSignal.timeout(10000)});
      if(!response.ok)return[];
      const result=await response.json().catch(()=>({}));return Array.isArray(result.assets)?result.assets:[];
    })());
    return (await cache.get(key)).find(asset=>String(asset.id)===String(assetId))||null;
  }
  async function hydrateFromZip(zip,root,payload){
    const copy=structuredClone(payload),names=Object.keys(zip.files||{}),cache=new Map();
    for(const [zone,state] of Object.entries(copy?.design?.zones||{})){
      const prefix=`${root}original-assets/${safePart(zone)}/`;
      const candidates=names.filter(name=>name.startsWith(prefix)&&!zip.files[name]?.dir);
      for(const layer of state?.layers||[]){
        if(layer?.type!=='image')continue;
        const basenames=[
          String(layer.storagePath||'').split('/').pop(),
          layer.libraryAssetId?`${safePart(layer.libraryAssetId)}.png`:null,
          layer.backgroundRemovedFilename?`${safePart(layer.id)}-${safePart(layer.backgroundRemovedFilename)}`:null,
          layer.filename?`${safePart(layer.id)}-${safePart(layer.filename)}`:null,
          layer.filename?safePart(layer.filename):null
        ].filter(Boolean);
        let match;
        for(const wanted of basenames){
          match=candidates.find(name=>name.slice(prefix.length)===wanted);
          if(match)break;
        }
        const file=match&&zip.file(match);
        if(file){layer.src=await dataUrl(await file.async('blob'));continue;}
        if(layer.libraryAssetId){
          const asset=await libraryAsset(copy.product?.id,zone,layer.libraryAssetId,cache);
          if(asset?.renderUrl){layer.src=asset.renderUrl;continue;}
        }
        throw new Error(`Saved artwork is missing for ${zone}, ${layer.id||layer.filename||'image'}.`);
      }
    }
    return copy;
  }
  async function captureViews(payload){
    const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    Object.assign(frame.style,{position:'fixed',left:'0',top:'0',width:'1200px',height:'900px',border:'0',opacity:'0',pointerEvents:'none',zIndex:'-1'});
    frame.src=`/index.html?mqdCapture=1&ownerProof=${Date.now()}`;document.body.appendChild(frame);
    try{
      await Promise.race([new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(new Error('Preview renderer could not load.'));}),sleep(15000).then(()=>{throw new Error('Preview renderer load timed out.');})]);
      const win=frame.contentWindow,doc=frame.contentDocument,started=Date.now();
      while(!win?.MQDDesigner?.loadDesign&&Date.now()-started<12000)await sleep(80);
      if(!win?.MQDDesigner?.loadDesign)throw new Error('Preview renderer is not ready.');
      // Give the proof renderer the full frame, avoiding narrow designer-column cropping.
      const style=doc.createElement('style');style.textContent='.preview-pane{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;z-index:9999!important}#webgl{width:100vw!important;height:100vh!important;display:block!important}';doc.head.appendChild(style);win.dispatchEvent(new win.Event('resize'));
      // Decode every saved asset before the editor builds its garment textures.
      await withTimeout(Promise.all(Object.values(payload?.design?.zones||{}).flatMap(state=>state.layers||[]).filter(layer=>layer.type==='image').map(layer=>new Promise((resolve,reject)=>{
        const image=new win.Image();image.crossOrigin='anonymous';image.onload=resolve;image.onerror=()=>reject(new Error(`Saved artwork could not load: ${layer.id||layer.filename}.`));image.src=layer.src;
      }))),15000,'Saved artwork loading timed out.');
      const garmentReady=new Promise((resolve,reject)=>{
        const ready=event=>{if(event.detail?.productId===payload.product?.id){cleanup();resolve();}};
        const failed=event=>{cleanup();reject(new Error(event.detail?.message||'Garment rendering failed.'));};
        const cleanup=()=>{win.removeEventListener('mqd:garment-ready',ready);win.removeEventListener('mqd:garment-error',failed);};
        win.addEventListener('mqd:garment-ready',ready);win.addEventListener('mqd:garment-error',failed);
      });
      await withTimeout(win.MQDDesigner.loadDesign(payload,{notify:false}),15000,'Saved design preview load timed out.');
      await withTimeout(garmentReady,20000,'Saved garment rendering timed out.');
      try{await withTimeout(doc.fonts?.ready,3000,'Preview fonts timed out.');}catch{}
      const canvas=doc.getElementById('webgl');if(!canvas)throw new Error('3D preview canvas is unavailable.');
      await waitForGarment(canvas);await sleep(100);
      const output=[];
      for(let i=0;i<views.length;i++){
        const view=views[i];
        if(typeof win.MQDDesigner?.setProductionProofView==='function'){
          if(!win.MQDDesigner.setProductionProofView(cameraViewFor(payload.product?.id,view)))throw new Error(`Could not set exact ${view} production view.`);
          await sleep(50);
        }else{
          throw new Error('Exact production view controls are unavailable.');
        }
        output.push({view,blob:await withTimeout(canvasPng(canvas),5000,'Preview PNG timed out.')});
      }
      return output;
    }finally{frame.remove();}
  }
  async function addCapturedViews(zip,root,captured){
    if(captured.length!==views.length||!views.every(view=>captured.some(entry=>entry.view===view&&entry.blob?.size>0)))throw new Error('All four production views are required.');
    for(const entry of captured)zip.file(`${root}mockup-previews/${entry.view}.png`,new Uint8Array(await entry.blob.arrayBuffer()));
    zip.file(`${root}mockup-previews/README.txt`,'Visual production proof generated from the customer\'s saved 3D garment design.\nIncluded views: front, back, left side, and right side.\nUse these PNGs as visual references together with the production zone files and HEX colors.\n');
  }

  Zip.prototype.generateAsync=async function(options,...rest){
    let proofRequired=false;
    try{
      const names=Object.keys(this.files||{});proofRequired=names.some(name=>/(?:^|\/)design\.json$/i.test(name)||name.includes('original-assets/__mockup__/'));let root='';const proofSources={};
      for(const name of names){
        const marker='original-assets/__mockup__/';const at=name.indexOf(marker);if(at<0)continue;
        const base=name.slice(at+marker.length).toLowerCase();
        for(const view of ['front','back','left-side','right-side'])if(base===`mockup-${view}.png`){root=name.slice(0,at);proofSources[view]=name;}
      }
      const designName=names.find(name=>/(?:^|\/)design\.json$/i.test(name));
      const designText=designName?await this.file(designName)?.async('string'):null;
      const savedPayload=designText?JSON.parse(designText):null;
      if(!savedPayload?.design&&['front','back','left-side','right-side'].every(view=>proofSources[view])){
        for(const view of ['front','back','left-side','right-side']){
          const source=proofSources[cameraViewFor(savedPayload?.product?.id,view)],file=this.file(source);if(!file)continue;
          const bytes=await file.async('uint8array');if(bytes.length<8||![137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))throw new Error(`Saved ${view} proof is not a valid PNG.`);this.file(`${root}mockup-previews/${view}.png`,bytes);this.remove(source);
        }
        this.file(`${root}mockup-previews/README.txt`,'Visual production proof generated from the customer\'s saved 3D garment design.\nIncluded views: front, back, left side, and right side.\nUse these PNGs as visual references together with the production zone files and HEX colors.\n');
      }else{
        if(designName){
          root=designName.slice(0,designName.length-'design.json'.length);
          if(savedPayload){const payload=await hydrateFromZip(this,root,savedPayload);await addCapturedViews(this,root,await captureViews(payload));}
        }
        if(proofRequired&&!views.every(view=>this.file(`${root}mockup-previews/${view}.png`)))throw new Error('All four production views are required.');
      }
    }catch(error){
      if(proofRequired)throw new Error(`Production ZIP could not include all four garment views. Please retry; no incomplete ZIP was downloaded. ${error?.message||String(error)}`);
      throw error;
    }
    return originalGenerate.call(this,options,...rest);
  };
})();
