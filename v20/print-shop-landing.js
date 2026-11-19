const landing=document.getElementById('printShopLanding');
if(landing&&!document.documentElement.classList.contains('configure-shop')){
 const frame=document.getElementById('shopDemo'),open=document.getElementById('openShopDemo');
 if(frame.dataset.demoSrc)frame.src=frame.dataset.demoSrc;
 for(const button of landing.querySelectorAll('[data-demo-engine]'))button.addEventListener('click',()=>{
  const engine=button.dataset.demoEngine;
  if(button.getAttribute('aria-pressed')==='true')return;
  for(const choice of landing.querySelectorAll('[data-demo-engine]'))choice.setAttribute('aria-pressed',String(choice===button));
  frame.title=`Interactive ${engine.toUpperCase()} print-shop designer demo`;
  frame.src=`/shop-${engine}.html?marketingDemo=1`;open.href=frame.src;
 });
 const form=document.getElementById('shopLeadForm'),button=document.getElementById('submitShopLead'),status=document.getElementById('shopLeadStatus');
 const startedAt=Date.now();let sending=false,attempt=null;
 button.disabled=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(sending||!form.reportValidity())return;
  const contact={name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),shopName:form.elements.shopName.value.trim(),phone:form.elements.phone.value.trim()};
  const fingerprint=JSON.stringify(contact);
  try{
   if(!attempt){try{attempt=JSON.parse(sessionStorage.getItem('mqd-shop-interest-attempt-v1')||'null');}catch{}}
   if(!attempt||attempt.fingerprint!==fingerprint)attempt={id:crypto.randomUUID(),fingerprint};
   try{sessionStorage.setItem('mqd-shop-interest-attempt-v1',JSON.stringify(attempt));}catch{}
   sending=true;button.disabled=true;status.textContent='Saving your pilot request…';
   const response=await fetch('https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-setup',{method:'POST',headers:{apikey:'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4','Content-Type':'application/json'},body:JSON.stringify({action:'interest',requestId:attempt.id,contact,website:document.getElementById('leadWebsite').value,startedAt}),signal:AbortSignal.timeout(20000)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Your request could not be saved. Please try again.');
   if(result.status!=='received'||!result.reference)throw new Error('We could not confirm your request. Please try again.');
   try{sessionStorage.setItem('mqd-shop-interest-contact-v1',JSON.stringify({...contact,savedAt:Date.now()}));}catch{}
   form.hidden=true;document.getElementById('shopLeadSuccess').hidden=false;
   document.getElementById('shopLeadReceipt').textContent=`Reference: ${result.reference}. No payment was collected. Your seven days start after setup and approval.`;
   status.textContent=result.notificationAccepted?'Your request has been sent to MYMERCHNOW.':'Your request is saved, but the notification email could not be confirmed. Continue setup or email mqdrva@gmail.com with your reference.';
   document.getElementById('shopLeadSuccess').setAttribute('tabindex','-1');document.getElementById('shopLeadSuccess').focus();
  }catch(error){status.textContent=error.name==='TimeoutError'||error instanceof TypeError?'We could not confirm your request. Your details are still here; retry to check the same request, or email mqdrva@gmail.com.':error.message;}
  finally{sending=false;button.disabled=false;}
 });
}
