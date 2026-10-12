import {voteRequest} from './voting-api.js';
import {installRevealButton} from './shirt-reveal.js';
const css=document.createElement('link');css.rel='stylesheet';css.href='/v20/voting.css';document.head.append(css);
const host=document.querySelector('.topbar')||document.getElementById('saveDraft')?.parentElement;
if(host){const button=document.createElement('button');button.type='button';button.className='btn';button.textContent='Help me choose';button.id='createDesignVote';button.onclick=openVotes;host.append(button);}
installRevealButton();
function node(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
async function openVotes(){
 if(!window.MQDVotingAccount?.requireAccount(openVotes))return;
 const dialog=node('dialog',null,'vote-dialog'),head=node('div',null,'vote-head'),close=node('button','Close','btn');close.type='button';close.onclick=()=>dialog.close();head.append(node('h2','Help me choose'),close);
 const intro=node('p','Choose two or three saved designs for a public vote. Your first voting page is included. Purchasing a design from your latest vote unlocks your next page. Closing a vote does not reset this allowance.');
 const status=node('p','Loading your designs…','vote-status');status.setAttribute('role','status');dialog.append(head,intro,status);document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();
 try{
  const [mine,designs]=await Promise.all([voteRequest({action:'mine'},{authenticated:true}),window.MQDVotingAccount.designs()]);if(!dialog.isConnected)return;
  status.textContent=mine.canCreate?'Your next voting page is available.':'Purchase a design from your latest vote to unlock another page. Use Open design below to reopen the exact voted design before ordering.';
  for(const p of mine.polls){
   const card=node('section',null,'vote-poll');card.append(node('h3',p.title));
   const url=new URL('/vote.html',location.origin);url.searchParams.set('id',p.id);
   const link=node('a','View vote','btn');link.href=url.href;link.target='_blank';link.rel='noopener';
   const copy=node('button','Copy share link','btn');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent='Link copied. Share it on Facebook, Messenger, or anywhere else.';}catch{status.textContent=url.href;}};
   card.append(link,copy);
   for(const choice of p.choices||[]){if(!choice.design_id)continue;const open=node('button','Open design: '+choice.label,'btn');open.type='button';open.onclick=async()=>{try{await window.MQDVotingAccount.open(choice.design_id);dialog.close();}catch(e){status.textContent=e.message;}};card.append(open);}
   dialog.append(card);
  }
  if(!mine.canCreate)return;
  if(designs.length<2){dialog.append(node('p','Save at least two different designs using Save Design, then return here.'));return;}
  const form=node('form',null,'vote-form'),titleLabel=node('label','Vote title'),title=node('input');title.type='text';title.maxLength=100;title.required=true;title.placeholder='Help choose our new crew uniform';titleLabel.append(title);
  const daysLabel=node('label','Voting closes in how many days? '),days=node('input');days.type='number';days.min='1';days.max='30';days.value='7';days.required=true;daysLabel.append(days);
  const grid=node('div',null,'vote-grid');
  for(const d of designs){const card=node('div',null,'vote-card'),label=node('label'),check=node('input');check.type='checkbox';check.name='design';check.value=d.id;label.append(check,node('span',d.name));const img=node('img');img.src=d.preview;img.alt=d.name+' preview';card.append(img,label);grid.append(card);}
  const consentLabel=node('label'),consent=node('input');consent.type='checkbox';consent.required=true;consentLabel.append(consent,document.createTextNode(' Make the selected garment previews and vote title public. Original artwork files stay private.'));
  const create=node('button','Create public voting page','btn orange');create.type='submit';form.append(titleLabel,daysLabel,grid,consentLabel,create);dialog.append(form);
  form.onsubmit=async e=>{e.preventDefault();const ids=[...form.querySelectorAll('[name=design]:checked')].map(c=>c.value);if(ids.length<2||ids.length>3){status.textContent='Select two or three different designs.';return;}create.disabled=true;status.textContent='Creating your voting page…';try{const r=await voteRequest({action:'create',title:title.value.trim(),closesAt:new Date(Date.now()+Number(days.value)*86400000).toISOString(),designIds:ids},{authenticated:true});const url=new URL('/vote.html',location.origin);url.searchParams.set('id',r.pollId);form.remove();status.textContent='Your voting page is ready. Share this link with your crew and followers.';const link=node('a','Open your voting page','btn');link.href=url.href;link.target='_blank';link.rel='noopener';dialog.append(link,node('p',url.href));const copy=node('button','Copy share link','btn');copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.href);status.textContent='Share link copied.';}catch{status.textContent=url.href;}};dialog.append(copy);}catch(e){status.textContent=e.message;create.disabled=false;}};
 }catch(e){status.textContent=e.message;}
}
