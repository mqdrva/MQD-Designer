// Runs before the designer module/CDNs so a failed import cannot leave a blank page.
(()=>{const panel=document.getElementById('teamStartup'),message=document.getElementById('teamStartupMessage'),retry=document.getElementById('teamStartupRetry');
let finished=false;const slow=setTimeout(()=>{if(!finished){message.textContent='Your artwork is taking longer to load. Check your connection, then try again if needed.';retry.hidden=false;}},20000);
retry.onclick=()=>location.reload();
window.MQDTeamStartup={stage(text){if(!finished)message.textContent=text;},fail(){if(finished)return;clearTimeout(slow);message.textContent='The designer could not load. Check your connection and try again. If you opened this from Instagram, try opening the link in Safari or Chrome.';retry.hidden=false;document.body.removeAttribute('aria-busy');},ready(){finished=true;clearTimeout(slow);panel.remove();document.body.removeAttribute('aria-busy');}};
window.addEventListener('error',event=>{if(event.target===window||event.target?.tagName==='SCRIPT')window.MQDTeamStartup.fail();},true);
})();
