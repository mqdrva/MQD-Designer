import {designCall,shopDesignAuth,customerDesignLink} from './print-shop-design-auth.js';
const params=new URLSearchParams(location.search);
const fragment=new URLSearchParams(location.hash.slice(1));
const id=params.get('design');
// The capability stays out of HTTP URLs, analytics, referrers and server logs.
const token=fragment.get('view');
export const sharingRequested=!!id;
export const shopOwnerRequested=params.get('shopOwner')==='1';
let record=null,ownerDesign=null,businessId=params.get('businessId');
const panel=()=>{const s=document.createElement('section');s.className='shop-design-toolbar';s.setAttribute('aria-label','Saved customer design');document.querySelector('.shop-intro').after(s);return s;};
export async function loadSharedShopDesign(slug,engine){
 if(shopOwnerRequested||params.has('setupPreview'))throw new Error('Use the customer design link exactly as supplied by your shop.');
 const result=await designCall({action:'shared-load',id,token});
 if(result.shop.slug!==slug||result.design.engine!==engine)throw new Error('Open the exact customer design link supplied by your shop.');
 record=result.design;
 return result;
}
export async function loadOwnerShopDesign(slug,engine){
 const {data:{session}}=await shopDesignAuth.auth.getSession();
 if(!session){location.replace('/print-shop-designs.html?businessId='+encodeURIComponent(businessId||''));throw new Error('Opening Print Shop owner sign-in.');}
 const designId=params.get('designId');
 const result=await designCall({action:designId?'owner-load':'list',businessId,...(designId?{id:designId}:{})},{owner:true});
 if(result.shop.slug!==slug||designId&&result.design.engine!==engine)throw new Error('Open this design from your Print Shop workspace.');
 ownerDesign=result.design||null;return result;
}
export function sharedSubmission(){return record?{sharedDesign:{id,token,revision:record.revision}}:{};}
function lockViewer(){
 document.body.dataset.sharedLocked='true';
 // Keep zone switching, camera rotation, zoom and mobile navigation available.
 // Block mutation events before any editor listeners run, including keyboard,
 // drop, file-upload, text-input and touch interactions on the flat canvas.
 const permitted=target=>target instanceof Element&&!!target.closest('a,#zoneRail,#views,#webgl,#zoomIn,#zoomOut,#gridToggle,#saveScreenshot,#downloadPreview,[data-mobile-pane="preview"],[data-mobile-pane="canvas"],.mobile-studio-menu > summary');
 const block=event=>{if(!permitted(event.target)){if(!['pointerdown','touchstart'].includes(event.type))event.preventDefault();event.stopImmediatePropagation();}};
 for(const type of ['click','input','change','keydown','pointerdown','touchstart','drop','dragstart'])document.addEventListener(type,block,{capture:true,passive:false});
 const disable=()=>{for(const el of document.querySelectorAll('button,input,select,textarea'))if(!permitted(el)&&!el.disabled)el.disabled=true;};
 disable();new MutationObserver(disable).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
}
export async function mountSharedShopDesign({loadPackage}){
 if(!record)return;
 const blob=await designCall({action:'shared-package',id,token,revision:record.revision},{binary:true});
 await loadPackage(new File([blob],'saved-design.zip',{type:'application/zip'}),{waitForArtwork:true});
 document.getElementById('shopSwitch').hidden=true;
 const notice=panel(),title=document.createElement('strong'),p=document.createElement('p');title.textContent=record.title;
 p.textContent=record.locked?'Locked design · View only. Contact your shop about changes, sizes, pricing or an invoice.':'Edit your own copy. Your changes will not replace the shop’s original. Save your ZIP or send an unpaid request to the shop when ready.';
 notice.append(title,p);
 if(record.locked){document.getElementById('saveDraft').hidden=true;document.getElementById('shopLoad').closest('label').hidden=true;lockViewer();}
}
export async function mountShopOwnerDesign({shop,engine,loadPackage,buildPackage}){
 if(ownerDesign){
  const blob=await designCall({action:'owner-package',businessId,id:ownerDesign.id,revision:ownerDesign.revision},{owner:true,binary:true});
  await loadPackage(new File([blob],'saved-design.zip',{type:'application/zip'}),{waitForArtwork:true});
 }
 document.getElementById('shopSwitch').hidden=true;
 const bar=panel();const back=document.createElement('a');back.href='/print-shop-designs.html?businessId='+encodeURIComponent(businessId);back.textContent='All customer designs';
 const label=document.createElement('label'),name=document.createElement('input');name.maxLength=100;name.value=ownerDesign?.title||'';label.append('Customer design title',name);
 const lockLabel=document.createElement('label'),lock=document.createElement('input');lock.type='checkbox';lock.checked=ownerDesign?.locked??true;lockLabel.append(lock,' Lock design — customer can view only');
 const note=document.createElement('p');note.textContent='When unlocked, customers edit independent copies. Saving changes the design opened by this customer link. It does not send an email or collect payment.';
 const save=document.createElement('button');save.type='button';save.className='btn primary';save.textContent='Save design and get customer link';
 const output=document.createElement('input');output.readOnly=true;output.setAttribute('aria-label','Customer design link');output.hidden=!ownerDesign;if(ownerDesign)output.value=customerDesignLink(shop,ownerDesign);
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 save.onclick=async()=>{save.disabled=true;try{
  if(!name.value.trim())throw new Error('Enter a customer design title.');
  const packet=await buildPackage(message=>status.textContent=message);
  const result=await designCall({action:'save',businessId,id:ownerDesign?.id||crypto.randomUUID(),revision:ownerDesign?.revision||0,title:name.value.trim(),locked:lock.checked},{owner:true,file:packet.blob});ownerDesign=result.design;
  output.value=customerDesignLink(shop,ownerDesign);output.hidden=false;output.select();status.textContent='Saved. Customer link ready. No message or payment was sent.';
 }catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
 bar.append(back,label,lockLabel,note,save,output,status);
}
