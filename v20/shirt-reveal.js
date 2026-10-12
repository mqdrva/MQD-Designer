export function chooseVideoType(Recorder=globalThis.MediaRecorder){
 if(!Recorder)return null;
 return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>Recorder.isTypeSupported(t))||null;
}
export function createRevealFile(blob,mime){
 const type=mime.startsWith('video/mp4')?'video/mp4':'video/webm';
 return new File([blob],'MyMerchNow-shirt-reveal.'+(type==='video/mp4'?'mp4':'webm'),{type});
}
export async function shareRevealFile(file,nav=globalThis.navigator){
 // Invoke share directly from the tap, before any asynchronous preparation.
 try{
  if(!nav?.share||!nav?.canShare?.({files:[file]}))return 'unsupported';
  await nav.share({files:[file],title:'My shirt reveal'});return 'shared';
 }
 catch(e){if(e.name==='AbortError')return 'cancelled';return 'failed';}
}
function releaseVideoUrl(url){
 // A phone may still be reading the blob after handing it to its download manager.
 if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);
}
export function installRevealButton(){
 const host=document.querySelector('#previewPane .preview-toolbar')||document.getElementById('saveScreenshot')?.parentElement;
 if(!host)return;
 const button=document.createElement('button');button.type='button';button.className='btn';button.id='createShirtReveal';button.textContent='Create shirt reveal';button.onclick=openReveal;host.append(button);
}
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
async function openReveal(){
 const dialog=el('dialog');dialog.className='vote-dialog';
 const title=el('h2','Reveal your crew look'),info=el('p','Create a 10-second vertical video of your current garment. Includes a small MyMerchNow.app watermark and an MQD closing card. Keep this tab visible while recording.');
 const label=el('label','Business name (optional)'),name=el('input');name.maxLength=60;name.className='input';label.append(name);
 const start=el('button','Create video'),close=el('button','Close'),status=el('p');start.className=close.className='btn';status.setAttribute('role','status');
 let cancel=false,busy=false,revoke='',result=null,recorder=null,stream=null,capture=null;
 close.onclick=()=>{cancel=true;dialog.close();};dialog.addEventListener('cancel',()=>{cancel=true;});
 dialog.onclose=()=>{cancel=true;if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());capture?.restore();releaseVideoUrl(revoke);dialog.remove();};
 dialog.append(title,info,label,el('br'),start,close,status);document.body.append(dialog);dialog.showModal();
 start.onclick=async()=>{
  if(busy)return;busy=true;cancel=false;start.disabled=true;name.disabled=true;let raf;
  status.textContent='Preparing your video…';
  try{
   const mime=chooseVideoType();if(!mime||!HTMLCanvasElement.prototype.captureStream)throw new Error('Video recording is unavailable in this browser. Try a recent Chrome or Safari browser.');
   const logo=new Image();logo.src='/assets/brand-logo.png';await logo.decode();
   capture=window.MQDDesigner?.beginRevealCapture();if(!capture)throw new Error('The 3D designer is not ready yet.');
   const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d');
   const paint=seconds=>{
    ctx.fillStyle='#f5f3ef';ctx.fillRect(0,0,720,1280);ctx.textAlign='center';ctx.fillStyle='#191919';
    if(seconds<8){
     const src=capture.frame(Math.max(0,seconds-1)/7*Math.PI*2);
     const scale=Math.min(690/src.width,910/src.height);ctx.drawImage(src,(720-src.width*scale)/2,180+(910-src.height*scale)/2,src.width*scale,src.height*scale);
     ctx.font='bold 35px system-ui';ctx.fillText(name.value.trim()||'Our new crew look',360,100,640);
     ctx.font='22px system-ui';ctx.fillText('Made for our business. Designed by us.',360,144,640);
    }else{
     const scale=Math.min(380/logo.width,240/logo.height);ctx.drawImage(logo,(720-logo.width*scale)/2,360,logo.width*scale,logo.height*scale);
     ctx.font='bold 46px system-ui';ctx.fillText('MyMerchNow.app',360,750,640);ctx.font='28px system-ui';ctx.fillText('Create your own crew look',360,810,640);
    }
    ctx.fillStyle='#191919';ctx.fillRect(0,1160,720,120);ctx.fillStyle='#fff';ctx.font='bold 26px system-ui';ctx.fillText('MyMerchNow.app',360,1228);
   };
   paint(0);stream=canvas.captureStream(24);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3000000});const chunks=[];
   const done=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=resolve;recorder.onerror=()=>reject(new Error('Your browser could not record this video.'));});
   recorder.start(250);const began=performance.now();
   await new Promise((resolve,reject)=>{const frame=()=>{try{if(cancel||document.hidden)throw new Error(cancel?'Video creation cancelled.':'Video stopped because this tab was hidden. Keep it open and try again.');const s=(performance.now()-began)/1000;paint(Math.min(s,10));status.textContent=`Creating video… ${Math.min(100,Math.round(s*10))}%`;if(s>=10){resolve();return;}raf=requestAnimationFrame(frame);}catch(e){reject(e);}};raf=requestAnimationFrame(frame);});
   recorder.stop();await done;if(cancel)return;const blob=new Blob(chunks,{type:mime});if(blob.size<1000)throw new Error('Video recording was empty. Please try again.');
   const file=createRevealFile(blob,recorder.mimeType||mime);
   releaseVideoUrl(revoke);revoke=URL.createObjectURL(file);result?.remove();result=el('div');
   const video=el('video');video.src=revoke;video.controls=true;video.playsInline=true;video.className='reveal-video';
   const link=el('a','Download video');link.className='btn';link.href=revoke;link.download=file.name;
   link.onclick=()=>{status.textContent='Download requested. Check your phone’s Files or Downloads folder. If nothing appears, use Save or share video, or open this page in Chrome or Safari outside Facebook/Messenger.';};
   const share=el('button','Save or share video');share.type='button';share.className='btn';
   share.onclick=async()=>{
    share.disabled=true;
    const outcome=await shareRevealFile(file);
    share.disabled=false;
    status.textContent=outcome==='shared'?'Video handed to your phone. Finish saving or sharing in the option you selected.':outcome==='cancelled'?'Saving cancelled. Your video is still ready; tap Save or share video or Download video to try again.':'This browser could not open the phone’s save options. Tap Download video and check Files or Downloads. If nothing appears, open this page in Chrome or Safari outside Facebook/Messenger.';
   };
   const help=el('p','On your phone, use Save or share video and choose a save option. Direct downloads usually go to Files or Downloads, rather than your photo gallery.');
   result.append(video,share,link,help);dialog.append(result);status.textContent='Your video is ready. Choose Save or share video, or Download video.';
  }catch(e){if(!cancel)status.textContent=e.message;}
  finally{cancelAnimationFrame(raf);if(recorder?.state==='recording')recorder.stop();stream?.getTracks().forEach(t=>t.stop());capture?.restore();capture=null;busy=false;start.disabled=false;name.disabled=false;}
 };
}
