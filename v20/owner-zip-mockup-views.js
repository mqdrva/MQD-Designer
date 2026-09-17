(()=>{
  const Zip=window.JSZip;
  if(!Zip?.prototype?.generateAsync)return;
  const originalGenerate=Zip.prototype.generateAsync;
  const nativeFetch=window.fetch.bind(window);
  const views=['front','left-side','back','right-side'];
  const LIBRARY_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-artwork-library';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const safePart=value=>String(value||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100);
  const nextFrames=(win,count=2)=>new Promise(resolve=>{
    const tick=()=>count--<=0?resolve():win.requestAnimationFrame(tick);
    win.requestAnimationFrame(tick);
  });
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
      const response=await nativeFetch(LIBRARY_URL,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'catalog',productId,zone})});
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
        if(layer.libraryAssetId){
          const asset=await libraryAsset(copy.product?.id,zone,layer.libraryAssetId,cache);
          if(asset?.renderUrl)layer.src=asset.renderUrl;
          continue;
        }
        const wanted=safePart(layer.filename||'').toLowerCase();
        let match=candidates.find(name=>name.slice(prefix.length).toLowerCase()===wanted);
        if(!match&&wanted){
          const stem=wanted.replace(/\.[^.]+$/,'');
          match=candidates.find(name=>name.slice(prefix.length).toLowerCase().replace(/\.[^.]+$/,'')===stem);
        }
        if(!match&&candidates.length===1)match=candidates[0];
        const file=match&&zip.file(match);if(file)layer.src=await dataUrl(await file.async('blob'));
      }
    }
    return copy;
  }
  async function quarterOrbit(frame,canvas){
    const win=frame.contentWindow,rect=canvas.getBoundingClientRect(),pointerId=9188;
    const x=rect.left+rect.width/2,y=rect.top+rect.height/2,dx=(canvas.clientHeight||rect.height||800)/4;
    let set=false,release=false;
    try{
      if(typeof canvas.setPointerCapture==='function'){Object.defineProperty(canvas,'setPointerCapture',{configurable:true,value:()=>{}});set=true;}
      if(typeof canvas.releasePointerCapture==='function'){Object.defineProperty(canvas,'releasePointerCapture',{configurable:true,value:()=>{}});release=true;}
      const base={bubbles:true,cancelable:true,pointerId,pointerType:'mouse',isPrimary:true,button:0};
      canvas.dispatchEvent(new win.PointerEvent('pointerdown',{...base,buttons:1,clientX:x,clientY:y}));
      canvas.dispatchEvent(new win.PointerEvent('pointermove',{...base,buttons:1,clientX:x+dx,clientY:y}));
      canvas.dispatchEvent(new win.PointerEvent('pointerup',{...base,buttons:0,clientX:x+dx,clientY:y}));
      await nextFrames(win,3);
    }finally{
      if(set)delete canvas.setPointerCapture;
      if(release)delete canvas.releasePointerCapture;
    }
  }
  async function captureViews(payload){
    const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    Object.assign(frame.style,{position:'fixed',left:'-12000px',top:'0',width:'1200px',height:'900px',border:'0',opacity:'0',pointerEvents:'none',zIndex:'-1'});
    frame.src=`/?mqdCapture=1&ownerProof=${Date.now()}`;document.body.appendChild(frame);
    try{
      await Promise.race([new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(new Error('Preview renderer could not load.'));}),sleep(15000).then(()=>{throw new Error('Preview renderer load timed out.');})]);
      const win=frame.contentWindow,doc=frame.contentDocument,started=Date.now();
      while(!win?.MQDDesigner?.loadDesign&&Date.now()-started<12000)await sleep(80);
      if(!win?.MQDDesigner?.loadDesign)throw new Error('Preview renderer is not ready.');
      await win.MQDDesigner.loadDesign(payload,{notify:false});
      try{await doc.fonts?.ready;}catch{}
      const canvas=doc.getElementById('webgl');if(!canvas)throw new Error('3D preview canvas is unavailable.');
      await waitForGarment(canvas);await sleep(900);await nextFrames(win,3);
      const output=[];
      for(let i=0;i<views.length;i++){
        if(i>0)await quarterOrbit(frame,canvas);
        output.push({view:views[i],blob:await canvasPng(canvas)});
      }
      return output;
    }finally{frame.remove();}
  }
  async function addCapturedViews(zip,root,captured){
    for(const entry of captured)zip.file(`${root}mockup-previews/${entry.view}.png`,new Uint8Array(await entry.blob.arrayBuffer()));
    zip.file(`${root}mockup-previews/README.txt`,'Visual production proof generated from the customer\'s saved 3D garment design.\nIncluded views: front, back, left side, and right side.\nUse these PNGs as visual references together with the production zone files and HEX colors.\n');
  }

  Zip.prototype.generateAsync=async function(options,...rest){
    try{
      const names=Object.keys(this.files||{});let root='';const proofSources={};
      for(const name of names){
        const marker='original-assets/__mockup__/';const at=name.indexOf(marker);if(at<0)continue;
        const base=name.slice(at+marker.length).toLowerCase();
        for(const view of ['front','back','left-side','right-side'])if(base===`mockup-${view}.png`){root=name.slice(0,at);proofSources[view]=name;}
      }
      if(['front','back','left-side','right-side'].every(view=>proofSources[view])){
        for(const view of ['front','back','left-side','right-side']){
          const source=proofSources[view],file=this.file(source);if(!file)continue;
          this.file(`${root}mockup-previews/${view}.png`,await file.async('uint8array'));this.remove(source);
        }
        this.file(`${root}mockup-previews/README.txt`,'Visual production proof generated from the customer\'s saved 3D garment design.\nIncluded views: front, back, left side, and right side.\nUse these PNGs as visual references together with the production zone files and HEX colors.\n');
      }else{
        const designName=names.find(name=>/\/design\.json$/i.test(name));
        if(designName){
          root=designName.slice(0,designName.length-'design.json'.length);
          const raw=await this.file(designName)?.async('string');
          if(raw){const payload=await hydrateFromZip(this,root,JSON.parse(raw));await addCapturedViews(this,root,await captureViews(payload));}
        }
        if(!Object.keys(this.files).some(name=>name.startsWith(`${root}mockup-previews/`))){
          const legacy=names.find(name=>/\/mockup\.png$/i.test(name));
          if(legacy){root=legacy.slice(0,legacy.length-'mockup.png'.length);const file=this.file(legacy);if(file)this.file(`${root}mockup-previews/current-view.png`,await file.async('uint8array'));}
          this.file(`${root}mockup-previews/README.txt`,'Four-angle regeneration was unavailable for this older order. current-view.png, when present, is the original saved mockup.\n');
        }
      }
    }catch(error){
      console.warn('MQD production ZIP visual proof step skipped:',error);
      try{
        const names=Object.keys(this.files||{}),legacy=names.find(name=>/\/mockup\.png$/i.test(name));
        if(legacy){const root=legacy.slice(0,legacy.length-'mockup.png'.length),file=this.file(legacy);if(file)this.file(`${root}mockup-previews/current-view.png`,await file.async('uint8array'));this.file(`${root}mockup-previews/README.txt`,'Four-angle regeneration was unavailable for this older order. current-view.png is the original saved mockup.\n');}
      }catch{}
    }
    return originalGenerate.call(this,options,...rest);
  };
})();
