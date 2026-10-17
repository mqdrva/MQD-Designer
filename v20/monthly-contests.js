import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
import {contestRequest,CONTEST_KEY} from './contest-api.js';
const host=document.getElementById('monthlyShowdown');
const $=id=>document.getElementById(id),node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
const date=value=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',dateStyle:'full',timeStyle:'short'}).format(new Date(value))+' Eastern';
const client=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co',CONTEST_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let round=null,loading=false;
async function request(body){const {data,error}=await client.auth.getSession();if(error)throw error;return contestRequest(body,data.session?.access_token||'');}
async function account(){
 const {data}=await client.auth.getSession();const candidate=data.session?.user,user=candidate&&!candidate.is_anonymous&&candidate.email_confirmed_at?candidate:null;
 $('monthlySignIn').hidden=!!user;$('monthlyEntryForm').hidden=!user;$('monthlyMyEntries').replaceChildren();
 if(!user)return;
 const [saved,mine]=await Promise.all([request({action:'monthly_designs'}),request({action:'monthly_mine'})]);
 const select=$('monthlySavedDesign'),prior=select.value;select.replaceChildren(new Option('Choose a saved all-over-print T-shirt',''));
 for(const d of saved.designs)select.append(new Option(d.name,d.id));
 if(saved.designs.some(d=>d.id===prior))select.value=prior;
 $('monthlyDesignHint').textContent=saved.designs.length?'Only your saved all-over-print short-sleeve T-shirts are eligible.':'Save an all-over-print short-sleeve T-shirt in the designer, then tap Refresh saved designs.';
 const entered=mine.entries.some(e=>e.contest_id===round?.id);
 $('monthlySubmit').disabled=!round||Date.parse(round.opens_at)>Date.now()||entered||!saved.designs.length;
 if(entered)$('monthlyEntryStatus').textContent='You have submitted your entry for this round. Check its status below.';
 for(const e of mine.entries){const card=node('article',null,'monthly-entry-status');card.append(node('strong',e.label),node('span',e.status==='pending'?'Awaiting MQD approval':e.status==='approved'?'Approved · ready to share':e.status==='rejected'?'Not approved':'Disqualified'));
  if(e.status==='approved'){const url=new URL('/contests.html',location.origin);url.searchParams.set('id',e.contest_id);url.hash='entry-'+e.option_id;const link=node('a','Open your entry');link.href=url.href;const copy=node('button','Copy voting link');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);$('monthlyEntryStatus').textContent='Voting link copied. Share it with your crew.';}catch{$('monthlyEntryStatus').textContent=url.href;}};card.append(link,copy);}
  $('monthlyMyEntries').append(card);
 }
}
async function load(){
 if(loading||document.hidden)return;loading=true;
 try{
  const result=await contestRequest({action:'monthly'});round=result.current;
  $('monthlyRoundTitle').textContent=round?.title||'Next monthly round';
  $('monthlySchedule').textContent=round?'Entries and voting close '+date(round.closes_at)+'. Winner revealed '+date(round.announces_at)+'.':'The next monthly round is being prepared.';
  const link=$('monthlyVoteLink');link.hidden=!round;if(round)link.href='/contests.html?id='+encodeURIComponent(round.id);
  $('monthlyRoundStatus').textContent=round?(Date.parse(round.opens_at)>Date.parse(result.server_now)?'The next round opens '+date(round.opens_at)+'.':result.approved?result.approved+' approved '+(result.approved===1?'design':'designs')+' · voting is open.':'Entries are open. Approved designs will appear here for voting.'):'Check back shortly.';
  $('monthlyHistory').replaceChildren();
  for(const h of result.history){const card=node('article',null,'monthly-history-card');card.append(node('p',h.contest.title,'eyebrow'));const names=(h.outcome?.designs||[]).map(d=>d.label).join(' · ');card.append(node('h3',h.outcome?.status==='winner'?'★ Winner: '+names:h.outcome?.status==='tie'?'Tied designs: '+names:'No winner — no votes were submitted.'));if(h.outcome?.status==='tie')card.append(node('p','A runoff is required before a sole winner can be announced.'));const a=node('a','See round results →');a.href='/contests.html?id='+h.contest.id;card.append(a);$('monthlyHistory').append(card);}
  await account();
 }catch(e){$('monthlyRoundStatus').textContent=e.message;}finally{loading=false;}
}
if(host){
 host.hidden=!!new URL(location.href).searchParams.get('id');
 $('monthlyGoogle').onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/contests.html'}});if(error)$('monthlyEntryStatus').textContent=error.message;};
 $('monthlyEmailForm').onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const {error}=await client.auth.signInWithOtp({email:$('monthlyEmail').value.trim(),options:{emailRedirectTo:location.origin+'/contests.html'}});if(error)throw error;$('monthlyEntryStatus').textContent='Check your email for a secure sign-in link, then return to submit your entry.';}catch(error){$('monthlyEntryStatus').textContent=error.message;}finally{button.disabled=false;}};
 $('monthlyRefreshDesigns').onclick=()=>account().catch(e=>{$('monthlyEntryStatus').textContent=e.message;});
 $('monthlyEntryForm').onsubmit=async e=>{e.preventDefault();if(!round)return;const button=$('monthlySubmit');button.disabled=true;$('monthlyEntryStatus').textContent='Submitting your design for approval…';try{await request({action:'monthly_submit',contestId:round.id,designId:$('monthlySavedDesign').value,label:$('monthlyEntryTitle').value.trim(),consent:$('monthlyPublishConsent').checked});$('monthlyEntryStatus').textContent='Entry received. It stays private until MQD approves it.';await account();}catch(error){$('monthlyEntryStatus').textContent=error.message;button.disabled=false;}};
 client.auth.onAuthStateChange(()=>setTimeout(()=>{if(!loading&&!host.hidden)account().catch(e=>{$('monthlyEntryStatus').textContent=e.message;});},0));
 if(!host.hidden){load();const timer=setInterval(load,60000);addEventListener('pagehide',()=>clearInterval(timer));}
}
