import {contestRequest} from './contest-api.js';
import {voterToken} from './voting-api.js';
const $=id=>document.getElementById(id),id=new URL(location.href).searchParams.get('id');
const key='mqd-contest-vote-'+id;let selected='',result=null,busy=false,celebrated=false,timer;
try{selected=localStorage.getItem(key)||'';}catch{}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
function confetti(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;for(let i=0;i<35;i++){const e=node('i',null,'confetti');e.style.setProperty('--x',Math.random()*100+'vw');e.style.setProperty('--c',['#ff8a3d','#c7a7ff','#63e6d3'][i%3]);e.style.animationDelay=Math.random()*.4+'s';document.body.append(e);setTimeout(()=>e.remove(),3500);}}
function updateCountdown(){if(!result)return;const remaining=new Date(result.contest.closes_at)-Date.now();if(remaining<=0){$('contestCountdown').textContent='VOTING CLOSED';if(!$('contestWinner').hidden)return;render(result);return;}const seconds=Math.floor(remaining/1000);$('contestCountdown').textContent=`${Math.floor(seconds/86400)}d ${Math.floor(seconds%86400/3600)}h ${Math.floor(seconds%3600/60)}m ${seconds%60}s left to vote`;}
function render(next){
 if(result)next.options=next.options.map(o=>({...result.options.find(old=>old.id===o.id),...o}));result=next;
 const closed=Date.now()>=new Date(result.contest.closes_at).getTime();
 $('contestTitle').textContent=result.contest.title;document.title=result.contest.title+' | MyMerchNow';$('contestDescription').textContent=result.contest.description;
 $('contestTotal').textContent=`${result.total} ${result.total===1?'vote':'votes'} · ${closed?'Final results':'Live results update every 30 seconds'}`;
 for(const o of result.options){
  let card=$('entry-'+o.id);
  if(!card){card=node('article',null,'contest-card');card.id='entry-'+o.id;const img=node('img');img.src=o.preview;img.alt=o.label+' design';const heading=node('h2',o.label);const counts=node('p',null,'result');counts.append(node('span'),node('span'));const bar=node('div',null,'bar');bar.setAttribute('aria-hidden','true');bar.append(node('span'));const button=node('button');button.type='button';button.onclick=()=>vote(o.id);card.append(img,heading,counts,bar,button);$('contestOptions').append(card);}
  const maxVotes=Math.max(...result.options.map(choice=>choice.votes));
  let badge=card.querySelector('.entry-badge');if(!badge){badge=node('p',null,'entry-badge');card.prepend(badge);}
  const tied=result.options.filter(choice=>choice.votes===maxVotes).length>1;
  badge.textContent=maxVotes>0&&o.votes===maxVotes?(closed?'★ Top voted':tied?'↗ Joint leader':'↗ Crowd favorite'):'✦ Make your pick';
  card.classList.toggle('leading',maxVotes>0&&o.votes===maxVotes);
  const percent=result.total?Math.round(o.votes/result.total*100):0;card.querySelector('.result').children[0].textContent=o.votes+(o.votes===1?' vote':' votes');card.querySelector('.result').children[1].textContent=percent+'%';requestAnimationFrame(()=>{card.querySelector('.bar span').style.width=percent+'%';});
  const button=card.querySelector('button');button.textContent=selected===o.id?'Your pick ✓':closed?'Voting closed':'This is my favorite →';button.disabled=closed||!!selected||busy;card.classList.toggle('selected',selected===o.id);
 }
 $('contestLeaderboard').hidden=false;$('contestRanks').replaceChildren();const ranked=[...result.options].sort((a,b)=>b.votes-a.votes);
 ranked.forEach((o,i)=>{const li=node('li');li.append(node('span',(i+1)+'. '+o.label),node('strong',o.votes+' votes'));$('contestRanks').append(li);});
 if(closed){const max=ranked[0]?.votes||0;const leaders=ranked.filter(o=>o.votes===max);$('contestWinner').hidden=false;$('contestWinner').textContent=max>0?(leaders.length>1?'Tied top designs: ':'Community favorite: ')+leaders.map(o=>o.label).join(' · '):'Voting has closed. No votes were submitted.';if(max>0&&!celebrated){celebrated=true;confetti();}}
 updateCountdown();
}
async function vote(optionId){busy=true;render(result);$('contestStatus').textContent='Counting your vote…';try{const next=await contestRequest({action:'vote',contestId:id,optionId,voterToken:voterToken(),resultsOnly:true});selected=next.recorded===false?'already-voted':optionId;try{localStorage.setItem(key,selected);}catch{}busy=false;render(next);$('contestStatus').textContent=next.recorded===false?'You have already voted from this browser.':'Your vote is counted. Share the contest with your friends!';if(next.recorded)confetti();}catch(e){busy=false;render(result);$('contestStatus').textContent=e.message;}}
async function refresh(){if(busy||document.hidden)return;try{if(!id){const {contests}=await contestRequest({action:'list'});$('contestOptions').replaceChildren();for(const c of contests){const card=node('article',null,'contest-card'),a=node('a','Explore contest →','button');a.setAttribute('aria-label','Explore contest: '+c.title);a.href='/contests.html?id='+encodeURIComponent(c.id);card.append(node('p',new Date(c.closes_at)>new Date()?'● OPEN FOR VOTING':'✦ FINAL RESULTS','contest-state'),node('h2',c.title),node('p',c.description),a);$('contestOptions').append(card);}$('contestStatus').textContent=contests.length?'Choose a contest to view its designs.':'No contests are open yet. Check back for our next design spotlight.';return;}render(await contestRequest({action:'public',contestId:id,resultsOnly:!!result}));$('contestStatus').textContent=selected?'Your vote has been submitted.':'Choose your favorite design below.';}catch(e){$('contestStatus').textContent=e.message;}}
async function share(){try{if(navigator.share){await navigator.share({title:result?.contest.title||'MyMerchNow Design Spotlight',url:location.href});return;}await navigator.clipboard.writeText(location.href);$('contestStatus').textContent='Contest link copied.';}catch(e){if(e.name!=='AbortError')$('contestStatus').textContent='Copy this page’s address to share the contest.';}}
if(!id){$('refreshContest').hidden=true;$('allContests').hidden=true;}$('refreshContest').onclick=refresh;$('shareContest').onclick=share;refresh();timer=setInterval(refresh,30000);const clock=setInterval(updateCountdown,1000);addEventListener('pagehide',()=>{clearInterval(timer);clearInterval(clock);});
