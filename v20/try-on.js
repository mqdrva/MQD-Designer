import { installPhotoPreviewZoom } from './photo-preview-zoom.js';
import { everydayClient } from './everyday-account.js';
const $=id=>document.getElementById(id),canvas=$('tryCanvas'),ctx=canvas.getContext('2d');
const ENDPOINT='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-virtual-tryon';
let person=null,garment=null,result=null,revision=0,request=null,busy=false,accessReady=false,accessMessage='Checking your daily try-on allowance…';
let displayedImage=null;
const previewZoom=installPhotoPreviewZoom(canvas,()=>!!(result||person));
const status=text=>$('status').textContent=text;
function draw(){
  const image=result||person;
  if(image!==displayedImage){displayedImage=image;previewZoom.reset();}
  canvas.width=image?.width||800;canvas.height=image?.height||900;
  ctx.clearRect(0,0,canvas.width,canvas.height);if(image)ctx.drawImage(image,0,0);
  $('empty').hidden=!!image;$('download').disabled=!result;$('person').disabled=busy||!accessReady;
}
async function decode(file){
  if(!file||file.size>8*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a PNG, JPG or WebP image smaller than 8 MB.');
  const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error('Choose a smaller image.');}
  const frame=document.createElement('canvas'),scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));frame.width=Math.round(bitmap.width*scale);frame.height=Math.round(bitmap.height*scale);frame.getContext('2d').drawImage(bitmap,0,0,frame.width,frame.height);bitmap.close();return frame;
}
const png=frame=>new Promise((resolve,reject)=>frame.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not prepare your image.')),'image/png'));
async function api(body,signal){
  let authorization={};
  {
    const {data,error}=await (await everydayClient()).auth.getSession();
    if(error||!data.session?.access_token||data.session.user.is_anonymous)throw new Error('Sign in in the Everyday or Premium designer first. Each account gets one try-on per day.');
    authorization={Authorization:`Bearer ${data.session.access_token}`};
  }
  const response=await fetch(ENDPOINT,{method:'POST',headers:{...authorization,...(body instanceof FormData?{}:{'content-type':'application/json'})},body:body instanceof FormData?body:JSON.stringify(body),signal});
  if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error(detail.error||'The preview service is unavailable.');}return response;
}
async function generate(){
  if(!person||!garment||busy||!accessReady)return;
  const id=++revision;busy=true;request=new AbortController();result=null;draw();status('Creating your try-on preview…');
  try{
    const body=new FormData();body.append('action','generate');body.append('person',await png(person),'person.png');body.append('garment',await png(garment),'garment.png');
    const response=await api(body,request.signal),image=await decode(await response.blob());
    if(id!==revision)return;result=image;accessReady=false;accessMessage='You have used today’s try-on. It resets at midnight Eastern time.';status('Your try-on preview is ready.');
  }catch(e){if(id===revision)status(e.name==='AbortError'?'Preview cancelled.':e.message);}
  finally{if(id===revision){busy=false;request=null;draw();}}
}
async function setGarment(blob){
  garment=await decode(blob);if(person)generate();else status(accessReady?'Your finished garment is ready. Choose your photo.':accessMessage);
}
$('person').onchange=async e=>{
  if(busy)return;const id=++revision;try{const image=await decode(e.target.files[0]);if(id!==revision)return;person=image;result=null;draw();if(garment)generate();else status('Photo ready. Choose your finished garment PNG.');}catch(error){if(id===revision)status(error.message);}finally{e.target.value='';}
};
$('garment').onchange=async e=>{try{await setGarment(e.target.files[0]);}catch(error){status(error.message);}finally{e.target.value='';}};
$('clear').onclick=()=>{revision++;request?.abort();request=null;busy=false;person=null;result=null;draw();status(accessReady?'Photo cleared. Choose another photo when you are ready.':accessMessage);};
$('download').onclick=async()=>{if(!result)return;const blob=await png(result),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mymerchnow-try-on.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
addEventListener('message',async e=>{if(e.origin===location.origin&&e.source===opener&&e.data?.type==='mqd-try-on-error'){status(e.data.message);return;}if(e.origin!==location.origin||e.source!==opener||e.data?.type!=='mqd-try-on-garment'||!(e.data.blob instanceof Blob))return;try{$('garment').closest('label').hidden=true;await setGarment(e.data.blob);}catch(error){status(error.message);}});
opener?.postMessage({type:'mqd-try-on-ready'},location.origin);draw();
async function checkAccess(){
 try{const data=await (await api({action:'status'})).json();accessReady=data.ready;accessMessage=data.ready?'You have one try-on available today. Choose your photo.':'You have used today’s try-on. It resets at midnight Eastern time.';}
 catch(error){accessReady=false;accessMessage=error.message;}
 if(!person&&!result)status(accessMessage);draw();
}
void checkAccess();
void everydayClient().then(client=>client.auth.onAuthStateChange(()=>setTimeout(()=>void checkAccess(),0))).catch(()=>{});
