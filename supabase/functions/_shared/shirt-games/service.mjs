import * as E from './engine.mjs';
import {checkoutSnapshot,validateReviewManifest,productionReviewHash,templateHash} from './commerce.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=(message,status=400)=>{throw new E.GameError(message,status)};
export async function handleGameAction({route,body={},actorToken='',user=null,repo}){
 const settings=await repo.settings();
 if(route==='catalog')return {menu:settings.menu.filter(g=>g.visible).sort((a,b)=>a.rank-b.rank).map(g=>({...g,title:E.TITLES[g.id],available:settings.enabled})),colors:E.COLORS,sayings:E.SAYINGS,hosted:true,enabled:settings.enabled,checkoutEnabled:settings.checkout_enabled===true,cutoutMode:'manual-or-transparent',message:settings.enabled?'':'Online games are being prepared.'};
 if(route==='owner'){
  if(user?.app_metadata?.role!=='admin')fail('Owner access required',403);
  if(!await repo.ownerMfa())fail('Verify your owner account with an authenticator code.',403);
  if(body.action==='menu'){const state=E.initialState();E.updateMenu(state,body.items);await repo.saveMenu(state.menu);return {menu:state.menu}}
  if(body.action==='sandbox-checkout'){if(!UUID.test(String(body.orderId||'')))fail('Invalid draft');const draft=await repo.readDraft(body.orderId);if(!draft||draft.is_test||draft.snapshot.snapshot?.status!=='revealed'||!draft.snapshot.snapshot?.approved)fail('Approved game draft required',409);return repo.startSandbox(draft,user);}
  if(body.action==='sandbox-list')return {orders:await repo.sandboxOrders(user.id)};
  if(body.action==='sandbox-detail'){if(!UUID.test(String(body.orderId||'')))fail('Invalid sandbox draft');return repo.sandboxDetail(body.orderId,user.id);}
  if(body.action==='proof-list')return {drafts:await repo.proofDrafts()};
  if(body.action==='proof-detail'){if(!UUID.test(String(body.orderId||'')))fail('Invalid draft');return repo.proofDetail(body.orderId)}
  if(body.action==='proof'){if(!UUID.test(String(body.orderId||'')))fail('Invalid draft');const draft=await repo.readDraft(body.orderId);if(!draft)fail('Draft not found',404);validateReviewManifest(draft.snapshot,body.manifest);await repo.approveProduction(draft.id,user.id,productionReviewHash(draft.snapshot),templateHash(draft.snapshot));return {reviewed:true}}
  if(body.action==='detail'){if(!UUID.test(String(body.orderId||'')))fail('Invalid order');return repo.paidDetail(body.orderId)}
  if(body.action==='orders')return {orders:await repo.paidOrders(),menu:settings.menu,manufacturingEnabled:false};
  fail('Manufacturing downloads stay locked until the payment and export checks pass',409);
 }
 if(!settings.enabled)fail('Online games are not open yet',503);
 if(route==='create'){
  if(!user||user.is_anonymous)fail('Sign in to create a private game',401);
  const state=E.initialState();state.rulesApproved=true;state.menu=settings.menu;
  const created=E.createGame(state,body);await repo.createGame(user.id,state.games[created.id]);return created;
 }
 if(!UUID.test(String(body.id||'')))fail('Invalid game');
 if(!['claim','state','submit','change','order-draft','face-cutout','face-reveal','checkout','resume'].includes(route))fail('Unknown game action',404);
 let row=await repo.readGame(body.id);if(!row)fail('Game not found',404);
 if(new Date(row.expires_at)<=new Date())fail('This game has expired',410);
 if(route==='resume'){
  if(!user||user.is_anonymous)fail('Sign in to reopen your game design',401);
  if(!UUID.test(String(body.draftId||'')))fail('Invalid saved game design');
  const draft=await repo.readDraft(body.draftId);
  if(!draft||draft.game_id!==row.id||draft.buyer_id!==user.id)fail('Saved game design access denied',403);
  for(let attempt=0;attempt<3;attempt++){
   const game=structuredClone(row.engine),result=E.resumeParticipant(game,draft.buyer_seat);
   if(await repo.commit(game.id,row.version,game))return {...result,selection:{product:draft.snapshot.product,color:draft.snapshot.color,size:draft.snapshot.size,quantity:draft.snapshot.quantity,saying:draft.snapshot.saying}};
   row=await repo.readGame(body.id);if(!row||new Date(row.expires_at)<=new Date())fail('This game has expired',410);
  }
  fail('Another update arrived. Please try reopening your game again.',409);
 }
 if(route==='state')return repo.publicView(E.viewGame(row.engine,actorToken));
 if(route==='face-cutout'||route==='face-reveal'){E.participant(row.engine,actorToken);fail('Use the face outline tool or upload a transparent face cutout. Paid background removal is not enabled.',422)}
 if(route==='checkout'){
  if(!user||user.is_anonymous)fail('Sign in before purchasing',401);
  if(!settings.checkout_enabled)fail('Purchasing is waiting for payment and production verification',409);
  if(!UUID.test(String(body.draftId||'')))fail('Invalid order draft');
  const seat=E.participant(row.engine,actorToken),draft=await repo.readDraft(body.draftId);
  if(!draft||draft.game_id!==row.engine.id||draft.buyer_seat!==seat.index||(draft.buyer_id&&draft.buyer_id!==user.id))fail('Order access denied',403);
  if(settings.verified_templates?.[draft.snapshot.product]!==templateHash(draft.snapshot))fail('Owner garment production review is required before purchasing',409);
  const prepared=await repo.prepareOrder(draft,user,seat.index,checkoutSnapshot(draft.snapshot));return repo.checkout(prepared,user);
 }
 if(route==='order-draft'){
  const state=E.initialState(),game=row.engine;const draft=E.orderDraft(state,game,actorToken,body);
  const seat=E.participant(game,actorToken);const record=state.orders[draft.id];
  await repo.saveDraft(record,user?.id||null,seat.index);return {...draft,checkoutEnabled:false};
 }
 let stored=null,committed=false;
 try{
  if(route==='submit'&&body.kind==='photo'){
   if(row.engine.type==='faces'&&body.photo?.cutout!==true)fail('Approve a face cutout before submitting');
   const seat=E.participant(row.engine,actorToken);if(seat.submission)fail('Your contribution is already sealed',409);
   // Validate the complete turn before reserving bytes or storing any image.
   const checked=structuredClone(row.engine);E.submit(checked,actorToken,body);
   stored=await repo.storePhoto(row.engine.id,seat.index,checked.seats[seat.index].submission.photo);
  }
  for(let attempt=0;attempt<3;attempt++){
   const game=structuredClone(row.engine);let result;
   if(route==='claim')result=E.claimGame(game,body);
   else if(route==='submit'){result=E.submit(game,actorToken,body);if(stored){const seat=E.participant(game,actorToken);seat.submission.photo=stored.photo;result=E.viewGame(game,actorToken)}}
   else result=E.changeGame(game,actorToken,body.action,body);
   if(await repo.commit(game.id,row.version,game)){committed=true;return route==='claim'?result:repo.publicView(result)}
   row=await repo.readGame(body.id);if(!row||new Date(row.expires_at)<=new Date())fail('Game expired during the update',410);
  }
  fail('Another player just updated this game. Refresh and try again.',409);
 }finally{if(stored&&!committed)await repo.discardPhoto(stored).catch(()=>{})}
}
