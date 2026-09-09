const $=id=>document.getElementById(id);
const SUBMIT_URL='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/submit-mqd-design';

function sleep(ms=0){return new Promise(r=>setTimeout(r,ms));}

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
  return await response.json();
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

async function saveDraft(){
  const btn=$('saveDraft');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Saving…';
  try{
    const payload=await captureDesignJSON();
    const db=await openDraftDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts','readwrite');
      tx.objectStore('drafts').put(payload,payload.product?.id||'current');
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(tx.error);
    });
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
  try{return JSON.parse(localStorage.getItem('mqd-cart')||'[]')}catch{return[]}
}
function saveCart(items){localStorage.setItem('mqd-cart',JSON.stringify(items));}
function updateCartButton(){const b=$('cartButton');if(b)b.textContent='Cart ('+cartItems().length+')';}

async function submitDesignToBackend(){
  const payload=await captureDesignJSON();
  const clean=structuredClone(payload);
  const form=new FormData();
  for(const [zone,state] of Object.entries(payload.design?.zones||{})){
    for(const layer of state.layers||[]){
      if(layer.type!=='image'||!layer.src) continue;
      const blob=await dataUrlToBlob(layer.src);
      const filename=layer.filename||'artwork.png';
      form.append('asset',blob,filename);
      form.append('assetMeta',JSON.stringify({zone,layerId:layer.id,label:layer.label,x:layer.x||0,y:layer.y||0,scale:layer.scale||1,rotation:layer.rotation||0,visible:layer.visible!==false}));
      delete layer.src;
    }
  }
  const mockup=await mockupBlob();
  if(mockup) form.append('mockup',mockup,(payload.product?.id||'product')+'-mockup.png');
  form.append('payload',JSON.stringify(clean,(k,v)=>k==='src'||k==='image'?undefined:v));
  const response=await fetch(SUBMIT_URL,{method:'POST',body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok) throw new Error(result.error||'Design submission failed');
  return {result,payload};
}

async function addToCart(){
  const btn=$('addToCart');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Adding…';
  try{
    const {result,payload}=await submitDesignToBackend();
    const items=cartItems();
    items.push({designId:result.designId,orderNumber:result.orderNumber,productId:payload.product?.id,productName:payload.product?.name,price:Number(payload.product?.price)||0,addedAt:new Date().toISOString()});
    saveCart(items);updateCartButton();
    btn.textContent='Added ✓';
    setTimeout(()=>btn.textContent=old,1200);
  }catch(err){
    console.error(err);btn.textContent=old;
    alert('Could not add this design to cart: '+err.message);
  }finally{btn.disabled=false;}
}

function showCart(){
  const items=cartItems();
  if(!items.length){alert('Your cart is empty.');return;}
  const total=items.reduce((n,x)=>n+(Number(x.price)||0),0);
  alert(items.map((x,i)=>`${i+1}. ${x.productName} — $${Number(x.price).toFixed(2)}\nRef: ${x.orderNumber}`).join('\n\n')+`\n\nSubtotal: $${total.toFixed(2)}\n\nStripe checkout is the next connection.`);
}

window.addEventListener('DOMContentLoaded',()=>{
  $('saveDraft')?.addEventListener('click',saveDraft);
  $('addToCart')?.addEventListener('click',addToCart);
  $('cartButton')?.addEventListener('click',showCart);
  updateCartButton();
});
