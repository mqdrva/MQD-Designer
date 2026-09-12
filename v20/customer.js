import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

const $=id=>document.getElementById(id);
const SUPABASE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const SUBMIT_URL=SUPABASE_URL+'/functions/v1/submit-mqd-design';
const AUTH_REDIRECT_URL='https://mqd-designer-vercel.vercel.app/';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let currentSession=null;
let activeCloudDesign=null;
let pendingAfterAuth=null;
let currentDesignFilter='all';
let accountDesigns=[];
const STRIPE_TEST_LINKS={
  'tshirt':'https://buy.stripe.com/test_bJe00ddZpb0s0zA75eaVa01',
  'long-sleeve-tshirt':'https://buy.stripe.com/test_9B67sFg7x1pS96689iaVa02',
  'short-sleeve-polo':'https://buy.stripe.com/test_eVq28l8F56Kc1DEfBKaVa03',
  'long-sleeve-polo':'https://buy.stripe.com/test_5kQ8wJ4oP3y00zA75eaVa04',
  'fleece-hoodie':'https://buy.stripe.com/test_cNi14h3kL4C46XY61aaVa05',
  'lightweight-jacket':'https://buy.stripe.com/test_4gMbIV08z9WofuuexGaVa06',
  'mask':'https://buy.stripe.com/test_14A00d3kLgkM4PQ3T2aVa07',
  'hood-mask-shirt':'https://buy.stripe.com/test_3cI6oBaNd3y00zA61aaVa08',
  'shorts':'https://buy.stripe.com/test_3cI28l9J95G80zA1KUaVa09',
  'sweat-pants':'https://buy.stripe.com/test_fZu14hbRh7Og966cpyaVa0a',
  'hooded-long-sleeve':'https://buy.stripe.com/test_bJe3cp2gH4C46XY2OYaVa0b',
  'hat':'https://buy.stripe.com/test_6oUaER3kL1pS0zA89iaVa0c'
};
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

const STANDARD_SIZES=['S','M','L','XL','2XL','3XL','4XL','5XL'];
const SHORTS_SIZES=['S','M','L','XL','2XL','3XL'];
const NO_SIZE_PRODUCTS=new Set(['hat','mask']);
const FIT_WARNING_EXCLUDED_PRODUCTS=new Set(['hat','mask']);

function currentProductId(){return $('productSelect')?.value||'';}
function sizesForProduct(id=currentProductId()){
  if(NO_SIZE_PRODUCTS.has(id))return[];
  return id==='shorts'?SHORTS_SIZES:STANDARD_SIZES;
}
function selectedOrderOptions(){
  const rows=[...document.querySelectorAll('#orderOptionRows .order-option-row')];
  return rows.map(row=>({
    size:row.querySelector('.order-size')?.value||null,
    quantity:Math.max(1,Math.min(999,Number(row.querySelector('.order-qty')?.value)||1))
  }));
}
function validateOrderOptions(){
  const options=selectedOrderOptions();
  if(!options.length)return{ok:false,message:'Add at least one quantity.'};
  const sized=sizesForProduct().length>0;
  if(sized){
    const seen=new Set();
    for(const item of options){
      if(!item.size)return{ok:false,message:'Choose a size for each row.'};
      if(seen.has(item.size))return{ok:false,message:'Each size only needs one row. Increase its quantity instead.'};
      seen.add(item.size);
    }
  }
  return{ok:true,options};
}
function makeOrderOptionRow(defaultSize=null,quantity=1){
  const sizes=sizesForProduct();
  const row=document.createElement('div');
  row.className='order-option-row'+(sizes.length?'':' quantity-only');
  if(sizes.length){
    const sizeWrap=document.createElement('label');sizeWrap.className='order-option-field';
    sizeWrap.innerHTML='<span class="order-option-label">Size</span>';
    const select=document.createElement('select');select.className='order-size';
    select.innerHTML=sizes.map(x=>`<option value="${x}">${x}</option>`).join('');
    select.value=defaultSize&&sizes.includes(defaultSize)?defaultSize:sizes[0];
    sizeWrap.appendChild(select);row.appendChild(sizeWrap);
  }
  const qtyWrap=document.createElement('label');qtyWrap.className='order-option-field';
  qtyWrap.innerHTML='<span class="order-option-label">Quantity</span>';
  const qty=document.createElement('input');qty.className='order-qty';qty.type='number';qty.min='1';qty.max='999';qty.step='1';qty.value=String(Math.max(1,quantity||1));
  qty.addEventListener('change',()=>{qty.value=String(Math.max(1,Math.min(999,Number(qty.value)||1)));});
  qtyWrap.appendChild(qty);row.appendChild(qtyWrap);
  const remove=document.createElement('button');remove.type='button';remove.className='remove-order-row';remove.setAttribute('aria-label','Remove size');remove.textContent='×';
  remove.onclick=()=>{const host=$('orderOptionRows');if(host?.children.length>1)row.remove();};
  row.appendChild(remove);
  return row;
}
function renderOrderOptions(){
  const host=$('orderOptionRows'),add=$('addOrderOptionRow'),section=$('orderOptionsSection');
  if(!host||!section)return;
  host.innerHTML='';
  const sizes=sizesForProduct();
  host.appendChild(makeOrderOptionRow(sizes[0]||null,1));
  if(add){
    add.hidden=!sizes.length;
    add.innerHTML='<span>＋</span> Add another size';
  }
  let note=section.querySelector('.order-options-note');
  if(!note){note=document.createElement('div');note.className='order-options-note';section.appendChild(note);}
  note.classList.remove('fit-warning');
  const pid=currentProductId();
  if(!FIT_WARNING_EXCLUDED_PRODUCTS.has(pid)){
    note.textContent='Sizes run fitted, so we recommend a size up for a loose fit — especially the long sleeve.';
    note.classList.add('fit-warning');
  }else{
    note.textContent='This item uses quantity only.';
  }
}

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
    const target=`${base} — $${price.toFixed(2)}`;
    if(option.textContent!==target)option.textContent=target;
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
  if(window.MQDDesigner?.exportDesign){
    const payload=window.MQDDesigner.exportDesign();
    if(payload?.product?.id)payload.product.price=priceFor(payload.product.id,payload.product.price);
    return payload;
  }
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

function accountUser(){return currentSession?.user||null;}
function openAuth(reason='Sign in to save and reopen designs from any device.',after=null){
  pendingAfterAuth=after;
  $('authReason').textContent=reason;
  $('authMessage').textContent='';$('authMessage').className='account-message';
  $('authOverlay').classList.remove('hidden');
  setTimeout(()=>$('authEmail')?.focus(),0);
}
function closeAuth(){
  $('authOverlay').classList.add('hidden');
  if(!accountUser())pendingAfterAuth=null;
}
function updateAccountButton(){
  const button=$('accountButton');if(!button)return;
  button.textContent=accountUser()?'My Account':'Sign In';
}
function requireAccount(reason,after){
  if(accountUser())return true;
  openAuth(reason,after);return false;
}
function fileExtension(blob,filename=''){
  const fromName=filename.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if(fromName)return fromName==='jpeg'?'jpg':fromName;
  return({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[blob.type]||'bin';
}
function safePathPart(value){return String(value||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100);}
function designColors(payload){
  return Object.fromEntries(Object.entries(payload.design?.zones||{}).map(([zone,state])=>[zone,String(state?.background||'#FFFFFF').toUpperCase()]));
}
async function prepareCloudPayload(payload,designId,userId){
  const cloud=structuredClone(payload);
  for(const [zone,state] of Object.entries(cloud.design?.zones||{})){
    for(const layer of state.layers||[]){
      delete layer.image;
      if(layer.type!=='image')continue;
      if(layer.storagePath){delete layer.src;continue;}
      if(!layer.src)continue;
      const blob=await dataUrlToBlob(layer.src);
      const ext=fileExtension(blob,layer.filename);
      const baseName=safePathPart(layer.filename||'artwork').replace(/\.[^.]+$/,'')||'artwork';
      const path=`${userId}/designs/${designId}/${safePathPart(zone)}/${safePathPart(layer.id)}-${baseName}.${ext}`;
      const {error}=await supabase.storage.from('customer-artwork').upload(path,blob,{contentType:blob.type||'application/octet-stream',upsert:true});
      if(error)throw new Error('Artwork upload failed: '+error.message);
      layer.storagePath=path;delete layer.src;
    }
  }
  return cloud;
}
async function saveCloudDesign(payload,{forceNew=false,name=null}={}){
  const user=accountUser();if(!user)throw new Error('Please sign in first.');
  const mayUpdate=activeCloudDesign&&activeCloudDesign.status==='draft'&&!forceNew;
  const id=mayUpdate?activeCloudDesign.id:crypto.randomUUID();
  const cloudPayload=await prepareCloudPayload(payload,id,user.id);
  let previewPath=mayUpdate?activeCloudDesign.preview_path:null;
  const preview=await mockupBlob();
  if(preview){
    previewPath=`${user.id}/designs/${id}/preview.png`;
    const {error}=await supabase.storage.from('customer-artwork').upload(previewPath,preview,{contentType:'image/png',upsert:true});
    if(error)throw new Error('Preview upload failed: '+error.message);
  }
  const record={
    id,user_id:user.id,product_id:String(payload.product?.id||''),product_name:String(payload.product?.name||'Custom design'),
    name:name||activeCloudDesign?.name||`${payload.product?.name||'Custom design'} — ${new Date().toLocaleDateString()}`,
    status:'draft',design_json:cloudPayload,preview_path:previewPath,zone_colors:designColors(payload),
    parent_design_id:mayUpdate?(activeCloudDesign.parent_design_id||null):(activeCloudDesign?.id||null),
    version:mayUpdate?(activeCloudDesign.version||1):((activeCloudDesign?.version||0)+1),updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from('customer_designs').upsert(record,{onConflict:'id'}).select('*').single();
  if(error)throw new Error(error.message);
  activeCloudDesign=data;
  return data;
}

async function saveDraft(){
  if(!requireAccount('Create or sign into your account to save this design on every device.',saveDraft))return;
  const btn=$('saveDraft');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Saving…';
  try{
    const payload=await captureDesignJSON();
    await savePayloadToDrafts(payload.product?.id||'current',payload);
    await saveCloudDesign(payload);
    btn.textContent='Saved ✓';
    setTimeout(()=>btn.textContent=old,1200);
  }catch(err){
    console.error(err);
    btn.textContent=old;
    alert('The design was saved on this device, but could not be saved to your account: '+err.message);
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
function updateCartButton(){const b=$('cartButton');if(!b)return;const count=cartItems().reduce((n,x)=>n+(Number(x.totalQuantity)||1),0);b.textContent='Cart ('+count+')';}

async function submitDesignToBackend(payload,{retry=false,mockup=null}={}){
  const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
  if(sessionError)throw sessionError;
  const token=sessionData.session?.access_token;
  if(!token)throw new Error('Your sign-in session has expired. Please sign in again.');
  const clean=structuredClone(payload);
  const form=new FormData();
  for(const [zone,state] of Object.entries(payload.design?.zones||{})){
    for(const layer of state.layers||[]){
      if(layer.type!=='image'||!layer.src) continue;
      const filename=layer.filename||'artwork.png';
      const original=retry?null:await originalArtworkBlob(filename);
      const blob=original||await dataUrlToBlob(layer.src);
      form.append('asset',blob,filename);
      form.append('assetMeta',JSON.stringify({zone,layerId:layer.id,label:layer.label,x:layer.x||0,y:layer.y||0,scale:layer.scale||1,rotation:layer.rotation||0,visible:layer.visible!==false}));
    }
  }
  if(!retry)mockup=await mockupBlob();
  if(mockup) form.append('mockup',mockup,(payload.product?.id||'product')+'-mockup.png');
  form.append('payload',JSON.stringify(clean,(k,v)=>k==='src'||k==='image'?undefined:v));
  const response=await fetch(SUBMIT_URL,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok){
    const detail=[result.error||result.message,result.stage&&`stage: ${result.stage}`,result.code&&`code: ${result.code}`].filter(Boolean).join(' · ');
    throw new Error(detail||`Design submission failed (${response.status})`);
  }
  return result;
}

async function addToCart(){
  if(!requireAccount('Create or sign into your account before adding this custom design to the cart.',addToCart))return;
  const btn=$('addToCart');
  const old=btn.textContent;
  btn.disabled=true;btn.textContent='Adding…';
  try{
    const selection=validateOrderOptions();
    if(!selection.ok)throw new Error(selection.message);
    const payload=await captureDesignJSON();
    if(payload?.product?.id)payload.product.price=priceFor(payload.product.id,payload.product.price);
    const cloudDesign=await saveCloudDesign(payload);
    payload.designId=cloudDesign.id;
    payload.orderOptions=selection.options;
    payload.totalQuantity=selection.options.reduce((n,x)=>n+x.quantity,0);
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
      orderOptions:payload.orderOptions,
      totalQuantity:payload.totalQuantity,
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
  const base=STRIPE_TEST_LINKS[item?.productId];
  if(!base)return'';
  const join=base.includes('?')?'&':'?';
  return base+join+'client_reference_id='+encodeURIComponent(item.orderNumber||item.designId||'MQD');
}

let cartSyncInProgress=false;
async function loadCartDraft(key){
  const db=await openDraftDB();
  try{return await new Promise((resolve,reject)=>{
    const request=db.transaction('drafts','readonly').objectStore('drafts').get(key);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });}finally{db.close();}
}

async function retryPendingCart(){
  const user=accountUser();
  if(!user)throw new Error('Please sign in to sync your saved cart.');
  for(const item of cartItems().filter(x=>x.pendingSync)){
    let update;
    try{
      const payload=await loadCartDraft(item.draftKey);
      if(!payload?.designId||!payload.design?.zones)throw new Error('The saved cart design could not be found on this device.');
      const {data:design,error}=await supabase.from('customer_designs').select('id,design_json,preview_path').eq('id',payload.designId).eq('user_id',user.id).single();
      if(error||!design)throw new Error('Sign in with the account that saved this cart design.');
      const snapshotJSON=value=>JSON.stringify(value,(key,value)=>['src','image','storagePath'].includes(key)?undefined:value);
      const sameSnapshot=snapshotJSON(payload.design)===snapshotJSON(design.design_json?.design);
      // Keep the cart snapshot, including its sizes and placement, not the current editor.
      for(const [zone,state] of Object.entries(payload.design.zones)){
        for(const layer of state.layers||[]){
          if(layer.type!=='image')continue;
          if(layer.src?.startsWith('data:'))continue;
          const savedLayer=design.design_json?.design?.zones?.[zone]?.layers?.find(x=>x.id===layer.id);
          const path=layer.storagePath||(sameSnapshot?savedLayer?.storagePath:null);
          if(!path)throw new Error('Saved artwork is unavailable. Reopen the saved design before trying again.');
          const {data:blob,error:downloadError}=await supabase.storage.from('customer-artwork').download(path);
          if(downloadError)throw new Error('Could not retrieve saved artwork: '+downloadError.message);
          layer.src=await new Promise((resolve,reject)=>{
            const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
          });
        }
      }
      // Never attach a mockup of a different garment currently open in the editor.
      let mockup=null;
      if(sameSnapshot&&design.preview_path){
        const {data,error}=await supabase.storage.from('customer-artwork').download(design.preview_path);
        if(error)throw new Error('Could not retrieve the saved preview: '+error.message);
        mockup=data;
      }
      const result=await submitDesignToBackend(payload,{retry:true,mockup});
      if(!result.orderNumber||!result.designId)throw new Error('The upload did not return an order reference.');
      update={designId:result.designId,orderNumber:result.orderNumber,pendingSync:false,backendError:''};
    }catch(error){
      update={pendingSync:true,backendError:error.message||String(error)};
    }
    // Merge with current storage so additions made during upload are preserved.
    saveCart(cartItems().map(x=>x.draftKey===item.draftKey?{...x,...update}:x));
  }
}

async function showCart(){
  if(cartSyncInProgress)return;
  if(cartItems().some(x=>x.pendingSync)){
    if(!requireAccount('Sign in to sync your saved cart.',showCart))return;
    cartSyncInProgress=true;
    const button=$('cartButton');button.disabled=true;button.textContent='Syncing…';
    try{await retryPendingCart();}
    catch(error){alert('Could not sync your cart: '+error.message);return;}
    finally{cartSyncInProgress=false;button.disabled=false;updateCartButton();}
  }
  const items=cartItems();
  if(!items.length){alert('Your cart is empty.');return;}
  const total=items.reduce((n,x)=>n+(Number(x.price)||0)*(Number(x.totalQuantity)||1),0);
  const summary=items.map((x,i)=>{
    const options=(x.orderOptions||[]).map(o=>`${o.size?o.size+' × ':''}${o.quantity}`).join(', ');
    const qty=Number(x.totalQuantity)||1;
    return `${i+1}. ${x.productName} — ${Number(x.price).toFixed(2)} × ${qty}\n${options?'Size / Qty: '+options+'\n':''}Ref: ${x.orderNumber}${x.pendingSync?'\nSaved locally · sync pending':''}`;
  }).join('\n\n')+`\n\nSubtotal: ${total.toFixed(2)}`;

  if(items.some(x=>x.pendingSync)){
    const errors=items.filter(x=>x.pendingSync).map(x=>`${x.productName}: ${x.backendError||'Upload incomplete'}`).join('\n');
    alert(summary+'\n\nCould not finish syncing:\n'+errors+'\n\nYour saved designs are retained. Click Cart to retry. Checkout will unlock after every upload succeeds.');
    return;
  }
  if(items.length!==1){
    alert(summary+'\n\nSandbox checkout currently supports one customized product per checkout. Complete this order, then create the next design.');
    return;
  }
  const item=items[0];
  if((Number(item.totalQuantity)||1)!==1){
    alert(summary+'\n\nYour size and quantity selections are saved. The current Stripe test link is priced for one unit, so multi-quantity checkout is blocked until quantity-aware checkout is connected.');
    return;
  }
  const checkoutUrl=stripeCheckoutUrl(item);
  if(!checkoutUrl){
    alert(summary+'\n\nStripe sandbox checkout is not configured for this product yet.');
    return;
  }

  const proceed=confirm(summary+'\n\nContinue to secure Stripe TEST checkout?\n\nNo real money will be charged in sandbox mode.');
  if(proceed) window.location.assign(checkoutUrl);
}

function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function formatDate(value){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch{return'—';}}
async function previewUrl(path){
  if(!path)return'';
  const {data,error}=await supabase.storage.from('customer-artwork').createSignedUrl(path,3600);
  return error?'':(data?.signedUrl||'');
}
async function hydrateCloudPayload(payload){
  const copy=structuredClone(payload);
  for(const state of Object.values(copy.design?.zones||{})){
    for(const layer of state.layers||[]){
      if(layer.type!=='image'||!layer.storagePath)continue;
      const {data,error}=await supabase.storage.from('customer-artwork').download(layer.storagePath);
      if(error)throw new Error('Could not reopen artwork: '+error.message);
      layer.src=URL.createObjectURL(data);
    }
  }
  return copy;
}
async function openCloudDesign(row,{notify=true}={}){
  if(!window.MQDDesigner?.loadDesign)throw new Error('The designer is still loading. Please try again.');
  const payload=await hydrateCloudPayload(row.design_json);
  await window.MQDDesigner.loadDesign(payload,{notify:false});
  activeCloudDesign=row;
  $('customerOverlay').classList.add('hidden');
  if(notify)alert(row.status==='purchased'?'Purchased design opened. Saving changes will create a new draft version.':'Design opened.');
}
async function duplicateCloudDesign(row){
  activeCloudDesign=row;
  const payload=await hydrateCloudPayload(row.design_json);
  const duplicate=await saveCloudDesign(payload,{forceNew:true,name:`Copy of ${row.name}`});
  await openCloudDesign(duplicate,{notify:false});
  alert('A new editable copy was created.');
}
async function buyAgain(row){
  await openCloudDesign(row,{notify:false});
  await addToCart();
}
async function loadDesigns(){
  $('accountLoading').classList.remove('hidden');$('designsList').innerHTML='';
  const {data,error}=await supabase.from('customer_designs').select('*').neq('status','archived').order('updated_at',{ascending:false});
  $('accountLoading').classList.add('hidden');
  if(error)throw new Error(error.message);
  accountDesigns=data||[];
  await renderDesigns();
}
async function renderDesigns(){
  const list=$('designsList');list.innerHTML='';
  const rows=currentDesignFilter==='all'?accountDesigns:accountDesigns.filter(x=>x.status===currentDesignFilter);
  if(!rows.length){list.innerHTML='<div class="account-empty">No designs in this section yet.</div>';return;}
  for(const row of rows){
    const url=await previewUrl(row.preview_path);
    const item=document.createElement('article');item.className='account-item';item.dataset.id=row.id;
    item.innerHTML=`${url?`<img class="account-preview" src="${escapeHtml(url)}" alt="${escapeHtml(row.name)} preview">`:'<div class="account-preview placeholder">✦</div>'}<div><h3>${escapeHtml(row.name)}</h3><div class="account-meta">${escapeHtml(row.product_name)} · Version ${Number(row.version)||1}<br>${row.status==='purchased'?'Purchased':'Draft'} · Updated ${escapeHtml(formatDate(row.updated_at))}</div></div><div class="account-actions"><button class="btn" data-action="open" type="button">${row.status==='purchased'?'View / Edit':'Open'}</button><button class="btn" data-action="duplicate" type="button">Duplicate</button>${row.status==='purchased'?'<button class="btn orange" data-action="buy" type="button">Buy Again</button>':''}</div>`;
    list.appendChild(item);
  }
}
async function loadOrders(){
  const list=$('ordersList');list.innerHTML='<div class="account-empty">Loading orders…</div>';
  const {data,error}=await supabase.from('mqd_orders').select('id,order_number,status,product_name,product_price,amount_paid,currency,created_at,paid_at,design_id').order('created_at',{ascending:false});
  if(error)throw new Error(error.message);
  list.innerHTML='';
  if(!data?.length){list.innerHTML='<div class="account-empty">No orders yet.</div>';return;}
  for(const row of data){
    const item=document.createElement('article');item.className='account-item';item.dataset.designId=row.design_id||'';
    const amount=row.amount_paid??row.product_price??0;
    item.innerHTML=`<div class="account-preview placeholder">#</div><div><h3>${escapeHtml(row.product_name)}</h3><div class="account-meta">${escapeHtml(row.order_number)} · ${escapeHtml(formatDate(row.paid_at||row.created_at))}<br>${new Intl.NumberFormat(undefined,{style:'currency',currency:row.currency||'USD'}).format(Number(amount)||0)} · <span class="order-badge ${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></div></div><div class="account-actions">${row.design_id?'<button class="btn orange" data-order-action="buy" type="button">Buy Again</button>':''}</div>`;
    list.appendChild(item);
  }
}
async function openCustomerAccount(){
  if(!requireAccount('Sign in to view your saved designs and orders.',openCustomerAccount))return;
  $('customerEmail').textContent=accountUser().email||'';$('customerOverlay').classList.remove('hidden');
  try{await loadDesigns();}catch(err){console.error(err);$('designsList').innerHTML=`<div class="account-empty">Could not load designs: ${escapeHtml(err.message)}</div>`;}
}
async function completeAuth(session){
  currentSession=session;updateAccountButton();
  if(!session)return;
  $('authOverlay').classList.add('hidden');
  const action=pendingAfterAuth;pendingAfterAuth=null;
  if(action)setTimeout(()=>action(),0);
}
async function signIn(event){
  event.preventDefault();
  const message=$('authMessage');message.textContent='Signing in…';message.className='account-message';
  const {data,error}=await supabase.auth.signInWithPassword({email:$('authEmail').value.trim(),password:$('authPassword').value});
  if(error){message.textContent=error.message;message.className='account-message error';return;}
  message.textContent='Signed in.';message.className='account-message success';await completeAuth(data.session);
}
async function signInWithGoogle(){
  const message=$('authMessage'),button=$('googleSignInButton');
  if(message){message.textContent='Opening Google sign-in…';message.className='account-message';}
  if(button)button.disabled=true;
  const {error}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:AUTH_REDIRECT_URL}
  });
  if(error){
    if(message){message.textContent=error.message;message.className='account-message error';}
    if(button)button.disabled=false;
  }
}
async function signUp(){
  const message=$('authMessage'),email=$('authEmail').value.trim(),password=$('authPassword').value;
  if(!email||password.length<8){message.textContent='Enter a valid email and a password with at least 8 characters.';message.className='account-message error';return;}
  message.textContent='Creating account…';message.className='account-message';
  const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:AUTH_REDIRECT_URL}});
  if(error){message.textContent=error.message;message.className='account-message error';return;}
  if(data.session){await completeAuth(data.session);return;}
  message.textContent='Check your email to confirm your account, then return here and sign in.';message.className='account-message success';
}
async function resendConfirmation(){
  const message=$('authMessage'),email=$('authEmail').value.trim();
  if(!email){message.textContent='Enter the email address you used to create your account.';message.className='account-message error';return;}
  message.textContent='Sending a new confirmation email…';message.className='account-message';
  const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:AUTH_REDIRECT_URL}});
  if(error){message.textContent=error.message;message.className='account-message error';return;}
  message.textContent='A new confirmation email was sent. Use the newest email because older confirmation links may no longer work.';message.className='account-message success';
}
async function signOut(){
  await supabase.auth.signOut();currentSession=null;activeCloudDesign=null;accountDesigns=[];saveCart([]);updateCartButton();updateAccountButton();$('customerOverlay').classList.add('hidden');
}

window.addEventListener('DOMContentLoaded',()=>{
  migratePriceVersion();
  applyPriceOverridesToUI();
  const select=$('productSelect');
  if(select){
    const observer=new MutationObserver(()=>applyPriceOverridesToUI());
    observer.observe(select,{childList:true,subtree:true,characterData:true});
    select.addEventListener('change',()=>{activeCloudDesign=null;setTimeout(()=>{applyPriceOverridesToUI();renderOrderOptions();},0);});
  }
  renderOrderOptions();
  $('addOrderOptionRow')?.addEventListener('click',()=>{
    const sizes=sizesForProduct();if(!sizes.length)return;
    const used=new Set(selectedOrderOptions().map(x=>x.size));
    const next=sizes.find(x=>!used.has(x));
    if(!next){alert('All available sizes are already listed.');return;}
    $('orderOptionRows')?.appendChild(makeOrderOptionRow(next,1));
  });
  $('saveDraft')?.addEventListener('click',saveDraft);
  $('addToCart')?.addEventListener('click',addToCart);
  $('cartButton')?.addEventListener('click',showCart);
  $('accountButton')?.addEventListener('click',()=>accountUser()?openCustomerAccount():openAuth());
  $('closeAuth')?.addEventListener('click',closeAuth);
  $('authOverlay')?.addEventListener('click',e=>{if(e.target===$('authOverlay'))closeAuth();});
  $('authForm')?.addEventListener('submit',signIn);
  $('googleSignInButton')?.addEventListener('click',signInWithGoogle);
  $('signUpButton')?.addEventListener('click',signUp);
  $('resendConfirmationButton')?.addEventListener('click',resendConfirmation);
  $('closeCustomer')?.addEventListener('click',()=>$('customerOverlay').classList.add('hidden'));
  $('customerOverlay')?.addEventListener('click',e=>{if(e.target===$('customerOverlay'))$('customerOverlay').classList.add('hidden');});
  $('signOutButton')?.addEventListener('click',signOut);
  $('designsTab')?.addEventListener('click',async()=>{$('designsTab').classList.add('active');$('ordersTab').classList.remove('active');$('designsPanel').classList.remove('hidden');$('ordersPanel').classList.add('hidden');await loadDesigns();});
  $('ordersTab')?.addEventListener('click',async()=>{$('ordersTab').classList.add('active');$('designsTab').classList.remove('active');$('ordersPanel').classList.remove('hidden');$('designsPanel').classList.add('hidden');await loadOrders();});
  document.querySelectorAll('[data-design-filter]').forEach(button=>button.addEventListener('click',async()=>{document.querySelectorAll('[data-design-filter]').forEach(x=>x.classList.remove('active'));button.classList.add('active');currentDesignFilter=button.dataset.designFilter;await renderDesigns();}));
  $('designsList')?.addEventListener('click',async e=>{
    const button=e.target.closest('[data-action]'),item=e.target.closest('.account-item');if(!button||!item)return;
    const row=accountDesigns.find(x=>x.id===item.dataset.id);if(!row)return;
    button.disabled=true;
    try{if(button.dataset.action==='open')await openCloudDesign(row);else if(button.dataset.action==='duplicate')await duplicateCloudDesign(row);else if(button.dataset.action==='buy')await buyAgain(row);}catch(err){console.error(err);alert(err.message);}finally{button.disabled=false;}
  });
  $('ordersList')?.addEventListener('click',async e=>{
    const button=e.target.closest('[data-order-action="buy"]'),item=e.target.closest('.account-item');if(!button||!item?.dataset.designId)return;
    button.disabled=true;
    try{let row=accountDesigns.find(x=>x.id===item.dataset.designId);if(!row){const {data,error}=await supabase.from('customer_designs').select('*').eq('id',item.dataset.designId).single();if(error)throw error;row=data;}await buyAgain(row);}catch(err){console.error(err);alert(err.message);}finally{button.disabled=false;}
  });
  updateCartButton();
  supabase.auth.getSession().then(({data})=>completeAuth(data.session));
  supabase.auth.onAuthStateChange((_event,session)=>{currentSession=session;updateAccountButton();});
});
