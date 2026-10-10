export function installTryOn(capture,host){
  if(typeof location==='undefined'||!host)return;
  const button=document.createElement('button');button.type='button';button.className='btn try-on-preview-button';button.textContent='Virtual try-on';host.append(button);
  button.onclick=()=>{
    const popup=window.open('/try-on.html','_blank');if(!popup){alert('Allow this preview window to open, then try again.');return;}
    const timeout=setTimeout(()=>removeEventListener('message',receive),60000);
    async function receive(event){if(event.origin!==location.origin||event.source!==popup||event.data?.type!=='mqd-try-on-ready')return;removeEventListener('message',receive);clearTimeout(timeout);try{const blob=await capture();if(blob)popup.postMessage({type:'mqd-try-on-garment',blob},location.origin);}catch(error){popup.postMessage({type:'mqd-try-on-error',message:error.message||'Could not prepare the garment preview.'},location.origin);}}
    addEventListener('message',receive);
  };
}
if(document.getElementById('webgl'))installTryOn(async()=>{
  const product=document.getElementById('productSelect');
  if(product&&/shorts|pants|hat|mask/i.test(product.selectedOptions[0]?.textContent||''))throw new Error('Choose a shirt, polo, hoodie or jacket for virtual try-on.');
  const canvas=document.getElementById('webgl');return new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
},document.querySelector('.preview-capture-actions'));
