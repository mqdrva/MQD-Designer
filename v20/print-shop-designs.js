import {requestShopSignIn} from './print-shop-email-login.js';
import {designCall,shopDesignAuth,customerDesignLink} from './print-shop-design-auth.js';
const $=id=>document.getElementById(id);
const say=value=>$('designStatus').textContent=value;
const params=new URLSearchParams(location.search);
function editorLink(shop,id){const u=new URL('/shops/'+shop.slug+($('designEngine').value==='3d'?'/3d':''),location.origin);u.searchParams.set('shopOwner','1');u.searchParams.set('businessId',shop.id);if(id)u.searchParams.set('designId',id);return u.href;}
async function load(){
 const {shops}=await designCall({action:'shops'},{owner:true});
 $('designLogin').hidden=true;$('designWorkspace').hidden=false;
 $('designShop').replaceChildren(...shops.map(s=>new Option(s.name,s.id)));
 if(shops.some(s=>s.id===params.get('businessId')))$('designShop').value=params.get('businessId');
 if(!shops.length){say('No Print Shop is linked to this verified email. Sign in with the email used for your shop setup.');return;}
 async function refresh(){
  const shop=shops.find(s=>s.id===$('designShop').value);
  $('manageShop').hidden=false;$('manageShop').href='/print-shop-setup.html?accountShop='+encodeURIComponent(shop.id);
  $('designEngine').replaceChildren(...shop.engines.map(e=>new Option(e.toUpperCase(),e)));
  const result=await designCall({action:'list',businessId:shop.id},{owner:true});
  $('savedDesigns').replaceChildren();
  for(const design of result.designs){
   const card=document.createElement('section');card.className='card';
   const title=document.createElement('h2');title.textContent=design.title;
   const note=document.createElement('p');note.textContent=design.engine.toUpperCase()+' · '+design.product_id+' · '+(design.locked?'View only':'Customer edits a copy');
   const edit=document.createElement('a');edit.className='btn';edit.textContent='Open saved design';const u=new URL('/shops/'+shop.slug+(design.engine==='3d'?'/3d':''),location.origin);u.search=new URLSearchParams({shopOwner:'1',businessId:shop.id,designId:design.id});edit.href=u.href;
   const label=document.createElement('label'),lock=document.createElement('input');lock.type='checkbox';lock.checked=design.locked;label.append(lock,' Lock design');
   const output=document.createElement('input');output.readOnly=true;output.setAttribute('aria-label','Customer design link');output.hidden=true;
   const link=document.createElement('button');link.className='btn';link.textContent='Get customer link';link.onclick=async()=>{try{const saved=await designCall({action:'owner-load',businessId:shop.id,id:design.id},{owner:true});output.value=customerDesignLink(shop,saved.design);output.hidden=false;output.select();say('Customer link ready. Share it directly; no email was sent.');}catch(e){say(e.message);}};
   lock.onchange=async()=>{lock.disabled=true;try{const saved=await designCall({action:'lock',businessId:shop.id,id:design.id,revision:design.revision,locked:lock.checked},{owner:true});Object.assign(design,saved.design);note.textContent=design.engine.toUpperCase()+' · '+design.product_id+' · '+(design.locked?'View only':'Customer edits a copy');say('Sharing permission saved. Your original artwork is unchanged.');}catch(e){lock.checked=design.locked;say(e.message);}finally{lock.disabled=false;}};
   card.append(title,note,edit,label,link,output);$('savedDesigns').append(card);
  }
  $('newShopDesign').onclick=()=>location.assign(editorLink(shop));
  say(result.designs.length?'Choose a saved design or create another.':'Create your first customer design. Saving it gives you a private customer link.');
 }
 $('designShop').onchange=()=>refresh().catch(e=>say(e.message));await refresh();
}
let emailLinkBusy=false,emailLinkTimer;
$('designLogin').onsubmit=async e=>{
 e.preventDefault();if(emailLinkBusy||!$('designEmail').reportValidity())return;
 const button=$('designEmailLink');emailLinkBusy=true;button.disabled=true;say('Sending your secure sign-in link…');
 try{await requestShopSignIn(shopDesignAuth,$('designEmail').value,location.origin);say('Check your inbox and spam folder for your sign-in link. Open it in this same browser on this device. You can request another link in one minute.');emailLinkTimer=setTimeout(()=>{emailLinkBusy=false;button.disabled=false;},60000);}
 catch(error){say(error.message);emailLinkBusy=false;button.disabled=false;}
};
$('designPasswordSignIn').onclick=async()=>{if(!$('designEmail').reportValidity())return;const button=$('designPasswordSignIn');if(!$('designPassword').value){say('Enter your existing password, or choose Email me a sign-in link.');return;}button.disabled=true;try{const {error}=await shopDesignAuth.auth.signInWithPassword({email:$('designEmail').value.trim(),password:$('designPassword').value});$('designPassword').value='';if(error)throw new Error('Sign-in failed. Use your shop-owner account or request an email sign-in link.');await load();}catch(error){say(error.message);}finally{button.disabled=false;}};
$('designGoogle').onclick=async()=>{const {error}=await shopDesignAuth.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/print-shop-designs.html',queryParams:{prompt:'select_account'}}});if(error)say(error.message);};
$('designLogout').onclick=async()=>{await shopDesignAuth.auth.signOut();$('savedDesigns').replaceChildren();$('designWorkspace').hidden=true;$('designLogin').hidden=false;say('Signed out.');};
try{const {data,error}=await shopDesignAuth.auth.getSession();if(error||params.has('error')||new URLSearchParams((location.hash||'').slice(1)).has('error')||!data.session&&params.has('code'))say('This sign-in link could not be used. Request a new link and open it in the same browser where you requested it.');else if(data.session)await load();}catch(error){say(error.message||'Sign-in could not finish. Request a new email link.');}
