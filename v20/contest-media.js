export async function picturePreview(file){
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Choose a PNG, JPEG or WebP shirt picture up to 10 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>25000000)throw new Error('Choose a shirt picture smaller than 25 megapixels.');
  const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let preview=canvas.toDataURL('image/jpeg',.85);if(preview.length>700000)preview=canvas.toDataURL('image/jpeg',.6);if(preview.length>700000)throw new Error('Choose a simpler or smaller shirt picture.');return preview;
 }finally{bitmap.close();}
}
export async function checkVideo(file){
 const type=file.type.split(';')[0]||(/\.mp4$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':'');
 if(!['video/mp4','video/webm'].includes(type)||file.size<12||file.size>25*1024*1024)throw new Error('Choose an MP4 or WebM turnaround video up to 25 MB.');
 const url=URL.createObjectURL(file),video=document.createElement('video');video.preload='metadata';
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Could not read this video. Try another MP4 or WebM file.')),15000);video.onloadedmetadata=()=>{clearTimeout(timer);Number.isFinite(video.duration)&&video.duration>30?reject(new Error('Choose a turnaround video up to 30 seconds.')):resolve();};video.onerror=()=>{clearTimeout(timer);reject(new Error('This browser cannot read the video. Try an MP4 or WebM from the shirt reveal tool.'));};video.src=url;});return type;}
 finally{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
export function attachEntryVideo(card,optionId,request){
 if(card.querySelector('.entry-video-button'))return;
 const button=document.createElement('button');button.className='entry-video-button';button.type='button';button.textContent='Watch turnaround video';button.hidden=true;
 // One small metadata check per card; playback URLs are only issued for approved entries.
 request({action:'monthly_video',optionId}).then(result=>{if(result.videoUrl)button.hidden=false;}).catch(()=>{});
 button.onclick=async()=>{button.disabled=true;try{const {videoUrl}=await request({action:'monthly_video',optionId});if(!videoUrl){button.textContent='Video unavailable';return;}let video=card.querySelector('video');if(!video){video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';card.append(video);}video.src=videoUrl;video.hidden=false;await video.play().catch(()=>{});button.textContent='Play turnaround video';}catch{button.textContent='Try video again';}finally{button.disabled=false;}};
 card.append(button);
}
