import {GameError} from '../server/engine.mjs';
import {productionReviewHash,templateHash,checkoutSnapshot} from './commerce.mjs';
import {PRINT_LAYOUT_VERSION} from './layout-contract.js';
const BUCKET='mqd-shirt-games';
const checked=result=>{if(result.error)throw new GameError('The game service could not save this change. Please try again.',503);return result.data};
function decode(url){const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(url||'');if(!m)throw new GameError('Invalid photo');const raw=atob(m[2]);return {mime:m[1],bytes:Uint8Array.from(raw,c=>c.charCodeAt(0)),ext:m[1].split('/')[1]}}
export function createGameRepository(db,{ownerMfa=async()=>false,checkout=async()=>{throw new GameError('Checkout is not configured',503)},price=()=>{throw new GameError('Pricing is not configured',503)},prepareDesign=async()=>{throw new GameError('Customer design save is not configured',503)},sandboxCheckout=async()=>{throw new GameError('Sandbox checkout is not configured',503)}}={}){
 return {
  ownerMfa,checkout,
  async startSandbox(draft,user){
   const id=crypto.randomUUID(),guestToken=crypto.randomUUID(),snapshot={...structuredClone(draft.snapshot),id,reference:'GAMES-TEST-'+id.slice(0,8).toUpperCase(),isTest:true};
   const payload={...checkoutSnapshot(snapshot),testMode:true},name={tshirt:'All-Over Print T-Shirt','long-sleeve-tshirt':'Long Sleeve T-Shirt','fleece-hoodie':'Fleece Hoodie'}[snapshot.product];
   await prepareDesign({id,snapshot},user,payload,name);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(guestToken)),guestHash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
   const prepared=checked(await db.rpc('mqd_shirt_game_prepare_sandbox',{p_source:draft.id,p_test:id,p_admin:user.id,p_design:id,p_guest_hash:guestHash,p_name:name,p_unit_cents:price(snapshot.product),p_snapshot:snapshot,p_payload:payload}));
   const result=await sandboxCheckout({...prepared,guestToken});return {...result,draftId:id,orderNumber:prepared.orderNumber};
  },
  async sandboxOrders(owner){const rows=checked(await db.from('mqd_shirt_game_drafts').select('id,created_at,order:mqd_orders!inner(order_number,product_name,stripe_payment_status,paid_at,is_test)').eq('is_test',true).eq('buyer_id',owner).eq('order.is_test',true).order('created_at',{ascending:false}).limit(20));return rows;},
  async sandboxDetail(id,owner){const row=checked(await db.from('mqd_shirt_game_drafts').select('id,game_id,snapshot,order:mqd_orders!inner(order_number,stripe_payment_status,paid_at,is_test)').eq('id',id).eq('is_test',true).eq('buyer_id',owner).eq('order.is_test',true).eq('order.stripe_payment_status','paid').not('order.paid_at','is',null).maybeSingle());if(!row)throw new GameError('Verified paid sandbox game order required',409);return this.productionRecord(row,row.order,true);},
  async readDraft(id){return checked(await db.from('mqd_shirt_game_drafts').select('*').eq('id',id).maybeSingle())},
  async approveProduction(id,userId,hash,mappingHash){checked(await db.rpc('mqd_shirt_game_verify_product',{p_draft:id,p_admin:userId,p_snapshot_hash:hash,p_template_hash:mappingHash}))},
  async prepareOrder(draft,user,seat,payload){const names={tshirt:'All-Over Print T-Shirt','long-sleeve-tshirt':'Long Sleeve T-Shirt','fleece-hoodie':'Fleece Hoodie'};if(!draft.order_id)await prepareDesign(draft,user,payload,names[draft.snapshot.product]);return checked(await db.rpc('mqd_shirt_game_prepare_order',{p_draft:draft.id,p_buyer:user.id,p_design:draft.id,p_seat:seat,p_email:user.email||'',p_name:names[draft.snapshot.product],p_unit_cents:price(draft.snapshot.product),p_payload:payload}))},
  async settings(){return checked(await db.from('mqd_shirt_game_settings').select('enabled,checkout_enabled,verified_templates,menu').eq('id',true).single())},
  async saveMenu(menu){checked(await db.from('mqd_shirt_game_settings').update({menu}).eq('id',true))},
  async createGame(owner,engine){const response=await db.rpc('mqd_shirt_game_create',{p_owner:owner,p_engine:engine});if(response.error)throw new GameError('Could not create the game. The test may be full or temporarily paused.',409)},
  async readGame(id){return checked(await db.from('mqd_shirt_games').select('id,engine,version,expires_at').eq('id',id).maybeSingle())},
  async commit(id,version,engine){return checked(await db.rpc('mqd_shirt_game_commit',{p_id:id,p_expected:version,p_engine:engine}))===true},
  async publicView(view){
   const copy=structuredClone(view);
   for(const seat of copy.participants){const photo=seat.contribution?.photo;if(!photo)continue;delete photo.source;const path=String(photo.url||'');if(!path.startsWith('game-asset:'))throw new GameError('Photo preview is unavailable',503);const object=path.slice(11);if(!object.startsWith(copy.id+'/')||object.includes('..'))throw new GameError('Photo access denied',403);const data=checked(await db.storage.from(BUCKET).createSignedUrl(object,300));photo.url=data.signedUrl;}
   return copy;
  },
  async storePhoto(gameId,seat,photo){
   const parts=[{kind:'crop',image:photo}];if(photo.source)parts.push({kind:'source',image:photo.source});
   for(const part of parts)Object.assign(part,decode(part.image.url));
   const bytes=parts.reduce((n,p)=>n+p.bytes.length,0);const allowed=checked(await db.rpc('mqd_shirt_game_reserve_bytes',{p_bytes:bytes}));if(!allowed)throw new GameError('Photo test capacity reached. The owner can review the storage allowance.',429);
   const files=[];
   try{
    for(const part of parts){const path=`${gameId}/${seat}/${crypto.randomUUID()}.${part.ext}`;checked(await db.storage.from(BUCKET).upload(path,part.bytes,{contentType:part.mime,upsert:false}));files.push(path);checked(await db.from('mqd_shirt_game_assets').insert({game_id:gameId,seat,path,kind:part.kind,mime_type:part.mime,bytes:part.bytes.length}));part.path=path;}
    const result=structuredClone(photo);result.url='game-asset:'+parts[0].path;if(result.source)result.source.url='game-asset:'+parts[1].path;return {photo:result,files};
   }catch(error){if(files.length){await db.storage.from(BUCKET).remove(files);await db.from('mqd_shirt_game_assets').delete().in('path',files)}throw error}
  },
  async discardPhoto(stored){if(!stored.files.length)return;checked(await db.storage.from(BUCKET).remove(stored.files));checked(await db.from('mqd_shirt_game_assets').delete().in('path',stored.files))},
  async saveDraft(record,buyer,seat){checked(await db.from('mqd_shirt_game_drafts').insert({id:record.id,game_id:record.gameId,buyer_seat:seat,buyer_id:buyer,snapshot:record}))},
  async paidOrders(){
   const rows=checked(await db.from('mqd_shirt_game_drafts').select('id,game_id,buyer_seat,created_at,order:mqd_orders!inner(id,order_number,status,product_id,product_name,paid_at,is_test,stripe_payment_status,customer_name,customer_email,shipping_name,shipping_address)').not('order_id','is',null).eq('order.is_test',false).eq('order.stripe_payment_status','paid').not('order.paid_at','is',null).order('created_at',{ascending:false}).limit(100));
   return rows.map(row=>({id:row.id,gameId:row.game_id,buyerSeat:row.buyer_seat,createdAt:row.created_at,order:row.order,manufacturingReady:false}));
  },
  async proofDrafts(){const rows=checked(await db.from('mqd_shirt_game_drafts').select('id,game_id,buyer_seat,created_at,snapshot').eq('is_test',false).order('created_at',{ascending:false}).limit(30));return rows.map(r=>({id:r.id,reference:r.snapshot.reference,product:r.snapshot.product,size:r.snapshot.size,color:r.snapshot.color,gameType:r.snapshot.gameType,createdAt:r.created_at}))},
  async productionRecord(row,order,proof){
   const record=structuredClone(row.snapshot),snapshotHash=productionReviewHash(record),mappingHash=templateHash(record);
   for(const item of record.productionContributions||[]){const photo=item.contribution?.photo;if(!photo)continue;for(const value of [photo,photo.source].filter(Boolean)){const path=String(value.url||'');if(!path.startsWith('game-asset:'+row.game_id+'/')||path.includes('..'))throw new GameError('Production photo access denied',403);value.url=checked(await db.storage.from(BUCKET).createSignedUrl(path.slice(11),300)).signedUrl}}
   const settings=await this.settings();return {order,record,snapshotHash,templateHash:mappingHash,layoutVersion:PRINT_LAYOUT_VERSION,proof,manufacturingReady:!proof&&settings.verified_templates?.[record.product]===mappingHash};
  },
  async proofDetail(id){const row=checked(await db.from('mqd_shirt_game_drafts').select('id,game_id,snapshot').eq('id',id).maybeSingle());if(!row||row.snapshot.snapshot?.status!=='revealed'||!row.snapshot.snapshot?.approved)throw new GameError('Approved game draft required',409);return this.productionRecord(row,null,true)},
  async paidDetail(id){
   const row=checked(await db.from('mqd_shirt_game_drafts').select('id,game_id,snapshot,order:mqd_orders!inner(id,order_number,status,product_id,product_name,paid_at,is_test,stripe_payment_status,customer_name,customer_email,shipping_name,shipping_address)').eq('id',id).eq('order.is_test',false).eq('order.stripe_payment_status','paid').not('order.paid_at','is',null).maybeSingle());
   if(!row)throw new GameError('Verified paid game order required',409);
   return this.productionRecord(row,row.order,false);
  }
 };
}
