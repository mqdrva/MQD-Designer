export function checkoutProgress(){
 const dialog=document.createElement('dialog');dialog.id='checkoutProgress';dialog.setAttribute('aria-labelledby','checkoutProgressTitle');
 dialog.style.cssText='max-width:420px;width:calc(100% - 48px);box-sizing:border-box;border:0;border-radius:16px;padding:24px;color:#202020;background:white;box-shadow:0 12px 60px #0006';
 dialog.innerHTML='<h2 id="checkoutProgressTitle">Preparing secure checkout</h2><p role="status" aria-live="polite"></p><progress aria-label="Preparing checkout" style="width:100%"></progress><p>Your design stays here. Payment happens on the secure checkout page.</p><button type="button" hidden>Return to my design</button>';
 document.body.append(dialog);const message=dialog.querySelector('[role=status]'),title=dialog.querySelector('h2'),progress=dialog.querySelector('progress'),close=dialog.querySelector('button');let busy=false;
 close.onclick=()=>dialog.close();dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 return{start(text){busy=true;title.textContent='Preparing secure checkout';progress.hidden=false;close.hidden=true;message.textContent=text;if(!dialog.open)dialog.showModal();},update(text){if(dialog.open)message.textContent=text;},fail(text){busy=false;title.textContent='Checkout could not open';message.textContent=text;progress.hidden=true;close.hidden=false;},complete(){busy=false;if(dialog.open)dialog.close();}};
}
