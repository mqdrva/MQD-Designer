import {halloweenActive,HALLOWEEN_START,HALLOWEEN_END,blackFridayActive,blackFridayEligible,BLACK_FRIDAY_START,BLACK_FRIDAY_END,garmentPrice,BASE_CENTS,pricingEpoch} from './promotion-pricing.js?v=20261121-black-friday';
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
 const now=Date.now();
 const halloween=halloweenActive(now);
 const blackFriday=blackFridayActive(now);
 const active=halloween||blackFriday;
 const epoch=pricingEpoch(now);
 let banner=document.getElementById('halloweenSpecial');
 if(!banner){banner=document.createElement('div');banner.id='halloweenSpecial';banner.setAttribute('role','note');document.body.prepend(banner);}
 banner.hidden=!active;
 document.querySelectorAll('[data-halloween-promo]').forEach(card=>{card.hidden=!halloween;});
 banner.dataset.promotion=epoch;
 if(blackFriday){
  const shop=document.createElement('a');
  shop.href='/custom-apparel.html#products';
  shop.textContent='Shop the Sale';
  banner.replaceChildren('Black Friday Sale • Select premium custom apparel from $25 • Ends Cyber Monday, Nov 30 at 11:59 PM ET ',shop);
 }else{
  banner.textContent='Halloween Special: 20% off all 12 garments • Ends Oct 31, 2026 at 11:59 PM Eastern • Automatically applied';
 }
 document.documentElement.style.setProperty('--mqd-promotion-height',active?banner.getBoundingClientRect().height+'px':'0px');
 document.querySelectorAll('.link-card[href]').forEach(card=>{
  const id=productPages[card.getAttribute('href').split('/').pop()];if(!id)return;
  let price=card.querySelector('.garment-price');if(!price){price=document.createElement('p');price.className='garment-price';card.append(price);}
  showPrice(price,id,now,halloween,blackFriday);
 });
 const id=productPages[location.pathname.split('/').pop()];
 const hero=document.querySelector('.hero-copy');
 if(id&&hero){let price=hero.querySelector('.garment-price');if(!price){price=document.createElement('p');price.className='garment-price';hero.append(price);}showPrice(price,id,now,halloween,blackFriday);}
 if(previous!==epoch){previous=epoch;window.dispatchEvent(new Event('mqd:pricing-changed'));}
 clearTimeout(timer);
 const next=[HALLOWEEN_START,HALLOWEEN_END,BLACK_FRIDAY_START,BLACK_FRIDAY_END].find(boundary=>boundary>now);
 if(next)timer=setTimeout(update,Math.min(next-now+10,2147483647));
}
function showPrice(el,id,now,halloween,blackFriday){
 const onSale=halloween||(blackFriday&&blackFridayEligible(id));
 el.replaceChildren();
 if(onSale){const old=document.createElement('del');old.textContent='$'+(BASE_CENTS[id]/100).toFixed(2);el.append(old,' ');}
 const current=document.createElement('strong');current.textContent='$'+garmentPrice(id,0,now).toFixed(2);el.append(current,halloween?' · 20% off':onSale?' · Black Friday':'');
}
window.addEventListener('focus',update);
window.addEventListener('resize',update);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
update();
