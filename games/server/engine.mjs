import {imageDimensions} from './image-info.mjs';
import {Buffer} from 'node:buffer';
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import { GARMENT_MAPPING } from '../../v20/garment-mapping-catalog.js';
export const TYPES=['pass','faces','birthday','picked'];
export const TITLES={pass:'PASS THE SHIRT',faces:'CRAZY FACES',birthday:'BIRTHDAY ROAST & TOAST',picked:'YOUR FRIENDS PICKED YOUR SHIRT'};
export const COLORS=[['White','#ffffff'],['Black','#171717'],['Navy','#172440'],['Heather Gray','#a4a4a4'],['Charcoal','#414141'],['Red','#c6202d'],['Royal Blue','#2458bd'],['Forest Green','#234e39'],['Burgundy','#742b3e'],['Sand','#e8d7be'],['Pink','#efb5c6'],['Purple','#70519a']];
export const SAYINGS=["Says I'm outside while still in bed",'Orders a salad, steals your fries','The group chat comedian','Always brings the good snacks','One more photo, always','The unofficial trip planner'];
export class GameError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const check=(yes,msg,status=400)=>{if(!yes)throw new GameError(msg,status);};
const token=()=>randomBytes(32).toString('base64url');
const hash=x=>createHash('sha256').update(String(x)).digest('hex');
const matches=(value,digest)=>typeof value==='string'&&typeof digest==='string'&&timingSafeEqual(Buffer.from(hash(value)),Buffer.from(digest));
const text=(x,max=80)=>String(x??'').trim().slice(0,max);
export function initialState(){return {games:{},orders:{},events:[],menu:TYPES.map((id,rank)=>({id,rank,visible:true})),rulesApproved:false};}
export function participant(game,secret){const seat=game.seats.find(s=>matches(secret,s.tokenHash));check(seat,'Private game access required',401);return seat;}
// Hosted adapter must verify the saved draft belongs to the authenticated account first.
export function resumeParticipant(game,index){const seat=game.seats[index];check(seat?.claimed,'Participant not found',404);const secret=token();seat.tokenHash=hash(secret);game.revision++;return {id:game.id,token:secret};}
function requireCreator(game,seat){check(seat.index===0,'Only the creator can do this',403);}
function open(game){check(game.status==='collecting','This game is already revealed',409);}
export function photo(input){
  check(input&&input.consent===true,'Confirm permission to use the photo and people pictured');
  check(input.cropApproved===true,'Approve the photo crop before submitting');
  const url=String(input.url||'');const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/.exec(url);check(m,'Choose a PNG, JPEG or WebP photo');
  const bytes=Buffer.from(m[2],'base64');check(bytes.length>12&&bytes.length<=8*1024*1024,'Photo must be no larger than 8 MB');
  check((m[1]==='png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||(m[1]==='jpeg'&&bytes[0]===255&&bytes[1]===216)||(m[1]==='webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'),'Photo file type does not match its contents');
  check(Number.isInteger(input.width)&&input.width>0&&Number.isInteger(input.height)&&input.height>0&&input.width*input.height<=40000000,'Invalid image dimensions');
  let actual;try{actual=imageDimensions(bytes,m[1])}catch{throw new GameError('Photo dimensions could not be verified. Choose another PNG, JPEG or WebP.')}check(actual.width>0&&actual.height>0&&actual.width*actual.height<=40000000,'Choose a photo under 40 megapixels');check((actual.width===input.width&&actual.height===input.height)||(actual.width===input.height&&actual.height===input.width),'Photo dimensions do not match its contents');
  const result={url,width:input.width,height:input.height,consent:true,cropApproved:true,cutout:input.cutout===true};
  if(input.outlineRecipe){const r=input.outlineRecipe;check(Array.isArray(r.points)&&r.points.length>=5&&r.points.length<=100&&r.points.every(p=>Number.isFinite(p.x)&&p.x>=0&&p.x<=1&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1),'Invalid face outline');check(r.frame&&Number.isFinite(r.frame.zoom)&&r.frame.zoom>=1&&r.frame.zoom<=3&&Number.isFinite(r.frame.panX)&&Math.abs(r.frame.panX)<=1&&Number.isFinite(r.frame.panY)&&Math.abs(r.frame.panY)<=1,'Invalid outline frame');check(Number.isInteger(r.sourceWidth)&&Number.isInteger(r.sourceHeight)&&r.sourceWidth>0&&r.sourceHeight>0&&r.sourceWidth*r.sourceHeight<=40000000,'Invalid outline source');result.outlineRecipe=structuredClone(r);}
  if(input.source){result.source=photo({url:input.source.url,width:input.source.width,height:input.source.height,consent:true,cropApproved:true});const crop=input.crop||{};check(Number.isFinite(crop.zoom)&&crop.zoom>=1&&crop.zoom<=3&&Number.isFinite(crop.panX)&&Math.abs(crop.panX)<=1&&Number.isFinite(crop.panY)&&Math.abs(crop.panY)<=1,'Invalid crop settings');result.crop={zoom:crop.zoom,panX:crop.panX,panY:crop.panY};}
  return result;
}
function reveal(game){game.status='revealed';game.revealedAt=new Date().toISOString();game.revision++;if(game.type==='picked'){
  game.results=game.seats.filter(s=>s.claimed).map(s=>{const counts=game.sayings.map((_,i)=>game.seats.reduce((n,v)=>n+(v.submission?.votes?.[i]===s.index?1:0),0));const best=Math.max(...counts);return {seat:s.index,saying:best?counts.indexOf(best):null,votes:best};});
}}
export function createGame(state,input){
  const type=input.type;check(TYPES.includes(type),'Unknown game');check(state.menu.some(x=>x.id===type&&x.visible),'This game is hidden',403);
  check(type!=='picked'||state.rulesApproved,'Voting tie and result rules await owner approval',409);
  const count=Number(input.invited);check(Number.isInteger(count)&&count>=1&&count<=5,'Choose 1–5 invited friends');
  const id=randomUUID(),creatorToken=token(),inviteSecrets=[];
  const game={id,type,status:'collecting',createdAt:new Date().toISOString(),revision:1,color:COLORS.some(c=>c[1]===input.color)?input.color:'#e8d7be',birthdayName:text(input.birthdayName,32),tone:input.tone==='roast'?'roast':'sweet',sayings:[],approved:false,results:[],seats:[]};
  if(type==='birthday')check(game.birthdayName,'Enter the birthday person’s name');
  if(type==='picked'){const ids=[...new Set(input.sayings||[])];check(ids.length>=2&&ids.length<=SAYINGS.length&&ids.every(i=>Number.isInteger(i)&&SAYINGS[i]),'Choose at least two sayings');game.sayings=ids.map(i=>SAYINGS[i]);game.rules='most-per-person; ties=display-order; repeats=allowed; zero=self-choice';}
  game.seats.push({index:0,name:text(input.name,32)||'Creator',claimed:true,tokenHash:hash(creatorToken),submission:null,removed:false});
  for(let i=1;i<=count;i++){const invite=token();inviteSecrets.push({slot:i,token:invite});game.seats.push({index:i,name:`Friend ${i}`,claimed:false,inviteHash:hash(invite),tokenHash:null,submission:null,removed:false});}
  state.games[id]=game;return {id,token:creatorToken,invitations:inviteSecrets};
}
export function claimGame(game,input){open(game);const s=game.seats.find(x=>matches(input.invite,x.inviteHash));check(s&&!s.claimed,'Invitation is invalid or already used',403);const name=text(input.name,32);check(name,'Enter your name');const secret=token();s.claimed=true;s.name=name;s.tokenHash=hash(secret);s.inviteHash=null;game.revision++;return {id:game.id,token:secret};}
export function viewGame(game,secret){
 const self=participant(game,secret),shown=game.status==='revealed';
 return {id:game.id,type:game.type,title:TITLES[game.type],status:game.status,revision:game.revision,color:game.color,birthdayName:game.birthdayName,tone:game.tone,sayings:game.sayings,rules:game.rules,approved:game.approved,self:self.index,invited:game.seats.length-1,participants:game.seats.map(s=>({index:s.index,name:s.name,claimed:s.claimed,submitted:!!s.submission,removed:shown?s.removed:false,contribution:shown&&!s.removed?publicContribution(s.submission,game.type):null})),ownSubmission:self.submission?{submitted:true}:null,results:shown?game.results:[],currentTurn:game.type==='pass'?game.seats.findIndex(s=>!s.submission):-1};
}
function publicContribution(sub,type){if(!sub)return null;if(type==='picked')return null;const copy=structuredClone(sub);if(copy.photo)delete copy.photo.source;return copy;}
export function submit(game,secret,input){
 const s=participant(game,secret);open(game);check(!s.submission,'Your contribution is already sealed',409);
 if(game.type==='pass')check(game.seats.findIndex(x=>!x.submission)===s.index,'Wait for your reserved turn',409);
 let c;
 if(game.type==='picked'){
  check(Array.isArray(input.votes)&&input.votes.length===game.sayings.length&&input.votes.every(i=>Number.isInteger(i)&&game.seats[i]?.claimed),'Vote once for each saying using joined participants');
  const prediction=input.prediction==null?null:Number(input.prediction);check(prediction===null||(Number.isInteger(prediction)&&prediction>=0&&prediction<game.sayings.length),'Invalid prediction');c={votes:[...input.votes],prediction};
 }else{
  const kind=input.kind;check(['text','photo','sun','wave','star'].includes(kind),'Choose a contribution');
  check(game.type!=='faces'||kind==='photo','Crazy Faces requires an approved photo');
  check(game.type!=='birthday'||['text','photo'].includes(kind),'Choose a photo OR a short message');
  check(['front','back','both'].includes(input.side||'both'),'Invalid print side');
  c={kind,side:input.side||'both',ink:/^#[0-9a-f]{6}$/i.test(input.ink||'')?input.ink:'#c96f4e'};
  if(kind==='text'){c.text=text(input.text,game.type==='birthday'?80:40);check(c.text,'Write your message');}
  if(kind==='photo')c.photo=photo(input.photo);
 }
 s.submission=c;game.revision++;if(game.seats.every(x=>!!x.submission))reveal(game);return viewGame(game,secret);
}
export function changeGame(game,secret,action,input={}){
 const s=participant(game,secret);requireCreator(game,s);
 if(action==='finish'){open(game);check(game.seats.some(x=>x.submission),'Add at least one contribution first');reveal(game);}
 else if(action==='remove'){check(game.status==='revealed'&&!game.approved,'Review contributions before approving the print',409);const seat=game.seats[input.seat];check(seat&&seat.submission,'Contribution not found');seat.removed=!seat.removed;game.revision++;}
 else if(action==='approve'){check(game.status==='revealed','Reveal the game first',409);check(game.seats.some(x=>x.submission&&!x.removed),'Keep at least one contribution');game.approved=true;game.revision++;}
 else throw new GameError('Unknown creator action');
 return viewGame(game,secret);
}
export function orderDraft(state,game,secret,input){
 const buyer=participant(game,secret);check(game.status==='revealed'&&game.approved,'Creator must approve the final print first',409);
 check(['tshirt','long-sleeve-tshirt','fleece-hoodie'].includes(input.product),'Unsupported garment');check(['XS','S','M','L','XL','2XL','3XL','4XL','5XL'].includes(input.size),'Choose a size');check(Number.isInteger(input.quantity)&&input.quantity>=1&&input.quantity<=20,'Choose 1–20 garments');check(COLORS.some(x=>x[1]===input.color),'Choose a listed color');check(input.reviewed===true,'Review front, back and garment placement before continuing');
 const result=game.results.find(x=>x.seat===buyer.index);let saying=null;
 if(game.type==='picked'){saying=text(input.resultText||game.sayings[result?.saying],80);check(saying,'Choose or edit your saying');}
 const id=randomUUID();const snapshot=viewGame(game,secret);delete snapshot.ownSubmission;
 const order={id,reference:`GAMES-${id.slice(0,8).toUpperCase()}`,gameId:game.id,gameType:game.type,buyer:buyer.index,buyerName:buyer.name,product:input.product,size:input.size,quantity:input.quantity,color:input.color,saying,status:'draft',paymentStatus:'unpaid',createdAt:new Date().toISOString(),snapshot,productionContributions:structuredClone(game.seats.filter(s=>!s.removed).map(s=>({seat:s.index,contribution:s.submission}))),designHash:hash(JSON.stringify(snapshot)),templateManifest:GARMENT_MAPPING[input.product].templates,manufacturingReady:false};state.orders[id]=order;return publicOrder(order);
}
export function publicOrder(o){return {id:o.id,reference:o.reference,product:o.product,size:o.size,quantity:o.quantity,color:o.color,status:o.status,paymentStatus:o.paymentStatus,checkoutEnabled:false,manufacturingReady:false};}
// Trusted payment adapter only. Never called from a participant request or return page.
export function recordVerifiedPayment(state,event,{verified,mode,sessionId,orderId,amount,currency}){
 check(verified===true&&mode==='test','Only verified sandbox payment events are accepted',403);check(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type),'Unsupported event');
 if(state.events.includes(event.id))return false;
 const o=state.orders[orderId];check(o&&o.checkoutSession===sessionId&&o.expectedAmount===amount&&o.currency===currency,'Payment does not match its prepared order',409);
 check(event.paymentStatus==='paid','Payment is not paid',409);o.paymentStatus='paid';o.status='new';o.paidAt=new Date().toISOString();o.isTest=true;state.events.push(event.id);return true;
}
export function ownerOrders(state){return Object.values(state.orders).filter(o=>o.paymentStatus==='paid').map(o=>({...publicOrder(o),gameType:o.gameType,buyerName:o.buyerName,paidAt:o.paidAt,isTest:o.isTest,templateManifest:o.templateManifest}));}
export function updateMenu(state,items){check(Array.isArray(items)&&items.length===4&&new Set(items.map(x=>x.id)).size===4&&items.every(x=>TYPES.includes(x.id)&&typeof x.visible==='boolean'),'Include each approved game exactly once');state.menu=items.map((x,rank)=>({id:x.id,visible:x.visible,rank}));}

// Apply all conversions together, preserving originals and leaving approved designs immutable.
export async function prepareFaceReveal(game,secret,processor){
 const seat=participant(game,secret);requireCreator(game,seat);
 check(game.type==='faces'&&game.status==='revealed'&&!game.approved,'Face-only review is available before final approval',409);
 const pending=game.seats.filter(s=>s.submission?.photo&&!s.removed&&!s.submission.photo.cutout);
 check(pending.length>0,'These photos are already cutouts');
 const converted=[];
 for(const seat of pending){const old=seat.submission.photo;const result=photo({...await processor(old.source||old),consent:true,cropApproved:true,cutout:true});converted.push({seat,photo:{...result,source:old.source||old,crop:{zoom:1,panX:0,panY:0}}})}
 for(const item of converted)item.seat.submission.photo=item.photo;
 game.revision++;return viewGame(game,secret);
}
