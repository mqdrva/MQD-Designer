const $=id=>document.getElementById(id);
const SUBMIT_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/submit-mqd-design';
const STRIPE_TSHIRT_TEST_LINK='https://buy.stripe.com/test_bJe00ddZpb0s0zA75eaVa01';
const MQD_PRICE_VERSION='2026-09-09-v2';
const MQD_PRICES={
  'tshirt':50,
  'long-sleeve-tshirt':60,
  'short-sleeve-polo':60,
  'long-sleeve-polo':70,
  'fleece-hoodie':90,
  'lightweight-jacket':90,
  'mask':25,
  'hood-mask-shirt':70,
  'shorts':40,
  'sweat-pants':60,
  'hooded-long-sleeve':70,
  'hat':35
};

function sleep(ms=0){return new Promise(r=>setTimeout(r,ms));}
function priceFor(id,fallback=0){return Object.prototype.hasOwnProperty.call(MQD_PRICES,id)?MQD_PRICES[id]:Number(fallback)||0;}

function syncStoredCatalogPrices(){
  try{
    const raw=localStorage.getItem('mqd-catalog');
    if(!raw)return;
    const catalog=JSON.parse(raw);
    if(!Array.isArray(catalog))return;
    let changed=false;
    for(const p of catalog){
      if(Object.prototype.hasOwnProperty.call(MQD_PRICES,p.id)&&Number(p.price)!==MQD_PRICES[p.id]){p.price=MQD_PRICES[p.id];changed=true;}
    }
    if(changed)localStorage.setItem('mqd-catalog',JSON.stringify(catalog));
  }catch(e){console.warn('MQD catalog price sync skipped',e);}
}

function applyPriceOverridesToUI(){
  const sel=$('productSelect');
  if(!sel)return;
  for(const option of sel.options){
    const price=MQD_PRICES[option.value];
    if(price==null)continue;
    const base=option.textContent.replace(/\s+—\s+\$[0-9,.]+(?:\.\d{2})?$/,'');
    option.textContent=`${base} — $${price.toFixed(2)}`;
  }
}

function migratePriceVersion(){
  syncStoredCatalogPrices();
  const current=localStorage.getItem('mqd-price-version');
  if(current!==MQD_PRICE_VERSION){
    localStorage.removeItem('mqd-cart');
    localStorage.setItem('mqd-price-version',MQD_PRICE_VERSION);
  }
}

async function captureDesignJSON(){
  const exportBtn=$('saveDesign');
  if(!exportBtn) throw new Error('Design exporter is not available.');
  let capturedHref='';
  const originalClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){capturedHref=this.href||'';};
  try{
    exportBtn.click();
    await sleep(20);
  }finally{
    HTMLAnchorElement.prototype.click=originalClick;
  }
  if(!capturedHref) throw new Error('Could not capture the current design.');
  const response=await fetch(capturedHref);
  if(!response.ok) throw new Error('Could not read the current design.');
  const payload=await response.json();
  if(payload?.product?.id)payload.product.price=priceFor(payload.product.id,payload.product.price);
  return payload;
}

function openDraftDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('mqd-customer-drafts',1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains('drafts')) req.result.createObjectStore('drafts');
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function savePayloadToDrafts(key,payload){
  const db=await openDraftDB();
  return await new Promise((resolve,reject)=>{
    const tx=db.transaction('drafts','readwrite');
    tx.objectStore('drafts').put(payload,key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

async function saveDraft(){
  const btn=$('saveDraft');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Saving…';
  try{
    const payload=await captureDesignJSON();
    await savePayloadToDrafts(payload.product?.id||'current',payload);
    btn.textContent='Saved ✓';
    setTimeout(()=>btn.textContent=old,1200);
  }catch(err){
    console.error(err);
    btn.textContent=old;
    alert('Design could not be saved on this device: '+err.message);
  }finally{btn.disabled=false;}
}

async function dataUrlToBlob(src){
  const r=await fetch(src);
  return await r.blob();
}

function openOriginalArtworkDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('mqd-upload-originals',1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files');
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function originalArtworkBlob(filename){
  if(!filename)return null;
  try{
    const db=await openOriginalArtworkDB();
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('files','readonly');
      const req=tx.objectStore('files').get(filename);
      req.onsuccess=()=>resolve(req.result?.file||null);
      req.onerror=()=>reject(req.error);
    });
  }catch(err){
    console.warn('Full-resolution original lookup skipped',err);
    return null;
  }
}

function mockupBlob(){
  return new Promise(resolve=>{
    const src=$('webgl');
    if(!src) return resolve(null);
    const out=document.createElement('canvas');
    out.width=src.width;out.height=src.height;
    const c=out.getContext('2d');
    c.fillStyle='#F7F7F7';c.fillRect(0,0,out.width,out.height);c.drawImage(src,0,0);
    out.toBlob(resolve,'image/png');
  });
}

function cartItems(){
  try{
    const items=JSON.parse(localStorage.getItem('mqd-cart')||'[]');
    return Array.isArray(items)?items.map(x=>({...x,price:priceFor(x.productId,x.price)})):[];
  }catch{return[]}
}
function saveCart(items){localStorage.setItem('mqd-cart',JSON.stringify(items));}
function updateCartButton(){const b=$('cartButton');if(b)b.textContent='Cart ('+cartItems().length+')';}

async function submitDesignToBackend(payload){
  const clean=structuredClone(payload);
  const form=new FormData();
  for(const [zone,state] of Object.entries(payload.design?.zones||{})){
    for(const layer of state.layers||[]){
      if(layer.type!=='image'||!layer.src) continue;
      const filename=layer.filename||'artwork.png';
      const original=await originalArtworkBlob(filename);
      const blob=original||await dataUrlToBlob(layer.src);
      form.append('asset',blob,filename);
      form.append('assetMeta',JSON.stringify({zone,layerId:layer.id,label:layer.label,x:layer.x||0,y:layer.y||0,scale:layer.scale||1,rotation:layer.rotation||0,visible:layer.visible!==false}));
    }
  }
  const mockup=await mockupBlob();
  if(mockup) form.append('mockup',mockup,(payload.product?.id||'product')+'-mockup.png');
  form.append('payload',JSON.stringify(clean,(k,v)=>k==='src'||k==='image'?undefined:v));
  const response=await fetch(SUBMIT_URL,{method:'POST',body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok){
    const detail=[result.error,result.stage&&`stage: ${result.stage}`,result.code&&`code: ${result.code}`].filter(Boolean).join(' · ');
    throw new Error(detail||`Design submission failed (${response.status})`);
  }
  return result;
}

async function addToCart(){
  const btn=$('addToCart');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Adding…';
  try{
    const payload=await captureDesignJSON();
    if(payload?.product?.id)payload.product.price=priceFor(payload.product.id,payload.product.price);
    let result=null;
    let pendingSync=false;
    let backendError='';
    try{
      result=await submitDesignToBackend(payload);
    }catch(err){
      pendingSync=true;
      backendError=err?.message||String(err);
      console.warn('MQD backend submission deferred:',err);
    }

    const localId=crypto.randomUUID();
    const draftKey='cart:'+localId;
    await savePayloadToDrafts(draftKey,payload);

    const items=cartItems();
    items.push({
      designId:result?.designId||localId,
      orderNumber:result?.orderNumber||('LOCAL-'+localId.slice(0,8).toUpperCase()),
      productId:payload.product?.id,
      productName:payload.product?.name,
      price:priceFor(payload.product?.id,payload.product?.price),
      addedAt:new Date().toISOString(),
      pendingSync,
      draftKey,
      backendError
    });
    saveCart(items);updateCartButton();
    btn.textContent='Added ✓';
    setTimeout(()=>btn.textContent=old,1200);
    if(pendingSync) alert('Added to cart. This design is saved safely on this device and will be synced to production storage when the backend connection is available.');
  }catch(err){
    console.error(err);btn.textContent=old;
    alert('Could not add this design to cart: '+err.message);
  }finally{btn.disabled=false;}
}

function stripeCheckoutUrl(item){
  const join=STRIPE_TSHIRT_TEST_LINK.includes('?')?'&':'?';
  return STRIPE_TSHIRT_TEST_LINK+join+'client_reference_id='+encodeURIComponent(item.orderNumber||item.designId||'MQD');
}

function showCart(){
  const items=cartItems();
  if(!items.length){alert('Your cart is empty.');return;}
  const total=items.reduce((n,x)=>n+(Number(x.price)||0),0);
  const summary=items.map((x,i)=>`${i+1}. ${x.productName} — $${Number(x.price).toFixed(2)}\nRef: ${x.orderNumber}${x.pendingSync?'\nSaved locally · sync pending':''}`).join('\n\n')+`\n\nSubtotal: $${total.toFixed(2)}`;

  if(items.some(x=>x.pendingSync)){
    alert(summary+'\n\nCheckout is temporarily blocked because at least one design has not synced to production storage yet.');
    return;
  }
  if(items.length!==1||items[0].productId!=='tshirt'||Number(items[0].price)!==50){
    alert(summary+'\n\nPhase 1 Stripe checkout currently supports one $50 All-Over Print T-Shirt at a time.');
    return;
  }

  const proceed=confirm(summary+'\n\nContinue to secure Stripe TEST checkout?\n\nNo real money will be charged in sandbox mode.');
  if(proceed) window.location.assign(stripeCheckoutUrl(items[0]));
}

window.addEventListener('DOMContentLoaded',()=>{
  migratePriceVersion();
  applyPriceOverridesToUI();
  const select=$('productSelect');
  if(select){
    const observer=new MutationObserver(()=>applyPriceOverridesToUI());
    observer.observe(select,{childList:true,subtree:true,characterData:true});
    select.addEventListener('change',()=>setTimeout(applyPriceOverridesToUI,0));
  }
  $('saveDraft')?.addEventListener('click',saveDraft);
  $('addToCart')?.addEventListener('click',addToCart);
  $('cartButton')?.addEventListener('click',showCart);
  updateCartButton();
});
