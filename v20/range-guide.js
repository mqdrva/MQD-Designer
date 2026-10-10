import {garmentPrice} from './promotion-pricing.js';

export function everydayExampleCents(pricing){
  const amounts=[pricing?.baseCents?.['everyday-tshirt'],pricing?.printCents?.front,pricing?.methodCents?.transfer??0];
  if(!amounts.every(value=>Number.isSafeInteger(value)&&value>=0)||amounts[0]<50)throw new Error('Current pricing is unavailable');
  return amounts.reduce((total,value)=>total+value,0);
}
if(typeof document!=='undefined'){
  const premium=document.getElementById('premiumExamplePrice');
  const updatePremium=()=>{if(premium)premium.textContent='$'+garmentPrice('tshirt').toFixed(2)+' each';};
  updatePremium();window.addEventListener('mqd:pricing-changed',updatePremium);window.addEventListener('focus',updatePremium);
  const everyday=document.getElementById('everydayExamplePrice');
  if(everyday){
    fetch('https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/submit-mqd-everyday-design',{headers:{apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4'},signal:AbortSignal.timeout(8000)})
      .then(async response=>{if(!response.ok)throw new Error('Current pricing is unavailable');return response.json();})
      .then(result=>{everyday.textContent='$'+(everydayExampleCents(result.pricing)/100).toFixed(2)+' each';})
      .catch(()=>{everyday.textContent='See current price in the designer';});
  }
}
