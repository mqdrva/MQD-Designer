import {voteRequest,voterToken} from './voting-api.js';
const $=id=>document.getElementById(id),pollId=new URL(location.href).searchParams.get('id');
let busy=false,timer,selection='',lastResult=null;
const key='mqd-vote-'+pollId;
try{selection=localStorage.getItem(key)||'';}catch{}
function render(result){
 if(lastResult)result.options=result.options.map(o=>({...lastResult.options.find(old=>old.id===o.id),...o}));lastResult=result;
 const closed=Date.now()>=new Date(result.poll.closes_at).getTime();
 $('voteTitle').textContent=result.poll.title;document.title=result.poll.title+' | MyMerchNow';
 $('voteDeadline').textContent=(closed?'Voting closed ':'Voting closes ')+new Date(result.poll.closes_at).toLocaleString();
 $('voteTotal').textContent=`${result.total} ${result.total===1?'vote':'votes'} · ${closed?'Final results':'Current results'}`;
 $('voteOptions').replaceChildren();
 const feedback=result.poll.mode==='feedback';
 if(feedback){const hero=document.createElement('article');hero.className='vote-card vote-single-preview';const image=document.createElement('img');image.src=result.options[0]?.preview||'';image.alt='Design receiving thumbs-up or thumbs-down feedback';hero.append(image);$('voteOptions').append(hero);}
 const max=Math.max(...result.options.map(o=>o.votes));
 for(const o of result.options){
  const card=document.createElement('article');card.className='vote-card';
  const img=document.createElement('img');img.src=o.preview;img.alt=o.label+' garment preview';
  const title=document.createElement('h2');title.textContent=o.label;
  const count=document.createElement('p');count.className='vote-result';count.textContent=`${o.votes} votes (${result.total?Math.round(o.votes/result.total*100):0}%)${closed&&o.votes===max&&max>0?' · Top choice':''}`;
  const button=document.createElement('button');button.className='btn';button.textContent=selection===o.id?'Your choice':'Vote for this design';button.disabled=closed||!!selection||busy;
  button.onclick=async()=>{busy=true;render(result);try{const r=await voteRequest({action:'vote',pollId,optionId:o.id,voterToken:voterToken(),resultsOnly:true});selection=r.recorded===false?'already-voted':o.id;try{localStorage.setItem(key,selection);}catch{}busy=false;render(r);$('voteStatus').textContent=r.recorded===false?'You have already voted from this browser.':'Thanks! Your vote is counted. Share this voting page.';}catch(e){busy=false;render(result);$('voteStatus').textContent=e.message;}};
  if(feedback){button.textContent=selection===o.id?'Your vote: '+o.label:(o.label==='Thumbs up'?'👍 Thumbs up':'👎 Thumbs down');card.append(title,count,button);}else card.append(img,title,count,button);$('voteOptions').append(card);
 }
 if(closed&&timer){clearInterval(timer);timer=null;}
}
async function refresh(){if(busy||document.hidden)return;try{const r=await voteRequest({action:'public',pollId,resultsOnly:!!lastResult});render(r);if(!$('voteStatus').textContent.startsWith('Thanks'))$('voteStatus').textContent=selection?'Your vote has been submitted.':r.poll.mode==='feedback'?'Do you like this design? Vote thumbs up or thumbs down below.':'Choose your favorite below.';}catch(e){$('voteStatus').textContent=e.message;}}
$('refreshVotes').onclick=refresh;refresh();timer=setInterval(refresh,30000);addEventListener('pagehide',()=>clearInterval(timer));
