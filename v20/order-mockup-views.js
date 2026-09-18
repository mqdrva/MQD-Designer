(()=>{
  const params=new URLSearchParams(location.search);
  if(params.get('mqdCapture')==='1')return;

  // Customer accounts are Google-only. Keep the existing auth module and
  // session handling, but remove the legacy email/password controls before
  // the module attaches its event handlers.
  const authForm=document.getElementById('authForm');
  const googleButton=document.getElementById('googleSignInButton');
  const authMessage=document.getElementById('authMessage');
  if(authForm&&googleButton&&authMessage){
    authForm.replaceChildren(googleButton,authMessage);
    googleButton.querySelector('span:last-child')?.replaceChildren(document.createTextNode('Continue with Google'));
    authForm.setAttribute('aria-label','Google account sign in');
  }

  const nativeFetch=window.fetch.bind(window);
  const SUBMIT_PATH='/functions/v1/submit-mqd-design';
  const GUEST_SUBMIT_PATH='/functions/v1/submit-mqd-guest-design';
  const LIBRARY_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-artwork-library';
  const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
  const VIEW_ORDER=['front','left-side','back','right-side'];

  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const nextFrames=(win,count=2)=>new Promise(resolve=>{
    const tick=()=>count--<=0?resolve():win.requestAnimationFrame(tick);
    win.requestAnimationFrame(tick);
  });
  function requestUrl(input){
    if(typeof input==='string')return input;
    if(input instanceof URL)return input.href;
    return input?.url||String(input||'');
  }
  function parseMeta(value){try{return JSON.parse(String(value||'{}'));}catch{return{};}}
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
        const ctx=out.getContext('2d');ctx.fillStyle='#F7F7F7';ctx.fillRect(0,0,out.width,out.height);
        const max=900,scale=Math.min(max/Math.max(1,canvas.width),max/Math.max(1,canvas.height));
        const w=canvas.width*scale,h=canvas.height*scale;
        ctx.drawImage(canvas,(1000-w)/2,(1000-h)/2,w,h);
        out.toBlob(blob=>blob?resolve(blob):reject(new Error('Preview PNG could not be created.')),'image/png');
      }catch(error){reject(error);}
    });
  }
  async function libraryAsset(productId,zone,assetId,cache){
    const key=`${productId}::${zone}`;
    if(!cache.has(key)){
      cache.set(key,(async()=>{
        const response=await nativeFetch(LIBRARY_URL,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'catalog',productId,zone})});
        if(!response.ok)return[];
        const result=await response.json().catch(()=>({}));return Array.isArray(result.assets)?result.assets:[];
      })());
    }
    const assets=await cache.get(key);return assets.find(asset=>String(asset.id)===String(assetId))||null;
  }
  async function hydrateRenderPayload(payload,form){
    const renderPayload=structuredClone(payload),files=form.getAll('asset').filter(value=>value instanceof File),metas=form.getAll('assetMeta').map(parseMeta);
    for(let i=0;i<files.length;i++){
      const meta=metas[i]||{};if(meta.kind==='mockup-view'||meta.kind==='original-source')continue;
      const layer=renderPayload?.design?.zones?.[meta.zone]?.layers?.find(row=>String(row.id)===String(meta.layerId));
      if(layer?.type==='image'&&!layer.libraryAssetId)layer.src=await dataUrl(files[i]);
    }
    const cache=new Map();
    for(const [zone,state] of Object.entries(renderPayload?.design?.zones||{})){
      for(const layer of state?.layers||[]){
        if(layer?.type!=='image'||!layer.libraryAssetId||layer.src)continue;
        const asset=await libraryAsset(renderPayload.product?.id,zone,layer.libraryAssetId,cache);
        if(asset?.renderUrl)layer.src=asset.renderUrl;
      }
    }
    return renderPayload;
  }
  async function quarterOrbit(frame,canvas){
    const win=frame.contentWindow,rect=canvas.getBoundingClientRect(),pointerId=9187;
    const x=rect.left+rect.width/2,y=rect.top+rect.height/2,dx=(canvas.clientHeight||rect.height||800)/4;
    let restoreSet=false,restoreRelease=false;
    try{
      if(typeof canvas.setPointerCapture==='function'){Object.defineProperty(canvas,'setPointerCapture',{configurable:true,value:()=>{}});restoreSet=true;}
      if(typeof canvas.releasePointerCapture==='function'){Object.defineProperty(canvas,'releasePointerCapture',{configurable:true,value:()=>{}});restoreRelease=true;}
      const base={bubbles:true,cancelable:true,pointerId,pointerType:'mouse',isPrimary:true,button:0};
      canvas.dispatchEvent(new win.PointerEvent('pointerdown',{...base,buttons:1,clientX:x,clientY:y}));
      canvas.dispatchEvent(new win.PointerEvent('pointermove',{...base,buttons:1,clientX:x+dx,clientY:y}));
      canvas.dispatchEvent(new win.PointerEvent('pointerup',{...base,buttons:0,clientX:x+dx,clientY:y}));
      await nextFrames(win,120);
    }finally{
      if(restoreSet)delete canvas.setPointerCapture;
      if(restoreRelease)delete canvas.releasePointerCapture;
    }
  }
  async function captureViews(payload,form){
    const renderPayload=await hydrateRenderPayload(payload,form);
    const frame=document.createElement('iframe');
    frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;
    Object.assign(frame.style,{position:'fixed',left:'-12000px',top:'0',width:'1200px',height:'900px',border:'0',opacity:'0',pointerEvents:'none',zIndex:'-1'});
    frame.src=`/?mqdCapture=1&proof=${Date.now()}`;
    document.body.appendChild(frame);
    try{
      await Promise.race([new Promise((resolve,reject)=>{frame.onload=resolve;frame.onerror=()=>reject(new Error('Preview renderer could not load.'));}),sleep(15000).then(()=>{throw new Error('Preview renderer load timed out.');})]);
      const win=frame.contentWindow,doc=frame.contentDocument;
      const started=Date.now();
      while(!win?.MQDDesigner?.loadDesign&&Date.now()-started<12000)await sleep(80);
      if(!win?.MQDDesigner?.loadDesign)throw new Error('Preview renderer is not ready.');
      await win.MQDDesigner.loadDesign(renderPayload,{notify:false});
      try{await doc.fonts?.ready;}catch{}
      const canvas=doc.getElementById('webgl');if(!canvas)throw new Error('3D preview canvas is unavailable.');
      await waitForGarment(canvas);
      await sleep(900);
      await nextFrames(win,3);
      const views=[];
      for(let i=0;i<VIEW_ORDER.length;i++){
        const view=VIEW_ORDER[i];
        if(typeof win.MQDDesigner?.setProductionProofView==='function'){
          if(!win.MQDDesigner.setProductionProofView(view))throw new Error(`Could not set exact ${view} production view.`);
          await nextFrames(win,2);
        }else if(i>0){
          await quarterOrbit(frame,canvas);
        }
        views.push({view,blob:await canvasPng(canvas)});
      }
      return views;
    }finally{frame.remove();}
  }
  async function appendProofViews(form){
    if(form.getAll('assetMeta').some(value=>parseMeta(value).kind==='mockup-view'))return;
    const raw=form.get('payload');if(!raw)return;
    const payload=JSON.parse(String(raw));
    const views=await captureViews(payload,form);
    for(const entry of views){
      form.append('asset',entry.blob,`mockup-${entry.view}.png`);
      form.append('assetMeta',JSON.stringify({zone:'__mockup__',layerId:`mockup-view-${entry.view}`,label:`Garment ${entry.view} preview`,kind:'mockup-view',view:entry.view,visible:true}));
    }
  }

  window.fetch=async function(input,init){
    const url=requestUrl(input);
    if((url.includes(SUBMIT_PATH)||url.includes(GUEST_SUBMIT_PATH))&&init?.body instanceof FormData){
      try{await appendProofViews(init.body);}catch(error){console.warn('MQD multi-angle order proof capture skipped:',error);}
    }
    return nativeFetch(input,init);
  };
  import('/v20/guest-checkout.js?v=20260918a').catch(error=>console.error('MQD guest checkout module failed to load',error));
})();
