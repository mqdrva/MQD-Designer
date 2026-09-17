import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

const SUPABASE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const GUEST_SUBMIT_URL=SUPABASE_URL+'/functions/v1/submit-mqd-guest-design';
const GUEST_CHECKOUT_URL=SUPABASE_URL+'/functions/v1/create-mqd-guest-checkout';
const TEST_CHECKOUT_URL=SUPABASE_URL+'/functions/v1/create-mqd-test-checkout';
const GUEST_TOKEN_KEY='mqd-guest-order-token';
const CHECKOUT_STATE_KEY='mqd-checkout-request';
const TEST_MODE=new URLSearchParams(location.search).get('mqdStripeTest')==='1';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

const PRICES={
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

let currentSession=null;
let sessionResolved=false;
let passThroughAddOnce=false;
let addBusy=false;
let checkoutBusy=false;
const sessionReady=supabase.auth.getSession().then(({data})=>{
  currentSession=data.session||null;
  sessionResolved=true;
  return currentSession;
}).catch(()=>{sessionResolved=true;return null;});
supabase.auth.onAuthStateChange((_event,session)=>{currentSession=session||null;sessionResolved=true;});

function hasGoogleIdentity(user){
  const providers=Array.isArray(user?.app_metadata?.providers)?user.app_metadata.providers.map(String):[];
  if(user?.app_metadata?.provider)providers.push(String(user.app_metadata.provider));
  return providers.includes('google');
}
function isOwnerAdmin(user){return user?.app_metadata?.role==='admin';}
function guestToken(){
  let token=localStorage.getItem(GUEST_TOKEN_KEY)||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)){
    token=crypto.randomUUID();
    localStorage.setItem(GUEST_TOKEN_KEY,token);
  }
  return token;
}
function cartItems(){
  try{const items=JSON.parse(localStorage.getItem('mqd-cart')||'[]');return Array.isArray(items)?items:[];}catch{return[];}
}
function writeCart(items){
  localStorage.setItem('mqd-cart',JSON.stringify(items));
  localStorage.removeItem(CHECKOUT_STATE_KEY);
  updateCartButton(items);
}
function updateCartButton(items=cartItems()){
  const button=document.getElementById('cartButton');
  if(button)button.textContent='Cart ('+items.reduce((sum,item)=>sum+(Number(item.totalQuantity)||1),0)+')';
}
function priceFor(id,fallback=0){return Object.prototype.hasOwnProperty.call(PRICES,id)?PRICES[id]:Number(fallback)||0;}
function sizesForProduct(id){if(NO_SIZE_PRODUCTS.has(id))return[];return id==='shorts'?SHORTS_SIZES:STANDARD_SIZES;}
function selectedOrderOptions(){
  const productId=document.getElementById('productSelect')?.value||'';
  const sized=sizesForProduct(productId).length>0;
  const rows=[...document.querySelectorAll('#orderOptionRows .order-option-row')];
  const options=rows.map(row=>({
    size:row.querySelector('.order-size')?.value||null,
    quantity:Math.max(1,Math.min(99,Number(row.querySelector('.order-qty')?.value)||1))
  }));
  if(!options.length)throw new Error('Add at least one quantity.');
  if(sized){
    const seen=new Set();
    for(const item of options){
      if(!item.size)throw new Error('Choose a size for each row.');
      if(seen.has(item.size))throw new Error('Each size only needs one row. Increase its quantity instead.');
      seen.add(item.size);
    }
  }
  return options;
}
function blobFromDataUrl(src){return fetch(src).then(response=>response.blob());}
function mockupBlob(){
  return new Promise(resolve=>{
    const src=document.getElementById('webgl');
    if(!src)return resolve(null);
    const out=document.createElement('canvas');out.width=src.width;out.height=src.height;
    const context=out.getContext('2d');context.fillStyle='#F7F7F7';context.fillRect(0,0,out.width,out.height);context.drawImage(src,0,0);
    out.toBlob(resolve,'image/png');
  });
}
async function buildGuestSubmission(payload){
  const form=new FormData();
  for(const [zone,state] of Object.entries(payload.design?.zones||{})){
    for(const layer of state.layers||[]){
      if(layer.type!=='image'||layer.libraryAssetId||!layer.src)continue;
      const filename=layer.filename||'artwork.png';
      const blob=await blobFromDataUrl(layer.src);
      form.append('asset',blob,filename);
      form.append('assetMeta',JSON.stringify({zone,layerId:layer.id,label:layer.label,x:layer.x||0,y:layer.y||0,scale:layer.scale||1,rotation:layer.rotation||0,visible:layer.visible!==false}));
    }
  }
  const mockup=await mockupBlob();
  if(mockup)form.append('mockup',mockup,(payload.product?.id||'product')+'-mockup.png');
  const clean=structuredClone(payload);
  delete clean.designId;
  if(TEST_MODE)clean.mqdSandboxTest=true;
  form.append('payload',JSON.stringify(clean,(key,value)=>key==='src'||key==='image'?undefined:value));
  form.append('guestToken',guestToken());
  return form;
}
async function addGuestToCart(button){
  if(addBusy)return;
  addBusy=true;
  const original=button.textContent;
  button.disabled=true;button.textContent='Adding…';
  try{
    if(!window.MQDDesigner?.exportDesign)throw new Error('The designer is still loading. Please try again.');
    const options=selectedOrderOptions();
    const payload=window.MQDDesigner.exportDesign();
    if(!payload?.product?.id||!payload?.design?.zones)throw new Error('The current design could not be read.');
    payload.product.price=priceFor(payload.product.id,payload.product.price);
    payload.orderOptions=options;
    payload.totalQuantity=options.reduce((sum,item)=>sum+item.quantity,0);
    const form=await buildGuestSubmission(payload);
    const response=await window.fetch(GUEST_SUBMIT_URL,{method:'POST',headers:{apikey:SUPABASE_PUBLISHABLE_KEY},body:form});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok||!result.orderNumber){
      const detail=[result.error||result.message,result.stage&&`stage: ${result.stage}`].filter(Boolean).join(' · ');
      throw new Error(detail||`Guest order submission failed (${response.status})`);
    }
    const items=cartItems();
    items.push({
      designId:null,
      orderNumber:result.orderNumber,
      productId:payload.product.id,
      productName:payload.product.name,
      price:priceFor(payload.product.id,payload.product.price),
      orderOptions:options,
      totalQuantity:payload.totalQuantity,
      addedAt:new Date().toISOString(),
      pendingSync:false,
      guest:true,
      sandboxTest:TEST_MODE,
      draftKey:null,
      backendError:''
    });
    writeCart(items);
    button.textContent='Added ✓';
    setTimeout(()=>{if(!button.disabled)button.textContent=original;},1200);
  }catch(error){
    console.error('MQD guest add-to-cart failed',error);
    button.textContent=original;
    alert('Could not add this design to the cart: '+(error?.message||String(error)));
  }finally{
    button.disabled=false;
    if(button.textContent==='Adding…')button.textContent=original;
  }
}
function checkoutFailureMessage(result,status){
  const detail=String(result?.error||'');
  const reference=detail.match(/\bReference:\s*([0-9a-f-]{36})/i)?.[1]||'';
  const pendingApproval=status===503||/Checkout failed at stripe-session/i.test(detail);
  const base=TEST_MODE
    ?'Stripe sandbox checkout could not open. Your test cart is safe on this device. Please try again.'
    :pendingApproval
      ?'Payments are temporarily unavailable while Stripe completes account approval. Your cart is safe on this device. Please try again later.'
      :'Secure checkout could not open. Your cart is safe on this device. Please try again later.';
  return reference?`${base}\n\nSupport reference: ${reference}`:base;
}
async function runGuestCheckout(button){
  if(checkoutBusy)return;
  checkoutBusy=true;
  const cartButton=document.getElementById('cartButton');
  const original=button.textContent;
  button.disabled=true;button.textContent=TEST_MODE?'Opening sandbox…':'Opening checkout…';
  if(cartButton)cartButton.disabled=true;
  try{
    const items=cartItems();
    if(!items.length)throw new Error('Your cart is empty.');
    if(items.some(item=>item.pendingSync))throw new Error('One or more older cart items still need to sync. Remove and re-add those items, then try checkout again.');
    if(items.some(item=>!/^MQD-[A-Z0-9]{6,20}$/.test(String(item.orderNumber||''))))throw new Error('One or more cart items need to be re-added before checkout.');
    if(TEST_MODE&&items.some(item=>item.sandboxTest!==true))throw new Error('Your cart contains regular checkout items. Clear the cart and add a fresh test item while the SANDBOX TEST banner is visible.');
    if(!TEST_MODE&&items.some(item=>item.sandboxTest===true))throw new Error('Your cart contains a Stripe sandbox test item. Remove it before using live checkout.');
    const signature=items.map(item=>item.orderNumber).sort().join('|');
    let state={};
    try{state=JSON.parse(localStorage.getItem(CHECKOUT_STATE_KEY)||'{}');}catch{}
    if(state.signature!==signature||!/^[0-9a-f-]{36}$/i.test(String(state.token||''))){
      state={signature,token:crypto.randomUUID()};
      localStorage.setItem(CHECKOUT_STATE_KEY,JSON.stringify(state));
    }
    const session=(await supabase.auth.getSession()).data.session||currentSession;
    if(TEST_MODE&&(!session?.access_token||!isOwnerAdmin(session.user))){
      throw new Error('Owner admin sign-in is required for the Stripe sandbox test. Sign in at /owner in this browser, then return to this test page.');
    }
    const headers={apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'};
    if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
    const response=await fetch(TEST_MODE?TEST_CHECKOUT_URL:GUEST_CHECKOUT_URL,{
      method:'POST',headers,
      body:JSON.stringify({orderNumbers:items.map(item=>item.orderNumber),checkoutToken:state.token,guestToken:guestToken()})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.url||(TEST_MODE&&result.test!==true)){alert(checkoutFailureMessage(result,response.status));return;}
    window.location.assign(result.url);
  }catch(error){
    console.error(TEST_MODE?'MQD sandbox checkout failed':'MQD guest checkout failed',error);
    alert(error?.message||(TEST_MODE?'Stripe sandbox checkout could not connect.':'Secure checkout could not connect. Your cart is safe on this device.'));
  }finally{
    button.disabled=false;button.textContent=original;
    if(cartButton)cartButton.disabled=false;
    updateCartButton();
    checkoutBusy=false;
  }
}
function showTestModeUI(){
  if(!TEST_MODE||document.getElementById('mqdStripeTestBanner'))return;
  const banner=document.createElement('div');
  banner.id='mqdStripeTestBanner';
  banner.setAttribute('role','status');
  banner.textContent='STRIPE SANDBOX TEST — no real payment will be charged. Test orders are temporary.';
  Object.assign(banner.style,{position:'sticky',top:'0',zIndex:'99999',padding:'10px 16px',textAlign:'center',fontWeight:'800',fontFamily:'Inter,system-ui,sans-serif',background:'#fff3cd',color:'#5f4300',borderBottom:'1px solid #e6c76a'});
  document.body.prepend(banner);
  const checkout=document.getElementById('checkoutCart');
  if(checkout)checkout.textContent='Sandbox Checkout';
}

// Capture before the legacy account-only customer handlers. Signed-in Google
// customers keep the existing account flow; guests use the secure token flow.
// The owner-only mqdStripeTest=1 route deliberately forces the guest path so
// the production guest checkout can be tested against Stripe sandbox safely.
document.addEventListener('click',event=>{
  const addButton=event.target.closest?.('#addToCart');
  if(addButton){
    if(TEST_MODE){
      event.preventDefault();event.stopImmediatePropagation();
      void addGuestToCart(addButton);
      return;
    }
    if(passThroughAddOnce){passThroughAddOnce=false;return;}
    if(!sessionResolved){
      event.preventDefault();event.stopImmediatePropagation();
      sessionReady.then(()=>{
        if(hasGoogleIdentity(currentSession?.user)){passThroughAddOnce=true;addButton.click();}
        else addGuestToCart(addButton);
      });
      return;
    }
    if(hasGoogleIdentity(currentSession?.user))return;
    event.preventDefault();event.stopImmediatePropagation();
    void addGuestToCart(addButton);
    return;
  }

  const checkoutButton=event.target.closest?.('#checkoutCart');
  if(checkoutButton){
    const items=cartItems();
    if(TEST_MODE){
      event.preventDefault();event.stopImmediatePropagation();
      void runGuestCheckout(checkoutButton);
      return;
    }
    if(!items.some(item=>item.guest===true))return;
    event.preventDefault();event.stopImmediatePropagation();
    void runGuestCheckout(checkoutButton);
  }
},true);

if(TEST_MODE){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',showTestModeUI,{once:true});
  else showTestModeUI();
}
window.MQDGuestCheckout={enabled:true,testMode:TEST_MODE};
