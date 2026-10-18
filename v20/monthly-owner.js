const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const $=id=>document.getElementById(id);
const date=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' Eastern';
export async function installMonthlyOwner(request){
 const {rounds}=await request({action:'monthly_rounds'});$('monthlyOwnerTools').hidden=false;
 const select=$('monthlyOwnerRound');select.replaceChildren();
 const ordered=[...rounds].sort((a,b)=>Date.parse(a.closes_at)-Date.parse(b.closes_at));
 for(const r of ordered)select.append(new Option(r.title+' · '+date(r.closes_at),r.id));
 const current=ordered.find(r=>Date.parse(r.closes_at)>Date.now());if(current)select.value=current.id;
 let page=0;
 async function queue(){
  $('monthlyReviewStatus').textContent='Loading entries…';
  const {entries,count}=await request({action:'monthly_queue',contestId:select.value,page});$('monthlyReviewList').replaceChildren();
  $('monthlyReviewStatus').textContent=count?count+' entries in this round.':'No entries yet. Customers can submit from Vote & Contests, or add an entry below.';
  $('monthlyPreviousPage').disabled=page===0;$('monthlyNextPage').disabled=(page+1)*20>=count;
  const closed=Date.parse(rounds.find(r=>r.id===select.value)?.closes_at)<=Date.now();
  for(const e of entries){const card=node('article',null,'monthly-review-card');card.append(node('h3',e.label),node('p',e.status+' · '+date(e.created_at)));
   const actions=node('div',null,'actions'),preview=node('button','Review preview & details');preview.type='button';let detail;
   preview.onclick=async()=>{preview.disabled=true;try{if(detail){detail.hidden=!detail.hidden;return;}const {entry}=await request({action:'monthly_preview',submissionId:e.id});detail=node('div');const img=node('img');img.src=entry.preview;img.alt=e.label;detail.append(img,node('p','Contact: '+entry.contact_email));if(entry.videoUrl){const video=node('video');video.src=entry.videoUrl;video.controls=true;video.playsInline=true;video.preload='metadata';detail.append(video);}if(entry.source_url){const a=node('a','Original post/source');a.href=entry.source_url;a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}if(entry.review_note)detail.append(node('p','Review note: '+entry.review_note));if(entry.design_snapshot){const download=node('button','Download submitted design JSON');download.type='button';download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(entry.design_snapshot)],{type:'application/json'}));const a=node('a');a.href=url;a.download='contest-entry-'+e.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};detail.append(download);}card.append(detail);}catch(error){$('monthlyReviewStatus').textContent=error.message;}finally{preview.disabled=false;}};actions.append(preview);
   if(!closed){for(const decision of e.status==='pending'?['approve','reject']:e.status==='approved'?['disqualify']:[]){const button=node('button',decision==='approve'?'Approve & publish':decision==='reject'?'Reject entry':'Disqualify entry');button.type='button';button.onclick=async()=>{let note='';if(decision==='disqualify'){note=prompt('Reason for disqualification (required):')||'';if(!note.trim())return;}if(!confirm(decision==='approve'?'Publish this design preview in the public poll?':decision==='reject'?'Reject this pending entry?':'Remove this entry from eligible results? Its vote record is retained.'))return;button.disabled=true;try{await request({action:'monthly_review',submissionId:e.id,decision,note});await queue();}catch(error){$('monthlyReviewStatus').textContent=error.message;button.disabled=false;}};actions.append(button);}}
   card.append(actions);$('monthlyReviewList').append(card);
  }
 }
 const refresh=()=>queue().catch(e=>{$('monthlyReviewStatus').textContent=e.message;});
 select.onchange=()=>{page=0;refresh();};$('monthlyRefreshQueue').onclick=refresh;$('monthlyPreviousPage').onclick=()=>{page--;refresh();};$('monthlyNextPage').onclick=()=>{page++;refresh();};
 $('monthlyOwnerEntryForm').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('[type=submit]');button.disabled=true;try{
  const file=$('monthlyOwnerPreview').files[0];if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10000000)throw new Error('Choose a PNG, JPEG or WebP image under 10 MB.');
  const bitmap=await createImageBitmap(file);try{if(bitmap.width*bitmap.height>25000000)throw new Error('Use an image smaller than 25 megapixels.');const scale=Math.min(1,1000/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const preview=canvas.toDataURL('image/jpeg',.85);await request({action:'monthly_owner_submit',contestId:select.value,label:$('monthlyOwnerTitle').value.trim(),email:$('monthlyOwnerEmail').value.trim(),sourceUrl:$('monthlyOwnerSource').value.trim(),preview,consent:$('monthlyOwnerConsent').checked});}finally{bitmap.close();}
  e.target.reset();await queue();$('monthlyReviewStatus').textContent='Owner-added entry saved to the approval queue. Review it before publishing.';
 }catch(error){$('monthlyReviewStatus').textContent=error.message;}finally{button.disabled=false;}};
 await queue();
}
