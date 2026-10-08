import {halloweenActive,HALLOWEEN_START,HALLOWEEN_END,garmentPrice,BASE_CENTS} from './promotion-pricing.js';
const productPages={
 'custom-short-sleeve-shirts.html':'tshirt','custom-long-sleeve-shirts.html':'long-sleeve-tshirt',
 'custom-polo-shirts.html':'short-sleeve-polo','custom-long-sleeve-polos.html':'long-sleeve-polo',
 'custom-fleece-hoodies.html':'fleece-hoodie','custom-lightweight-jackets.html':'lightweight-jacket',
 'custom-face-masks.html':'mask','custom-hooded-mask-shirts.html':'hood-mask-shirt',
 'custom-shorts.html':'shorts','custom-sweatpants.html':'sweat-pants',
 'custom-hooded-long-sleeve-shirts.html':'hooded-long-sleeve','custom-hats.html':'hat'
};
let previous;
let timer;
function update(){
 const active=halloweenActive();
 let banner=document.getElementById('halloweenSpecial');
 if(!banner){banner=document.createElement('div');banner.id='halloweenSpecial';banner.setAttribute('role','note');document.body.prepend(banner);}
 banner.hidden=!active;
 banner.textContent='Halloween Special: 20% off all 12 garments • Ends Oct 31, 2026 at 11:59 PM Eastern • Automatically applied';
 document.documentElement.style.setProperty('--mqd-promotion-height',active?banner.getBoundingClientRect().height+'px':'0px');
 document.querySelectorAll('.link-card[href]').forEach(card=>{
  const id=productPages[card.getAttribute('href').split('/').pop()];if(!id)return;
  let price=card.querySelector('.garment-price');if(!price){price=document.createElement('p');price.className='garment-price';card.append(price);}
  showPrice(price,id,active);
 });
 const id=productPages[location.pathname.split('/').pop()];
 const hero=document.querySelector('.hero-copy');
 if(id&&hero){let price=hero.querySelector('.garment-price');if(!price){price=document.createElement('p');price.className='garment-price';hero.append(price);}showPrice(price,id,active);}
 if(previous!==active){previous=active;window.dispatchEvent(new Event('mqd:pricing-changed'));}
 clearTimeout(timer);
 const next=Date.now()<HALLOWEEN_START?HALLOWEEN_START:HALLOWEEN_END;
 if(next>Date.now())timer=setTimeout(update,Math.min(next-Date.now()+10,2147483647));
}
function showPrice(el,id,active){
 el.replaceChildren();
 if(active){const old=document.createElement('del');old.textContent='$'+(BASE_CENTS[id]/100).toFixed(2);el.append(old,' ');}
 const current=document.createElement('strong');current.textContent='$'+garmentPrice(id).toFixed(2);el.append(current,active?' · 20% off':'');
}
window.addEventListener('focus',update);
window.addEventListener('resize',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
update();
