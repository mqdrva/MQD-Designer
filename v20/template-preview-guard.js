// Runs before other page scripts. Unpublished previews must never enter live account,
// upload, sharing, virtual-try-on, voting, or payment handlers.
(()=>{
 const query=new URLSearchParams(location.search);
 if(!query.has('templateDemo')&&!query.has('templateOwnerPreview'))return;
 const blocked='#addToCart,#checkoutCart,#accountButton,#createDesignVote,#createShirtReveal,#shareScreenshot,#shareMockup,#virtualTryOn,#tryOnButton';
 window.addEventListener('click',event=>{
   const button=event.target.closest?.(blocked);
   const named=event.target.closest?.('button');
   if(!button&&!/^(Virtual try-on|Help me choose|Create shirt reveal)$/.test(named?.textContent?.trim()||''))return;
   event.preventDefault();event.stopImmediatePropagation();
   alert('This is an unpublished preview. You can customize, review and save locally. Live account, sharing and ordering actions are disabled.');
 },true);
})();
