// The invitation is advisory: a contest outage must never affect a saved design.
export function createContestSaveInvite({read,write,request,show,currentUserId,now=()=>Date.now()}){
 const considered=new Set();
 return async function invite(design,user){
  if(design?.product_id!=='tshirt'||!design.id||!user?.id||user.is_anonymous||!user.email_confirmed_at)return false;
  const key='contest-save-invite:'+user.id+':'+design.id;
  if(considered.has(key))return false;
  considered.add(key);
  let timer;
  try{
   if(await read(key))return false;
   await write(key,{seenAt:now()});
   const [monthly,mine]=await Promise.race([
    Promise.all([request({action:'monthly'}),request({action:'monthly_mine'})]),
    new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Contest check timed out')),5000);timer.unref?.();})
   ]);
   const round=monthly.current,time=Date.parse(monthly.server_now)||now();
   if(!round||!(Date.parse(round.opens_at)<=time&&time<Date.parse(round.closes_at))||mine.entries.some(e=>e.contest_id===round.id)||currentUserId()!==user.id)return false;
   show(design);return true;
  }catch{return false;}finally{clearTimeout(timer);}
 };
}
export function contestEntryUrl(designId){
 return '/contests.html?entryDesign='+encodeURIComponent(designId)+'#monthlyEntryForm';
}
export function showContestSaveInvite(design){
 if(document.getElementById('contestSaveInvite'))return;
 const previous=document.activeElement,dialog=document.createElement('dialog');dialog.id='contestSaveInvite';
 dialog.setAttribute('aria-labelledby','contestSaveInviteTitle');dialog.setAttribute('aria-describedby','contestSaveInviteText');
 dialog.style.cssText='box-sizing:border-box;width:min(440px,calc(100vw - 32px));max-height:85dvh;overflow:auto;border:2px solid #23c9e8;border-radius:20px;padding:24px;background:#101e34;color:#fff;box-shadow:0 20px 80px #0009;font-family:inherit';
 const title=document.createElement('h2');title.id='contestSaveInviteTitle';title.textContent='Want to enter this shirt in our monthly contest?';title.style.cssText='margin:0 0 14px;font-size:1.5rem;line-height:1.25;color:#fff';
 const text=document.createElement('p');text.id='contestSaveInviteText';text.textContent='Your design is saved. Enter for a chance to win a short-sleeve all-over-print T-shirt. You’ll confirm your entry next; MQD reviews it before it appears publicly.';text.style.cssText='line-height:1.5;color:#e0eafa';
 const actions=document.createElement('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:12px;margin-top:20px';
 const enter=document.createElement('a');enter.href=contestEntryUrl(design.id);enter.textContent='Enter contest';enter.style.cssText='display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:10px;background:#ff9b42;color:#111b2e;font-weight:800;text-decoration:none';
 const later=document.createElement('button');later.type='button';later.textContent='Maybe later';later.style.cssText='min-height:44px;padding:0 18px;border:1px solid #8ba2c2;border-radius:10px;background:transparent;color:#fff;font:inherit;cursor:pointer';later.onclick=()=>dialog.close();
 actions.append(enter,later);dialog.append(title,text,actions);document.body.append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus();},{once:true});
 try{dialog.showModal();later.focus();}catch{dialog.remove();}
}
