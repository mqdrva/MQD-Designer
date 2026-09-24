import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
import {shippingCentsForQuantity} from './checkout-pricing.js';

const $=id=>document.getElementById(id);
const SUPABASE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const SUBMIT_URL=SUPABASE_URL+'/functions/v1/submit-mqd-design';
const LIBRARY_URL=SUPABASE_URL+'/functions/v1/mqd-artwork-library';
function authRedirectUrl(){return window.location.origin+window.location.pathname;}
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let currentSession=null;
let activeCloudDesign=null;
let pendingAfterAuth=null;
let currentDesignFilter='all';
let accountDesigns=[];
let libraryAssets=[];
let libraryContext=null;
const libraryZoneCache=new Map();
const CHECKOUT_URL=SUPABASE_URL+'/functions/v1/create-mqd-checkout';
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
    quantity:Math.max(1,Math.min(99,Number(row.querySelector('.order-qty')?.value)||1))
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
  const qty=document.createElement('input');qty.className='order-qty';qty.type='number';qty.min='1';qty.max='99';qty.step='1';qty.value=String(Math.max(1,Math.min(99,quantity||1)));
  qty.addEventListener('change',()=>{qty.value=String(Math.max(1,Math.min(99,Number(qty.value)||1)));});
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
function isGuestUser(user=accountUser()){return !!user?.is_anonymous;}
function isPermanentUser(user=accountUser()){return !!user&&!isGuestUser(user);}
function openAuth(reason='Sign in to save designs across devices, or continue as a guest to purchase without an account.',after=null){
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
  button.textContent=isPermanentUser()?'My Account':isGuestUser()?'Guest':'Sign In';
}
function requireAccount(reason,after){
  if(accountUser())return true;
  openAuth(reason,after);return false;
}
function requirePermanentAccount(reason,after){
  if(isPermanentUser())return true;
  openAuth(reason,after);return false;
}
async function libraryRequest(body){
  const response=await fetch(LIBRARY_URL,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Artwork library request failed (${response.status})`);return result;
}
async function libraryAssetsForZone(productId,zone){
  const key=productId+'::'+zone;
  if(libraryZoneCache.has(key))return libraryZoneCache.get(key);
  const pending=libraryRequest({action:'catalog',productId,zone}).then(result=>result.assets||[]).catch(error=>{libraryZoneCache.delete(key);throw error;});
  libraryZoneCache.set(key,pending);return pending;
}
async function assetForZone(assetId,productId,zone){
  const assets=await libraryAssetsForZone(productId,zone);
  return assets.find(row=>row.id===assetId)||null;
}
async function lockedAssetForZone(assetId,productId,zone){
  const asset=await assetForZone(assetId,productId,zone);
  return asset?.placementMode==='locked'?asset:null;
}
window.MQDArtworkLibrary={...(window.MQDArtworkLibrary||{}),assetForZone,lockedAssetForZone};
function filteredLibraryAssets(){
  const query=($('artworkLibrarySearch')?.value||'').trim().toLowerCase(),category=$('artworkLibraryCategory')?.value||'all';
  return libraryAssets.filter(asset=>(category==='all'||asset.category===category)&&(!query||`${asset.name} ${asset.category}`.toLowerCase().includes(query)));
}
function renderArtworkLibrary(){
  const grid=$('artworkLibraryGrid'),rows=filteredLibraryAssets();if(!grid)return;grid.innerHTML='';$('artworkLibraryEmpty')?.classList.toggle('hidden',rows.length>0);
  for(const asset of rows){const button=document.createElement('button');button.type='button';button.className='library-item';button.dataset.assetId=asset.id;button.innerHTML=`<img src="${escapeHtml(asset.renderUrl)}" alt="${escapeHtml(asset.name)}"><strong>${escapeHtml(asset.name)}</strong><span class="${asset.placementMode==='locked'?'locked':''}">${asset.placementMode==='locked'?'Locked placement':'Move and resize'}</span>`;grid.appendChild(button);}
}
async function openArtworkLibrary(){
  const context=window.MQDDesigner?.getContext?.();if(!context)throw new Error('The designer is still loading. Please try again.');libraryContext=context;
  $('artworkLibraryContext').textContent=`Choose artwork for ${context.productName} · ${context.zone}`;$('artworkLibraryOverlay').classList.remove('hidden');$('artworkLibraryLoading').classList.remove('hidden');$('artworkLibraryGrid').innerHTML='';$('artworkLibraryEmpty').classList.add('hidden');
  try{libraryAssets=await libraryAssetsForZone(context.productId,context.zone);renderArtworkLibrary();}
  catch(error){console.error(error);$('artworkLibraryEmpty').textContent='Could not load the artwork library: '+error.message;$('artworkLibraryEmpty').classList.remove('hidden');}
  finally{$('artworkLibraryLoading').classList.add('hidden');}
}
function closeArtworkLibrary(){$('artworkLibraryOverlay')?.classList.add('hidden');}
async function hydrateLibraryArtwork(payload){
  const copy=payload;
  for(const [zone,state] of Object.entries(copy.design?.zones||{})){
    const layers=(state.layers||[]).filter(layer=>layer.type==='image'&&layer.libraryAssetId);if(!layers.length)continue;
    const assets=await libraryAssetsForZone(copy.product?.id,zone);const byId=new Map(assets.map(asset=>[asset.id,asset]));
    for(const layer of layers){const asset=byId.get(layer.libraryAssetId);if(!asset)throw new Error(`MQD library artwork is no longer available for ${zone}.`);layer.src=asset.renderUrl;layer.libraryLocked=asset.placementMode==='locked';layer.libraryPreset=asset.placementPreset||layer.libraryPreset||'full';layer.libraryStackOrder=Number(asset.stackOrder)||layer.libraryStackOrder||0;layer.libraryPlacements=asset.placements||layer.libraryPlacements||{};}
  }
  return copy;
}
function fileExtension(blob,filename=''){
  const fromName=filename.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if(fromName)return fromName==='jpeg'?'jpg':fromName;
  return({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'})[blob.type]||'bin';
}
function safePathPart(value){return String(value||'artwork').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100);}
async function uploadCustomerArtwork(path,blob){
  const {data,error}=await supabase.auth.getSession();if(error||!data.session)throw new Error('Please sign in before saving.');
  const form=new FormData();form.append('path',path);form.append('file',blob,path.split('/').at(-1));
  const response=await fetch(SUPABASE_URL+'/functions/v1/mqd-save-artwork',{method:'POST',headers:{Authorization:`Bearer ${data.session.access_token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:form});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Artwork upload failed.');
}
function designColors(payload){
  return Object.fromEntries(Object.entries(payload.design?.zones||{}).map(([zone,state])=>[zone,String(state?.background||'#FFFFFF').toUpperCase()]));
}
async function prepareCloudPayload(payload,designId,userId){
  const cloud=structuredClone(payload);
  for(const [zone,state] of Object.entries(cloud.design?.zones||{})){
    for(const layer of state.layers||[]){
      delete layer.image;
      if(layer.type!=='image')continue;
      if(layer.libraryAssetId){delete layer.src;delete layer.storagePath;continue;}
      if(layer.storagePath){delete layer.src;continue;}
      if(!layer.src)continue;
      const blob=await dataUrlToBlob(layer.src);
      const baseName=safePathPart((layer.originalFilename||layer.filename||'artwork').replace(/\.[^.]+$/,''))||'artwork';
      const processed=layer.backgroundRemoved===true;
      const ext=processed?'png':fileExtension(blob,layer.filename);
      const path=`${userId}/designs/${designId}/${safePathPart(zone)}/${safePathPart(layer.id)}-${baseName}${processed?'-no-background':''}.${ext}`;
      await uploadCustomerArtwork(path,blob);
      layer.storagePath=path;
      if(processed&&!layer.originalStoragePath){
        const original=await originalArtworkBlob(layer.originalFilename||layer.filename);
        if(original){
          const originalExt=fileExtension(original,layer.originalFilename||layer.filename);
          const originalPath=`${userId}/designs/${designId}/${safePathPart(zone)}/${safePathPart(layer.id)}-${baseName}-original.${originalExt}`;
          await uploadCustomerArtwork(originalPath,original);
          layer.originalStoragePath=originalPath;
        }
      }
      delete layer.src;
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
    await uploadCustomerArtwork(previewPath,preview);
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

async function saveCartCloudDesign(payload,designId,{preview=null}={}){
  const user=accountUser();if(!user)throw new Error('Please sign in first.');
  const cloudPayload=await prepareCloudPayload(payload,designId,user.id);
  let previewPath=null;
  if(preview){
    previewPath=`${user.id}/designs/${designId}/preview.png`;
    await uploadCustomerArtwork(previewPath,preview);
  }
  const record={
    id:designId,user_id:user.id,product_id:String(payload.product?.id||''),product_name:String(payload.product?.name||'Custom design'),
    name:`${payload.product?.name||'Custom design'} — ${new Date().toLocaleDateString()}`,
    status:'draft',design_json:cloudPayload,preview_path:previewPath,zone_colors:designColors(payload),
    parent_design_id:null,version:1,updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from('customer_designs').upsert(record,{onConflict:'id'}).select('id').single();
  if(error)throw new Error(error.message);
  return data;
}

async function saveDraft(){
  if(!requirePermanentAccount('Continue with Google or Email to save this design and reopen it from any device.',saveDraft))return;
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
function saveCart(items){
  localStorage.setItem('mqd-cart',JSON.stringify(items));
  localStorage.removeItem('mqd-checkout-request');
}
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
      if(layer.type!=='image'||layer.libraryAssetId||!layer.src) continue;
      const filename=layer.filename||'artwork.png';
      const baseMeta={zone,layerId:layer.id,label:layer.label,x:layer.x||0,y:layer.y||0,scale:layer.scale||1,rotation:layer.rotation||0,visible:layer.visible!==false};
      if(layer.backgroundRemoved===true){
        const processed=await dataUrlToBlob(layer.src);
        const processedName=layer.backgroundRemovedFilename||((layer.originalFilename||filename).replace(/\.[^.]+$/,'')+'-no-background.png');
        form.append('asset',processed,processedName);
        form.append('assetMeta',JSON.stringify({...baseMeta,kind:'background-removed',sourceFilename:layer.originalFilename||filename,provider:layer.backgroundRemovalProvider||'photoroom'}));
        let original=retry?null:await originalArtworkBlob(layer.originalFilename||filename);
        if(!original&&layer.backgroundOriginalSrc)original=await dataUrlToBlob(layer.backgroundOriginalSrc);
        if(original){
          form.append('asset',original,layer.originalFilename||filename);
          form.append('assetMeta',JSON.stringify({...baseMeta,kind:'original-source',processedFilename:processedName}));
        }
      }else{
        const original=retry?null:await originalArtworkBlob(filename);
        const blob=original||await dataUrlToBlob(layer.src);
        form.append('asset',blob,filename);
        form.append('assetMeta',JSON.stringify({...baseMeta,kind:'artwork'}));
      }
    }
  }
  if(!retry)mockup=await mockupBlob();
  if(mockup) form.append('mockup',mockup,(payload.product?.id||'product')+'-mockup.png');
  form.append('payload',JSON.stringify(clean,(k,v)=>k==='src'||k==='image'||k==='backgroundOriginalSrc'?undefined:v));
  const response=await fetch(SUBMIT_URL,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY},body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok){
    const detail=[result.error||result.message,result.stage&&`stage: ${result.stage}`,result.code&&`code: ${result.code}`].filter(Boolean).join(' · ');
    throw new Error(detail||`Design submission failed (${response.status})`);
  }
  return result;
}

const cartSyncJobs=new Map();

function patchCartItem(draftKey,patch){
  let changed=false;
  const items=cartItems().map(item=>{
    if(item.draftKey!==draftKey)return item;
    changed=true;
    return {...item,...patch};
  });
  if(!changed)return;
  saveCart(items);
  updateCartButton();
  if(!$('cartOverlay')?.classList.contains('hidden'))renderCart();
}

async function runCartSync(draftKey,payload){
  let localSaveError='';
  try{
    const preview=await mockupBlob();
    try{
      await savePayloadToDrafts(draftKey,payload);
    }catch(error){
      localSaveError=error?.message||String(error);
      console.warn('MQD local cart snapshot save skipped:',error);
    }
    await saveCartCloudDesign(payload,payload.designId,{preview});
    const result=await submitDesignToBackend(payload,{retry:true,mockup:preview});
    if(!result?.orderNumber||!result?.designId)throw new Error('The upload did not return an order reference.');
    patchCartItem(draftKey,{designId:result.designId,orderNumber:result.orderNumber,pendingSync:false,syncing:false,backendError:''});
  }catch(error){
    console.warn('MQD cart background sync deferred:',error);
    const message=error?.message||String(error);
    patchCartItem(draftKey,{pendingSync:true,syncing:false,backendError:localSaveError?message+' · Local backup: '+localSaveError:message});
  }finally{
    cartSyncJobs.delete(draftKey);
  }
}

function startCartSync(draftKey,payload){
  if(cartSyncJobs.has(draftKey))return cartSyncJobs.get(draftKey);
  const job=runCartSync(draftKey,structuredClone(payload));
  cartSyncJobs.set(draftKey,job);
  return job;
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

    const designId=crypto.randomUUID();
    const localId=crypto.randomUUID();
    const draftKey='cart:'+localId;
    payload.designId=designId;
    payload.orderOptions=selection.options;
    payload.totalQuantity=selection.options.reduce((n,x)=>n+x.quantity,0);

    const items=cartItems();
    items.push({
      designId,
      orderNumber:'LOCAL-'+localId.slice(0,8).toUpperCase(),
      productId:payload.product?.id,
      productName:payload.product?.name,
      price:priceFor(payload.product?.id,payload.product?.price),
      orderOptions:payload.orderOptions,
      totalQuantity:payload.totalQuantity,
      addedAt:new Date().toISOString(),
      pendingSync:true,
      syncing:true,
      draftKey,
      backendError:''
    });
    saveCart(items);
    updateCartButton();

    btn.textContent='Added ✓';
    setTimeout(()=>btn.textContent=old,1200);

    // Do the expensive uploads after the cart has already updated.
    startCartSync(draftKey,payload);
  }catch(err){
    console.error(err);btn.textContent=old;
    alert('Could not add this design to cart: '+err.message);
  }finally{
    btn.disabled=false;
  }
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
  for(const initial of cartItems().filter(x=>x.pendingSync)){
    const activeJob=cartSyncJobs.get(initial.draftKey);
    if(activeJob){
      await activeJob;
      const refreshed=cartItems().find(x=>x.draftKey===initial.draftKey);
      if(refreshed&&!refreshed.pendingSync)continue;
    }

    const item=cartItems().find(x=>x.draftKey===initial.draftKey);
    if(!item||!item.pendingSync)continue;

    patchCartItem(item.draftKey,{syncing:true,backendError:''});
    try{
      const stored=await loadCartDraft(item.draftKey);
      if(!stored?.design?.zones)throw new Error('The saved cart design could not be found on this device.');
      const payload=await hydrateLibraryArtwork(structuredClone(stored));
      payload.designId=item.designId||payload.designId||crypto.randomUUID();
      await saveCartCloudDesign(payload,payload.designId);
      const result=await submitDesignToBackend(payload,{retry:true,mockup:null});
      if(!result?.orderNumber||!result?.designId)throw new Error('The upload did not return an order reference.');
      patchCartItem(item.draftKey,{designId:result.designId,orderNumber:result.orderNumber,pendingSync:false,syncing:false,backendError:''});
    }catch(error){
      patchCartItem(item.draftKey,{pendingSync:true,syncing:false,backendError:error?.message||String(error)});
    }
  }
}

function checkoutFailureMessage(result,status){
  const detail=String(result?.error||'');
  const reference=detail.match(/\bReference:\s*([0-9a-f-]{36})/i)?.[1]||'';
  const pendingApproval=status===503||/Checkout failed at stripe-session/i.test(detail);
  const message=pendingApproval
    ?'Payments are temporarily unavailable while Stripe completes account approval. Your cart and saved designs are safe. Please try again later.'
    :'Secure checkout could not open. Your cart and saved designs are safe. Please try again later.';
  return reference?`${message}\n\nSupport reference: ${reference}`:message;
}

async function showCart(){
  renderCart();
  $('cartOverlay')?.classList.remove('hidden');
}

function closeCart(){
  $('cartOverlay')?.classList.add('hidden');
}

function cartTotals(items=cartItems()){
  const quantity=items.reduce((sum,item)=>sum+(Number(item.totalQuantity)||1),0);
  const subtotal=items.reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.totalQuantity)||1),0);
  const shipping=items.length?shippingCentsForQuantity(quantity)/100:0;
  const shippingTier=quantity<=9?'1–9 items':quantity<=19?'10–19 items':'20+ items';
  return {quantity,subtotal,shipping,shippingTier,total:subtotal+shipping};
}

function renderCart(){
  const items=cartItems();
  const totals=cartTotals(items);
  const list=$('cartList'),empty=$('cartEmpty'),footer=$('cartFooter'),checkout=$('checkoutCart'),clear=$('clearCart');
  if(!list)return;
  list.innerHTML=items.map((item,index)=>{
    const quantity=Number(item.totalQuantity)||1;
    const options=(item.orderOptions||[]).map(option=>`<span>${escapeHtml(option.size||'Item')} × ${Number(option.quantity)||1}</span>`).join('');
    const syncState=item.syncing?'<div class="cart-sync pending">Syncing design…</div>':item.pendingSync?'<div class="cart-sync pending">Saved locally · sync required before checkout</div>':'<div class="cart-sync ready">Ready for checkout</div>';
    return `<article class="cart-item"><div class="cart-item-main"><div class="cart-item-heading"><h3>${escapeHtml(item.productName||'Custom product')}</h3><strong>$${((Number(item.price)||0)*quantity).toFixed(2)}</strong></div><div class="cart-item-options">${options||`<span>Quantity × ${quantity}</span>`}</div><div class="cart-reference">Ref: ${escapeHtml(item.orderNumber||'Pending')}</div>${syncState}</div><button class="btn danger cart-remove" type="button" data-cart-remove="${index}" aria-label="Remove ${escapeHtml(item.productName||'item')} from cart">Remove</button></article>`;
  }).join('');
  empty?.classList.toggle('hidden',items.length>0);
  footer?.classList.toggle('hidden',items.length===0);
  if($('cartItemCount'))$('cartItemCount').textContent=items.length?`${totals.quantity} ${totals.quantity===1?'item':'items'}`:'No items';
  if($('cartSubtotal'))$('cartSubtotal').textContent=`$${totals.subtotal.toFixed(2)}`;
  if($('cartShippingLabel'))$('cartShippingLabel').textContent=`Shipping (${totals.shippingTier})`;
  if($('cartShipping'))$('cartShipping').textContent=`$${totals.shipping.toFixed(2)}`;
  if($('cartTotal'))$('cartTotal').textContent=`$${totals.total.toFixed(2)}`;
  if(checkout){checkout.disabled=!items.length||cartSyncInProgress;checkout.textContent=items.some(item=>item.pendingSync)?'Sync & Checkout':'Secure Checkout';}
  if(clear)clear.disabled=!items.length||cartSyncInProgress;
}

function removeCartItem(index){
  const items=cartItems();
  if(index<0||index>=items.length)return;
  items.splice(index,1);
  saveCart(items);
  updateCartButton();
  renderCart();
}

function clearCart(){
  if(!cartItems().length)return;
  if(!confirm('Remove all items from your cart? Your saved designs will not be deleted.'))return;
  saveCart([]);
  updateCartButton();
  renderCart();
}

async function checkoutCart(){
  if(cartSyncInProgress)return;
  let items=cartItems();
  if(!items.length){renderCart();return;}
  if(items.some(item=>item.pendingSync)){
    if(!requireAccount('Sign in to sync your saved cart.',checkoutCart))return;
    cartSyncInProgress=true;
    renderCart();
    try{await retryPendingCart();}
    catch(error){alert('Could not sync your cart: '+error.message);return;}
    finally{cartSyncInProgress=false;updateCartButton();renderCart();}
    items=cartItems();
    if(items.some(item=>item.pendingSync)){
      const errors=items.filter(item=>item.pendingSync).map(item=>`${item.productName}: ${item.backendError||'Upload incomplete'}`).join('\n');
      alert('Could not finish syncing:\n'+errors+'\n\nYour cart and saved designs are retained. Try checkout again when the connection is available.');
      return;
    }
  }
  if(!requireAccount('Sign in before continuing to secure checkout.',checkoutCart))return;

  const signature=items.map(x=>x.orderNumber).sort().join('|');
  let checkoutState={};
  try{checkoutState=JSON.parse(localStorage.getItem('mqd-checkout-request')||'{}');}catch{}
  if(checkoutState.signature!==signature||!checkoutState.token){
    checkoutState={signature,token:crypto.randomUUID()};
    localStorage.setItem('mqd-checkout-request',JSON.stringify(checkoutState));
  }
  const button=$('checkoutCart'),cartButton=$('cartButton');
  button.disabled=true;button.textContent='Opening checkout…';
  cartButton.disabled=true;
  try{
    const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
    if(sessionError)throw sessionError;
    const token=sessionData.session?.access_token;
    if(!token){openAuth('Sign in before continuing to secure checkout.',checkoutCart);return;}
    const response=await fetch(CHECKOUT_URL,{
      method:'POST',
      headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({orderNumbers:items.map(x=>x.orderNumber),checkoutToken:checkoutState.token})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.url){alert(checkoutFailureMessage(result,response.status));return;}
    window.location.assign(result.url);
  }catch(error){
    console.error(error);
    alert('Secure checkout could not connect. Your cart and saved designs are safe. Check your internet connection and try again.');
  }finally{
    button.disabled=false;cartButton.disabled=false;updateCartButton();renderCart();
  }
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
      if(layer.type!=='image'||layer.libraryAssetId||!layer.storagePath)continue;
      const {data,error}=await supabase.storage.from('customer-artwork').download(layer.storagePath);
      if(error)throw new Error('Could not reopen artwork: '+error.message);
      layer.src=URL.createObjectURL(data);
      if(layer.backgroundRemoved===true&&layer.originalStoragePath){
        const {data:original,error:originalError}=await supabase.storage.from('customer-artwork').download(layer.originalStoragePath);
        if(!originalError&&original)layer.backgroundOriginalSrc=URL.createObjectURL(original);
      }
    }
  }
  return await hydrateLibraryArtwork(copy);
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
function designStoragePaths(row){
  const user=accountUser(),prefix=user?`${user.id}/designs/${row.id}/`:'';
  const paths=new Set();
  const add=path=>{if(path&&prefix&&String(path).startsWith(prefix))paths.add(String(path));};
  add(row.preview_path);
  for(const state of Object.values(row.design_json?.design?.zones||{})){
    for(const layer of state?.layers||[]){
      add(layer.storagePath);
      add(layer.originalStoragePath);
    }
  }
  return [...paths];
}
async function deleteCloudDesign(row){
  if(!row||row.status!=='draft')throw new Error('Only draft designs can be deleted. Purchased designs stay with your order history.');
  const user=accountUser();if(!user)throw new Error('Please sign in first.');
  const ok=confirm(`Delete “${row.name}”? This removes the draft from My Designs and cannot be undone.`);
  if(!ok)return false;

  const assetPaths=designStoragePaths(row);
  const {data,error}=await supabase.from('customer_designs')
    .delete()
    .eq('id',row.id)
    .eq('user_id',user.id)
    .eq('status','draft')
    .select('id');
  if(error)throw new Error(error.message);
  if(!data?.length)throw new Error('This draft could not be deleted. Refresh My Designs and try again.');

  if(assetPaths.length){
    const {error:storageError}=await supabase.storage.from('customer-artwork').remove(assetPaths);
    if(storageError)console.warn('Draft record deleted, but some stored artwork could not be cleaned up:',storageError.message);
  }

  if(activeCloudDesign?.id===row.id)activeCloudDesign=null;
  accountDesigns=accountDesigns.filter(x=>x.id!==row.id);
  const cart=cartItems(),nextCart=cart.filter(item=>item.designId!==row.id);
  if(nextCart.length!==cart.length){saveCart(nextCart);updateCartButton();}
  await renderDesigns();
  return true;
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
    item.innerHTML=`${url?`<img class="account-preview" src="${escapeHtml(url)}" alt="${escapeHtml(row.name)} preview">`:'<div class="account-preview placeholder">✦</div>'}<div><h3>${escapeHtml(row.name)}</h3><div class="account-meta">${escapeHtml(row.product_name)} · Version ${Number(row.version)||1}<br>${row.status==='purchased'?'Purchased':'Draft'} · Updated ${escapeHtml(formatDate(row.updated_at))}</div></div><div class="account-actions"><button class="btn" data-action="open" type="button">${row.status==='purchased'?'View / Edit':'Open'}</button><button class="btn" data-action="duplicate" type="button">Duplicate</button>${row.status==='purchased'?'<button class="btn orange" data-action="buy" type="button">Buy Again</button>':'<button class="btn danger" data-action="delete" type="button">Delete</button>'}</div>`;
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
  if(!requirePermanentAccount('Continue with Google or Email to view saved designs and orders from any device.',openCustomerAccount))return;
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

async function restoreAuthFromRedirect(){
  const url=new URL(window.location.href);
  const hash=new URLSearchParams(url.hash.replace(/^#/,''));
  const callbackError=url.searchParams.get('error_description')||hash.get('error_description')||url.searchParams.get('error')||hash.get('error');
  if(callbackError)console.warn('Supabase email sign-in callback error:',callbackError);

  let session=null;
  const accessToken=hash.get('access_token');
  const refreshToken=hash.get('refresh_token');

  // Explicitly persist implicit-flow magic-link tokens. This protects the
  // customer session even if automatic URL detection races the page startup.
  if(accessToken&&refreshToken){
    const {data,error}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
    if(error)console.warn('Could not persist email sign-in session:',error.message);
    else session=data.session;
  }

  // Also support a PKCE-style callback if Supabase returns an auth code.
  if(!session&&url.searchParams.get('code')){
    const {data,error}=await supabase.auth.exchangeCodeForSession(url.searchParams.get('code'));
    if(error)console.warn('Could not exchange email sign-in code:',error.message);
    else session=data.session;
  }

  if(!session){
    const {data,error}=await supabase.auth.getSession();
    if(error)throw error;
    session=data.session;
  }

  const hasAuthParams=accessToken||refreshToken||url.searchParams.has('code')||url.searchParams.has('error')||url.searchParams.has('error_description')||hash.has('error')||hash.has('error_description');
  if(hasAuthParams){
    url.hash='';
    ['code','error','error_code','error_description'].forEach(key=>url.searchParams.delete(key));
    history.replaceState({},document.title,url.pathname+(url.searchParams.toString()?('?'+url.searchParams.toString()):''));
  }

  return {session,callbackError};
}
async function signInWithEmail(event){
  event.preventDefault();
  const message=$('authMessage'),email=$('authEmail').value.trim();
  if(!email){message.textContent='Enter your email address.';message.className='account-message error';return;}
  message.textContent='Sending secure sign-in link…';message.className='account-message';
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:authRedirectUrl(),shouldCreateUser:true}});
  if(error){message.textContent=error.message;message.className='account-message error';return;}
  message.textContent='Check your email for the secure sign-in link. You can use Yahoo, Outlook, iCloud, Gmail, or another email provider.';message.className='account-message success';
}
async function signInWithGoogle(){
  const message=$('authMessage'),button=$('googleSignInButton');
  if(message){message.textContent='Opening Google sign-in…';message.className='account-message';}
  if(button)button.disabled=true;
  const {error}=await supabase.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:authRedirectUrl()}
  });
  if(error){
    if(message){message.textContent=error.message;message.className='account-message error';}
    if(button)button.disabled=false;
  }
}
async function continueAsGuest(){
  const message=$('authMessage'),button=$('guestSignInButton');
  if(message){message.textContent='Starting guest checkout session…';message.className='account-message';}
  if(button)button.disabled=true;
  const {data,error}=await supabase.auth.signInAnonymously();
  if(error){
    if(message){message.textContent=error.message;message.className='account-message error';}
    if(button)button.disabled=false;
    return;
  }
  if(message){message.textContent='Guest session ready.';message.className='account-message success';}
  await completeAuth(data.session);
}
async function signOut(){
  await supabase.auth.signOut();currentSession=null;activeCloudDesign=null;accountDesigns=[];saveCart([]);updateCartButton();updateAccountButton();$('customerOverlay').classList.add('hidden');closeCart();
}

window.MQDArtworkLibrary={open:openArtworkLibrary};
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
  $('openArtworkLibrary')?.addEventListener('click',()=>openArtworkLibrary().catch(error=>{console.error(error);alert(error.message);}));
  $('closeArtworkLibrary')?.addEventListener('click',closeArtworkLibrary);
  $('artworkLibraryOverlay')?.addEventListener('click',event=>{if(event.target===$('artworkLibraryOverlay'))closeArtworkLibrary();});
  $('artworkLibrarySearch')?.addEventListener('input',renderArtworkLibrary);
  $('artworkLibraryCategory')?.addEventListener('change',renderArtworkLibrary);
  $('artworkLibraryGrid')?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-asset-id]');if(!button)return;const asset=libraryAssets.find(row=>row.id===button.dataset.assetId);if(!asset)return;
    const current=window.MQDDesigner?.getContext?.();if(!current||current.productId!==libraryContext?.productId||current.zone!==libraryContext?.zone){alert('The garment area changed. Reopen the library for the currently selected area.');return;}
    button.disabled=true;try{await window.MQDDesigner.addLibraryAsset(asset);closeArtworkLibrary();}catch(error){console.error(error);alert(error.message);}finally{button.disabled=false;}
  });
  $('saveDraft')?.addEventListener('click',saveDraft);
  $('addToCart')?.addEventListener('click',addToCart);
  $('cartButton')?.addEventListener('click',showCart);
  $('closeCart')?.addEventListener('click',closeCart);
  $('cartOverlay')?.addEventListener('click',event=>{if(event.target===$('cartOverlay'))closeCart();});
  $('cartList')?.addEventListener('click',event=>{const button=event.target.closest('[data-cart-remove]');if(button)removeCartItem(Number(button.dataset.cartRemove));});
  $('clearCart')?.addEventListener('click',clearCart);
  $('checkoutCart')?.addEventListener('click',checkoutCart);
  $('accountButton')?.addEventListener('click',()=>isPermanentUser()?openCustomerAccount():openAuth(isGuestUser()?'You are shopping as a guest. Continue with Google or Email to save designs across devices.':'Sign in to save designs across devices, or continue as a guest to purchase without an account.'));
  $('closeAuth')?.addEventListener('click',closeAuth);
  $('authOverlay')?.addEventListener('click',e=>{if(e.target===$('authOverlay'))closeAuth();});
  $('authForm')?.addEventListener('submit',signInWithEmail);
  $('googleSignInButton')?.addEventListener('click',signInWithGoogle);
  $('guestSignInButton')?.addEventListener('click',continueAsGuest);
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
    try{if(button.dataset.action==='open')await openCloudDesign(row);else if(button.dataset.action==='duplicate')await duplicateCloudDesign(row);else if(button.dataset.action==='buy')await buyAgain(row);else if(button.dataset.action==='delete')await deleteCloudDesign(row);}catch(err){console.error(err);alert(err.message);}finally{button.disabled=false;}
  });
  $('ordersList')?.addEventListener('click',async e=>{
    const button=e.target.closest('[data-order-action="buy"]'),item=e.target.closest('.account-item');if(!button||!item?.dataset.designId)return;
    button.disabled=true;
    try{let row=accountDesigns.find(x=>x.id===item.dataset.designId);if(!row){const {data,error}=await supabase.from('customer_designs').select('*').eq('id',item.dataset.designId).single();if(error)throw error;row=data;}await buyAgain(row);}catch(err){console.error(err);alert(err.message);}finally{button.disabled=false;}
  });
  updateCartButton();
  restoreAuthFromRedirect().then(({session,callbackError})=>{
    completeAuth(session);
    if(callbackError&&!session){
      openAuth('That email sign-in link could not be completed. Request a new link and use the newest email.');
      const message=$('authMessage');
      if(message){message.textContent=callbackError;message.className='account-message error';}
    }
  }).catch(error=>{
    console.error('Auth restore failed',error);
    completeAuth(null);
  });
  supabase.auth.onAuthStateChange((_event,session)=>{currentSession=session;updateAccountButton();});
});
