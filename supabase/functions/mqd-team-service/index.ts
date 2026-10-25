import {ownerWorkspace,publicTeamShop,ownerGarmentCheckout} from '../_shared/mqd-owner-workspace.js';
import {verifyTeamProduction,packageTeamMaster} from '../_shared/mqd-team-production.js';
import {validateTeamMaster,assertTeamMemberCopy} from '../_shared/mqd-team-masters.js';
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import Stripe from 'npm:stripe@22.6.0';
import JSZip from 'npm:jszip@3.10.1';
import {hasAdminMfa} from './admin-security.js';
import {batchDraft,teamAccess,nextMonthReward,TEAM_POLICY_VERSION,TEAM_BATCH_SHIPPING_CENTS,TEAM_REWARD_QUANTITY} from './contract.js';
import {BASE_URL,PUBLIC_KEY,hash,objectId,teamConfig,canonicalTeamShop,teamPriceCatalog,teamQuote,teamMail,checked,safeAccount,TEAM_3D_GARMENTS,copyOwnerGarmentMaster} from './runtime.js';
import {shippingCentsForQuantity} from '../_shared/mqd-shipping.js';
import {assertFixedLogoPackage,garmentLogo,garmentLogoPath,validPhone} from '../mqd-print-shop-pilot/contract.js';
const ALLOWED=new Set([BASE_URL,'http://127.0.0.1:8776','http://localhost:8776','http://127.0.0.1:8765']);
const uuid=(v:any)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const identifier=(id:string)=>'mqd-teams-'+id.replaceAll('-','').slice(0,8).replace(/[0-9]/g,n=>String.fromCharCode(97+Number(n)));
async function bodyBytes(req:Request,max:number){const reader=req.body?.getReader();if(!reader)throw new Error('Request body required');const pieces:Uint8Array[]= [];let n=0;while(true){const part=await reader.read();if(part.done)break;n+=part.value.length;if(n>max){await reader.cancel();throw new Error('Request is too large.');}pieces.push(part.value);}const bytes=new Uint8Array(n);let offset=0;for(const part of pieces){bytes.set(part,offset);offset+=part.length;}return bytes;}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'',cors:any={'Vary':'Origin','Content-Type':'application/json','Cache-Control':'no-store'};
 const json=(v:any,status=200)=>new Response(JSON.stringify(v),{status,headers:cors});
 if(origin&&!ALLOWED.has(origin))return json({error:'Origin unavailable.'},403);
 if(origin){cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='apikey,authorization,content-type,x-mqd-master';cors['Access-Control-Allow-Methods']='GET,POST,OPTIONS';}
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.headers.get('apikey')!==PUBLIC_KEY)return json({error:'Application key required.'},401);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 try{
  const config=await teamConfig(db);const stripe=config.ready?new Stripe(config.key,{apiVersion:'2026-08-26.dahlia',httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2}):null;
  if(req.method==='GET'){if(new URL(req.url).searchParams.get('catalog')==='1')return json(teamPriceCatalog());
   const slug=new URL(req.url).searchParams.get('team');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))throw new Error('Choose a team link.');
   const a=await checked(db.from('mqd_team_accounts').select('*').eq('shop_config->>slug',slug).eq('livemode',config.live).neq('status','closed').maybeSingle());
   const business=a?await checked(db.from('mqd_print_shop_businesses').select('id,status,email_verified_at,shop_config').eq('id',a.team_id).maybeSingle()):null;
   if(a?.shop_config?.ownerManaged){
    const published=business?.shop_config?.ownerPublished;
    if(!published||business.status==='closed')return json({error:'Design review is not published.'},404);
    const shop=publicTeamShop(published.shop),params=new URL(req.url).searchParams,productId=params.get('garment')||Object.keys(shop.garments)[0];
    if(!params.get('version')&&!shop.garments[productId])return json({error:'This garment is not published for this team.'},404);
    const version=params.get('version')||(published.masterVersionIds?published.masterVersionIds[productId]:published.masterVersionId);
    const master=version?await checked(db.from('mqd_team_master_versions').select('*').eq('id',version).eq('team_id',a.team_id).single()):null;
    return json({shop,master,batches:[],mode:config.mode,reviewOnly:!(config.enabled&&ownerGarmentCheckout(a,business)),kind:business.shop_config.pilotKind});
   }
   if(!business||business.status==='closed'||!business.email_verified_at)return json({error:'Team unavailable.'},404);
   if(!a||!config.enabled||!teamAccess(a))return json({error:'This team link is not active.'},404);
   const batches=await checked(db.from('mqd_team_batches').select('id,cutoff_at,max_quantity,expected_quantity').eq('team_id',a.team_id).eq('status','open').gt('cutoff_at',new Date().toISOString()).eq('shipping_refunded',false));
   const publicShop=canonicalTeamShop(a.shop_config);
   const versionId=publicShop.engines.includes('3d')?(new URL(req.url).searchParams.get('version')||a.master_version_id):null;
   const master=versionId?await checked(db.from('mqd_team_master_versions').select('*').eq('id',versionId).eq('team_id',a.team_id).maybeSingle()):null;
   if(versionId&&!master)return json({error:'Team master unavailable.'},404);
   return json({shop:publicTeamShop(publicShop),batches,mode:config.mode,master});
  }
  if(req.method!=='POST')return json({error:'Method unavailable.'},405);
  const bytes=await bodyBytes(req,req.headers.get('content-type')?.includes('multipart/form-data')?51*1024*1024:(req.headers.get('x-mqd-master')==='1'?48*1024*1024:15000));
  const isForm=req.headers.get('content-type')?.includes('multipart/form-data');const form=isForm?await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData():null;
  if(form&&String(form.get('payload')||'').length>20000)throw new Error('Order details are too large.');
  const body=form?JSON.parse(String(form.get('payload')||'')):JSON.parse(new TextDecoder().decode(bytes));
  const adminAction=String(body.action||'').startsWith('admin-');let actor:any=null;
  if(adminAction){const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';const auth=await db.auth.getUser(token);if(auth.error||auth.data.user?.app_metadata?.role!=='admin'||!await hasAdminMfa(db,token))return json({error:'Owner administrator sign-in and MFA required.'},403);actor=auth.data.user;}
   if(body.action==='admin-master-load'&&body.metadataOnly===true){
    if(!uuid(body.id))throw new Error('Choose an owner workspace.');
    const metadata=await checked(db.from('mqd_print_shop_businesses').select('id,status,owner_managed:shop_config->>ownerManaged,editing_mode:shop_config->>editingMode').eq('id',body.id).maybeSingle());
    if(metadata?.status==='closed'||String(metadata?.owner_managed)!=='true'||metadata?.editing_mode!=='strict'||!Object.hasOwn(TEAM_3D_GARMENTS,body.productId))throw new Error('Choose a supported owner garment.');
    const primary=await checked(db.from('mqd_team_master_drafts').select('revision,product_id:draft->payload->product->>id').eq('team_id',body.id).maybeSingle());
    const primaryProduct=primary?.product_id;
    const row=primaryProduct===body.productId?primary:await checked(db.from('mqd_team_garment_master_drafts').select('revision').eq('team_id',body.id).eq('product_id',body.productId).maybeSingle());
    return json({hasDraft:!!row,revision:row?.revision||0,productId:body.productId});
   }
  if(['master-save','master-load'].includes(body.action))return json({error:'Only the MQD owner/admin can create, edit or publish a master. Send change requests to MQD.'},403);
  if(body.action==='admin-workspace-list')return json({workspaces:await checked(db.from('mqd_print_shop_businesses').select('id,revision,name:shop_config->>name,slug:shop_config->>slug,kind:shop_config->>pilotKind,updated_at').eq('shop_config->>ownerManaged','true').order('updated_at',{ascending:false}).limit(50))});
  if(['admin-workspace-save','admin-workspace-load','admin-workspace-publish','admin-workspace-unpublish'].includes(body.action)){
   if(!uuid(body.id))throw new Error('Choose an owner workspace.');
   const prior=await checked(db.from('mqd_print_shop_businesses').select('*').eq('id',body.id).maybeSingle());
   if(prior&&!prior.shop_config?.ownerManaged)return json({error:'This setup is managed through its existing Team workflow.'},409);
   if(body.action==='admin-workspace-save'){
    if(!Number.isInteger(body.revision)||body.revision<0)throw new Error('Reload before saving.');
    const {contact,shop}=ownerWorkspace(body.packet,body.kind,body.editingMode);
    if(prior&&(prior.revision!==body.revision||prior.preferred_slug!==shop.slug))throw new Error('Workspace changed, or link name changed. Reload before saving.');
    const duplicates=await checked(db.from('mqd_print_shop_businesses').select('id').eq('preferred_slug',shop.slug).neq('status','closed'));
    if(duplicates.some((r:any)=>r.id!==body.id))throw new Error('This link name is already reserved. Choose another.');
    if(prior?.shop_config.ownerPublished)shop.ownerPublished=prior.shop_config.ownerPublished;
    const revision=body.revision+1,values={owner_email:contact.requestEmail,owner_phone:contact.phone,shop_config:shop,revision,updated_at:new Date().toISOString()};
    if(prior)await checked(db.from('mqd_print_shop_businesses').update(values).eq('id',body.id).eq('revision',body.revision).select('id').single(),'Workspace changed. Reload before saving.');
    else{
     if(body.revision!==0)throw new Error('Workspace unavailable.');
     await checked(db.from('mqd_print_shop_businesses').insert({id:body.id,preferred_slug:shop.slug,plan:'3d',...values,payload_hash:'owner-workspace',ip_hash:'owner:'+actor.id,mail_origin:BASE_URL,token_hash:await hash(crypto.randomUUID()+crypto.randomUUID()),token_cipher:{},token_expires_at:new Date().toISOString()}));
    }
    // Recoverable two-step create: no public link exists until explicit publish. Never overwrite account/order state.
    await checked(db.from('mqd_team_accounts').upsert({team_id:body.id,shop_config:{...shop,ownerPublished:undefined},livemode:config.live},{onConflict:'team_id',ignoreDuplicates:true}));
    return json({id:body.id,revision,message:'Owner draft saved. No email, subscription or payment was created.'});
   }
   if(!prior)return json({error:'Owner workspace unavailable.'},404);
   const account=await checked(db.from('mqd_team_accounts').select('team_id,master_version_id').eq('team_id',body.id).maybeSingle());
   if(body.action==='admin-workspace-load'){const draftShop=structuredClone(prior.shop_config);delete draftShop.ownerPublished;return json({id:body.id,revision:prior.revision,kind:prior.shop_config.pilotKind,editingMode:prior.shop_config.editingMode,packet:{schema:'mqd-business-setup-v1',plan:'3d',owner:{requestEmail:prior.owner_email,phone:prior.owner_phone,...prior.shop_config.ownerRequest},shop:draftShop},masterVersionId:account?.master_version_id,published:!!prior.shop_config.ownerPublished,organizerFeeWaived:prior.shop_config.ownerPublished?.organizerFeeWaived===true});}
   if(body.revision!==prior.revision)throw new Error('Workspace changed. Reload before publishing.');
   if(!account)throw new Error('Save this draft again to finish creating its account.');
   const shop=structuredClone(prior.shop_config);
   if(body.action==='admin-workspace-publish'&&body.savedMasterRevisions){
    if(prior.shop_config.editingMode!=='strict')throw new Error('Saved garment publishing requires strict masters.');
    if(body.organizerFeeWaived!==undefined&&typeof body.organizerFeeWaived!=='boolean')throw new Error('Choose review-only or free organizer access.');
    const checkedShop=ownerWorkspace({schema:'mqd-business-setup-v1',plan:'3d',owner:{requestEmail:prior.owner_email,phone:prior.owner_phone},shop},shop.pilotKind,shop.editingMode).shop;
    const saved=await checked(db.rpc('mqd_publish_owner_saved_masters',{p_team:body.id,p_revision:prior.revision,p_expected:body.savedMasterRevisions,p_public_shop:publicTeamShop(checkedShop),p_waive:body.organizerFeeWaived===true,p_actor:actor.id}),'Saved masters could not be published. Reopen to confirm their latest revisions.');
    return json({...saved,url:BASE_URL+'/teams/'+encodeURIComponent(shop.slug)+'/3d',message:body.organizerFeeWaived?'Customer link published with free organizer access. Garments and shipping use normal prices. No subscription, charge or invitation was created.':'Design review published. Checkout is disabled.'});
   }
   if(body.action==='admin-workspace-publish'){
    let masterVersionId=null,masterVersionIds=null;
    if(shop.editingMode==='strict'){
     masterVersionIds={};
     if(account.master_version_id){const primary=await checked(db.from('mqd_team_master_versions').select('*').eq('id',account.master_version_id).eq('team_id',body.id).single());masterVersionIds[primary.payload.product.id]=primary.id;}
     const extra=await checked(db.from('mqd_team_garment_master_drafts').select('product_id,version_id').eq('team_id',body.id));
     for(const row of extra)if(row.version_id)masterVersionIds[row.product_id]=row.version_id;
     const expected=body.expectedMasterVersionIds||(body.expectedMasterVersionId?{[Object.keys(shop.garments)[0]]:body.expectedMasterVersionId}:null);
     if(Object.keys(shop.garments).length>1&&!expected)throw new Error('Confirm the saved master version for every enabled garment before publishing.');
     for(const product of Object.keys(shop.garments)){
      const version=masterVersionIds[product];if(!version)throw new Error('Save and prepare the master for '+product+' before publishing.');
      if(expected&&expected[product]!==version)throw new Error('Published master changed. Reopen this setup before publishing the review link.');
      const master=await checked(db.from('mqd_team_master_versions').select('*').eq('id',version).eq('team_id',body.id).single());validateTeamMaster(master);if(master.payload.product.id!==product)throw new Error('The master garment must match the saved setup.');
     }
     masterVersionIds=Object.fromEntries(Object.keys(shop.garments).map(product=>[product,masterVersionIds[product]]));masterVersionId=masterVersionIds[Object.keys(shop.garments)[0]];
    }
    const checkedShop=ownerWorkspace({schema:'mqd-business-setup-v1',plan:'3d',owner:{requestEmail:prior.owner_email,phone:prior.owner_phone},shop},shop.pilotKind,shop.editingMode).shop;
    shop.ownerPublished={shop:publicTeamShop(checkedShop),masterVersionId,masterVersionIds,publishedAt:new Date().toISOString()};
   }else delete shop.ownerPublished;
   const saved=await checked(db.from('mqd_print_shop_businesses').update({shop_config:shop,revision:prior.revision+1,updated_at:new Date().toISOString()}).eq('id',body.id).eq('revision',prior.revision).select('id').single(),'Workspace changed. Reload before publishing.');
   return json({id:saved.id,revision:prior.revision+1,url:shop.ownerPublished?BASE_URL+'/teams/'+encodeURIComponent(shop.slug)+(shop.engines.includes('2d')?'':'/3d'):null,message:shop.ownerPublished?'Design review published. Checkout is disabled. Share this link yourself; no invitation was sent.':'Design review unpublished.'});
  }
  if(body.action==='admin-list'){
   const accounts=await checked(db.from('mqd_team_accounts').select('team_id,status,billing_status,period_start,period_end,cancel_at_period_end,name:shop_config->>name,slug:shop_config->>slug,ownerManaged:shop_config->>ownerManaged').eq('livemode',config.live).order('created_at',{ascending:false}).limit(100));
   const batches=await checked(db.from('mqd_team_batches').select('*').eq('livemode',config.live).order('created_at',{ascending:false}).limit(100));
   const orders=await checked(db.from('mqd_team_orders').select('id,team_id,batch_id,customer,summary,quantity,delivery,garment_cents,shipping_cents,payment_status,production_status,paid_at,refunded_quantity,disputed,tracking,shipping_address').eq('livemode',config.live).order('created_at',{ascending:false}).limit(200));
   const otherModeAccounts=await checked(db.from('mqd_team_accounts').select('team_id').eq('livemode',!config.live));
   const otherModeIds=new Set(otherModeAccounts.map((a:any)=>a.team_id));
   const pending=(await checked(db.rpc('mqd_team_pending_metadata'))).filter((p:any)=>!otherModeIds.has(p.id)&&!accounts.some((a:any)=>a.team_id===p.id&&a.ownerManaged==='true'));
   return json({pending,accounts:accounts.filter((a:any)=>a.ownerManaged!=='true').map((a:any)=>({...safeAccount(a),name:a.name,slug:a.slug})),batches,orders,enabled:config.enabled,mode:config.mode});
  }
  if(body.action==='order-status'){
   if(!uuid(body.id)||!/^[a-f0-9]{64}$/.test(body.guestToken||''))return json({error:'Private order access required.'},401);
   const o=await checked(db.from('mqd_team_orders').select('*').eq('id',body.id).eq('livemode',config.live).eq('guest_token_hash',await hash(body.guestToken)).maybeSingle());if(!o)return json({error:'Order unavailable.'},404);
   return json({id:o.id,paymentStatus:o.payment_status,productionStatus:o.production_status,quantity:o.quantity,delivery:o.delivery,tracking:o.tracking});
  }
  if(body.action==='order-checkout'){
   if(!config.enabled||!stripe)return json({error:'Team checkout is not enabled yet.'},503);
   if(!form||!uuid(body.requestId)||!/^[a-f0-9]{64}$/.test(body.guestToken||''))throw new Error('Valid private order session required.');
   if(body.website||!Number.isFinite(body.startedAt)||Date.now()-body.startedAt<2000||Date.now()-body.startedAt>86400000)throw new Error('Refresh and review the order form.');
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.team||''))throw new Error('Choose a valid Team link.');
   const account=await checked(db.from('mqd_team_accounts').select('*').eq('shop_config->>slug',body.team).eq('livemode',config.live).neq('status','closed').maybeSingle());const ownerBusiness=account?.shop_config?.ownerManaged?await checked(db.from('mqd_print_shop_businesses').select('status,shop_config').eq('id',account.team_id).maybeSingle()):null;
   const waived=ownerGarmentCheckout(account,ownerBusiness);
   if(account?.shop_config?.ownerManaged&&!waived)return json({error:'This owner-managed design review does not support checkout.'},409);
   if(!waived&&!teamAccess(account))return json({error:'Team subscription is inactive.'},409);
   const rawSummary=body.summary,rawCustomer=body.customer,summary={engine:rawSummary?.engine,productId:rawSummary?.productId,color:rawSummary?.color,printMethod:rawSummary?.printMethod,locations:rawSummary?.locations,orderOptions:Array.isArray(rawSummary?.orderOptions)?rawSummary.orderOptions.map((o:any)=>({size:o.size,quantity:o.quantity})):null} as any;
   const customer={name:rawCustomer?.name,email:rawCustomer?.email,phone:rawCustomer?.phone,notes:rawCustomer?.notes};
   const shop=canonicalTeamShop(waived?ownerBusiness.shop_config.ownerPublished.shop:account.shop_config),quote=teamQuote(shop,summary);summary.productName=shop.productNames[summary.productId];summary.garment=shop.garments[summary.productId];
   if(typeof customer?.name!=='string'||!customer.name.trim()||customer.name.length>100||typeof customer.email!=='string'||customer.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)||!validPhone(customer.phone)||typeof customer.notes!=='string'||customer.notes.length>1500)throw new Error('Enter valid customer name, email and phone.');
   if(!['team','individual'].includes(body.delivery)||body.delivery==='team'&&!uuid(body.batchId))throw new Error('Choose your delivery option.');
   const file=form.get('package');if(!(file instanceof File)||file.size<22||file.size>50*1024*1024)throw new Error('The production ZIP exceeds 50 MB. Keep originals intact and contact MYMERCHNOW.');
   const packageBytes=new Uint8Array(await file.arrayBuffer()),zip=await JSZip.loadAsync(packageBytes),entries:any[]=Object.values(zip.files).filter((f:any)=>!f.dir);
   if(entries.length>500||entries.some((f:any)=>f.name.includes('..')||f.name.startsWith('/')||!/^([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(json|txt|png|jpg|jpeg|webp|woff2|css)$/i.test(f.name))||entries.reduce((sum,f)=>sum+(f._data?.uncompressedSize||0),0)>128*1024*1024)throw new Error('Design package is invalid.');
   const designFile:any=zip.file('design.json'),orderFile:any=zip.file('order-request.json');if(!designFile||!orderFile||designFile._data.uncompressedSize>48*1024*1024||orderFile._data.uncompressedSize>20000)throw new Error('Design details are missing.');
   const design=JSON.parse(await designFile.async('string')),order=JSON.parse(await orderFile.async('string'));
   if(design.schema!=='mqd-shop-design-v1'||design.shop!==body.team||design.engine!==summary.engine||order.productId!==summary.productId||order.printMethod!==summary.printMethod||JSON.stringify(order.orderOptions)!==JSON.stringify(summary.orderOptions)||(summary.engine==='2d'?design.draft?.product:design.design?.product?.id)!==summary.productId)throw new Error('Design and order do not match.');
   let purchasedMaster=null;
   const masterRef=design.design?.design?.teamMaster;
   if(account.master_version_id&&shop.engines.includes('3d')||masterRef){
    if(summary.engine!=='3d'||!uuid(masterRef?.versionId))throw new Error('Open the team master and personalize your own copy.');
    purchasedMaster=await checked(db.from('mqd_team_master_versions').select('*').eq('id',masterRef.versionId).eq('team_id',account.team_id).maybeSingle());
    if(!purchasedMaster)throw new Error('Team master version unavailable.');
    assertTeamMemberCopy(design.design,purchasedMaster);
    summary.master={versionId:purchasedMaster.id,copyId:masterRef.copyId,name:purchasedMaster.name};
   }
   const zoneMap={'Front':'front','Back':'back','Left Sleeve':'left','Right Sleeve':'right'};
   let actualLocations:string[]=[];
   if(summary.engine==='2d'){
    if(design.draft?.color!==summary.color||design.draft?.printMethod!==summary.printMethod)throw new Error('Design options do not match.');
    for(const view of ['front','back','left','right']){const art=design.draft?.artwork?.[view],hasImage=!!design.files?.[view]?.path;
     if(hasImage&&!zip.file(design.files[view].path))throw new Error('Original artwork is missing.');
     if(hasImage||art?.texts?.length)actualLocations.push(view);
     for(const item of [...(hasImage?[art]:[]),...(art?.texts||[])]){const box=shop.garments[summary.productId].printZones?.[view];const placement=item.placement;if(!box||!placement||['x','y','width','height'].some(k=>!Number.isFinite(placement[k]))||placement.width<=0||placement.height<=0)throw new Error('Artwork placement is invalid.');}
    }
   }else{
    for(const [zone,state] of Object.entries(design.design?.design?.zones||{}) as any){
     if(state.layers?.length||state.background&&state.background.toLowerCase()!=='#ffffff')actualLocations.push((zoneMap as any)[zone]||zone.toLowerCase());
     for(const layer of state.layers||[])if(layer.libraryAssetId||layer.type==='image'&&!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(layer.src||''))throw new Error('Original uploaded artwork is required.');
    }
   }
   if(!purchasedMaster&&garmentLogo(shop,summary.productId).mode==='fixed'&&!actualLocations.includes('front'))actualLocations.push('front');
   if(JSON.stringify([...actualLocations].sort())!==JSON.stringify([...summary.locations].sort()))throw new Error('Print areas do not match the design.');
   if(!purchasedMaster&&garmentLogo(shop,summary.productId).mode==='fixed'){
    const manifest:any=zip.file('brand/logo-placement.json'),asset=zip.file(garmentLogoPath(shop));if(!manifest||!asset||manifest._data.uncompressedSize>3000)throw new Error('Fixed logo is missing.');assertFixedLogoPackage(shop,summary,design,JSON.parse(await manifest.async('string')));
    if(await hash(await asset.async('uint8array'))!==await hash(Uint8Array.from(atob(shop.garmentLogo.split(',')[1]),c=>c.charCodeAt(0))))throw new Error('Fixed logo has changed.');
   }
   const productionManifest=await verifyTeamProduction(zip,design,shop);
   if(productionManifest)zip.file('production-manifest.json',JSON.stringify(productionManifest,null,2));
   const guestHash=await hash(body.guestToken),requestHash=await hash(JSON.stringify({team:body.team,customer,summary,delivery:body.delivery,batchId:body.batchId||null,packageHash:await hash(packageBytes)}));
   const ipHash=await hash((req.headers.get('x-forwarded-for')||'unknown').split(',')[0]);
   const count=await db.from('mqd_team_orders').select('id',{head:true,count:'exact'}).eq('ip_hash',ipHash).gte('created_at',new Date(Date.now()-86400000).toISOString());if(count.error)throw count.error;if((count.count||0)>100)return json({error:'Too many order attempts. Contact MYMERCHNOW.'},429);
   const shipping=body.delivery==='individual'?shippingCentsForQuantity(quote.totalQuantity):0,path=config.mode+'/'+account.team_id+'/'+body.requestId+'.zip';
   const reserve=await db.rpc('mqd_reserve_team_order',{p_order:{id:body.requestId,team_id:account.team_id,batch_id:body.delivery==='team'?body.batchId:null,livemode:config.live,request_hash:requestHash,ip_hash:ipHash,guest_token_hash:guestHash,customer,summary,delivery:body.delivery,quantity:quote.totalQuantity,garment_cents:quote.totalCents,shipping_cents:shipping,package_path:path}});if(reserve.error)throw new Error(reserve.error.message);const stored=reserve.data;
   if(stored.payment_status==='paid')return json({paid:true,id:stored.id});
   if(stored.checkout_id){const existing=await stripe.checkout.sessions.retrieve(stored.checkout_id);if(existing.status==='open'&&existing.url)return json({url:existing.url,id:stored.id});return json({error:'This checkout has ended. Start a new order.'},409);}
   if(purchasedMaster)await packageTeamMaster(zip,purchasedMaster,productionManifest);
   zip.file('verified-team-order.json',JSON.stringify({orderId:stored.id,teamId:stored.team_id,summary:stored.summary,delivery:stored.delivery,batchId:stored.batch_id,garmentCents:stored.garment_cents,shippingCents:stored.shipping_cents,status:'payment-confirmation-required',productionNote:'Use this server-verified garment and size information; review original artwork before printing.'},null,2));const verifiedBytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});if(verifiedBytes.length>50*1024*1024)throw new Error('Production package exceeds 50 MB. Keep originals intact and contact MYMERCHNOW.');
   const upload=await db.storage.from('mqd-team-production').upload(path,verifiedBytes,{contentType:'application/zip',upsert:false});if(upload.error&&upload.error.statusCode!=='409'&&!String(upload.error.message).includes('already exists'))throw new Error('Production package could not be saved.');
   const session=await stripe.checkout.sessions.create({mode:'payment',line_items:[{price_data:{currency:'usd',unit_amount:stored.garment_cents,product_data:{name:shop.name+' · '+summary.productName+' · '+stored.quantity+' garment(s)'}},quantity:1}],customer_email:customer.email,phone_number_collection:{enabled:true},automatic_tax:{enabled:false},expires_at:Math.floor(Date.now()/1000)+2100,
    ...(body.delivery==='individual'?{shipping_address_collection:{allowed_countries:['US']},shipping_options:[{shipping_rate_data:{type:'fixed_amount',fixed_amount:{amount:stored.shipping_cents,currency:'usd'},display_name:'MYMERCHNOW standard shipping'}}]}:{}),
    client_reference_id:'MQD-TEAM-'+stored.id,integration_identifier:identifier(stored.id),metadata:{service:'mqd-teams',team:account.team_id,order:stored.id},payment_intent_data:{metadata:{service:'mqd-teams',team:account.team_id,order:stored.id}},success_url:(!config.live&&ALLOWED.has(origin)?origin:BASE_URL)+'/team-order.html?id='+stored.id,cancel_url:(!config.live&&ALLOWED.has(origin)?origin:BASE_URL)+'/teams/'+shop.slug+(summary.engine==='3d'?'/3d':'')},{idempotencyKey:'team-order-'+stored.id});
   if(session.livemode!==config.live||!session.url)throw new Error('Checkout environment mismatch.');
   await checked(db.from('mqd_team_orders').update({checkout_id:session.id,reserved_until:new Date(session.expires_at*1000).toISOString()}).eq('id',stored.id));return json({url:session.url,id:stored.id});
  }
  // All remaining operations address one team, with private owner-token access or fresh admin MFA.
  if(!uuid(body.id))throw new Error('Valid team identifier required.');
  const business=await checked(db.from('mqd_print_shop_businesses').select('*').eq('id',body.id).maybeSingle());
  if(!business||business.shop_config?.organizationType!=='team'&&business.pending_config?.organizationType!=='team')return json({error:'Team setup unavailable.'},404);
  if(!adminAction){if(!/^[a-f0-9]{64}$/.test(body.token||'')||await hash(body.token)!==business.token_hash||Date.parse(business.token_expires_at)<=Date.now()||!business.email_verified_at)return json({error:'Confirm your email using the private setup link.'},401);}
  let account=await checked(db.from('mqd_team_accounts').select('*').eq('team_id',body.id).maybeSingle());
  if(account?.shop_config?.ownerManaged&&!['admin-master-load','admin-master-save','admin-master-copy','admin-detail'].includes(body.action))return json({error:'Owner-managed design review: billing and commercial activation are unavailable.'},403);
  if(account&&!account.shop_config?.ownerManaged&&account.livemode!==config.live)return json({error:'Team unavailable.'},404);
  if(body.action==='admin-detail')return json({setup:{schema:'mqd-business-setup-v1',plan:'3d',owner:{requestEmail:business.owner_email,phone:business.owner_phone},shop:canonicalTeamShop(business.shop_config.ownerManaged?business.shop_config:business.pending_config||business.shop_config)}});
  if(body.action==='admin-approve'){
   if(!business.email_verified_at||body.revision!==business.revision||body.confirm!==business.preferred_slug)throw new Error('Confirm the verified team and current setup revision.');
   
   const shop=canonicalTeamShop(business.pending_config||business.shop_config);shop.teamEnvironment=config.mode;const approval=await db.rpc('mqd_approve_team',{p_team:body.id,p_revision:body.revision,p_config:shop});if(approval.error)throw new Error(approval.error.message);account=approval.data;
   await checked(db.from('mqd_team_actions').insert({id:crypto.randomUUID(),team_id:body.id,actor_id:actor.id,action:'approve-team',details:{revision:business.revision}}));return json({account:safeAccount(account)});
  }
  if(!account)return json({error:'Your team is awaiting MYMERCHNOW approval.'},409);
  if(body.action==='admin-master-copy'){
   if(business.shop_config.ownerManaged!==true||business.shop_config.editingMode!=='strict')throw new Error('Only an MQD owner strict workspace supports private garment copies.');
   const primary=await checked(db.from('mqd_team_master_drafts').select('revision,draft').eq('team_id',body.id).maybeSingle());
   const source=primary?.draft?.payload?.product?.id===body.sourceProductId?primary:await checked(db.from('mqd_team_garment_master_drafts').select('revision,draft').eq('team_id',body.id).eq('product_id',body.sourceProductId).maybeSingle());
   if(!source?.draft||body.sourceRevision!==source.revision)throw new Error('The saved source master changed. Load its current revision before copying.');
   if(!Array.isArray(body.targets)||!body.targets.length||body.targets.length>4||new Set(body.targets).size!==body.targets.length||body.targets.some((p:any)=>!Object.hasOwn(TEAM_3D_GARMENTS,p)||p===body.sourceProductId))throw new Error('Choose distinct supported destination garments.');
   const copies=[];for(const productId of body.targets){const existing=productId===primary?.draft?.payload?.product?.id?primary:await checked(db.from('mqd_team_garment_master_drafts').select('revision').eq('team_id',body.id).eq('product_id',productId).maybeSingle());if(existing)throw new Error('A '+TEAM_3D_GARMENTS[productId]+' draft already exists. It was not replaced.');copies.push({productId,draft:copyOwnerGarmentMaster(source.draft,productId,body.movableTextLayers||[])});}
   const created=[];for(const copy of copies){copy.draft.copiedFrom={productId:body.sourceProductId,revision:source.revision};const saved=await db.rpc('mqd_save_owner_garment_master',{p_team:body.id,p_product:copy.productId,p_revision:0,p_draft:copy.draft,p_publish:false,p_version:crypto.randomUUID()});if(saved.error)return json({error:'Copying stopped. Created drafts were retained; reopen each destination before retrying.',created},409);created.push({productId:copy.productId,revision:saved.data.revision});}
   return json({created,sourceProductId:body.sourceProductId,sourceRevision:source.revision,message:'Private garment drafts copied from saved revision '+source.revision+'. Review every garment and save final placements yourself. Nothing published.'});
  }
  if(['admin-master-load','admin-master-save'].includes(body.action)){
   const primary=await checked(db.from('mqd_team_master_drafts').select('revision,draft').eq('team_id',body.id).maybeSingle()),owner=business.shop_config.ownerManaged===true;
   const shop=canonicalTeamShop(owner?business.shop_config:account.shop_config),primaryProduct=primary?.draft?.payload?.product?.id||Object.keys(shop.garments)[0];
   const product=body.productId||(body.action==='admin-master-save'?body.draft?.payload?.product?.id:primaryProduct);
   if(owner&&(!Object.hasOwn(TEAM_3D_GARMENTS,product)||shop.editingMode!=='strict'))throw new Error('Choose a supported strict-master garment.');
   const extra=owner&&product!==primary?.draft?.payload?.product?.id?await checked(db.from('mqd_team_garment_master_drafts').select('revision,draft,version_id').eq('team_id',body.id).eq('product_id',product).maybeSingle()):null;
   const secondary=owner&&(!!extra||product!==primaryProduct),current=secondary?extra:primary;
   if(body.action==='admin-master-load')return json({...(body.metadataOnly?{hasDraft:!!current?.draft}:{draft:current?.draft||null}),revision:current?.revision||0,productId:product,versionId:secondary?extra?.version_id||null:account.master_version_id||null});
   if(!Number.isInteger(body.revision)||body.revision<0||typeof body.publish!=='boolean')throw new Error('Reload the current master before saving.');
   const draft=validateTeamMaster(body.draft);
   if(product!==draft.payload.product.id)throw new Error('The saved garment must match this editor.');
   if(!shop.engines.includes('3d')||(!shop.garments[product]&&(!owner||body.publish)))throw new Error('Choose a garment approved for this team.');
   const params={p_team:body.id,p_revision:body.revision,p_draft:draft,p_publish:body.publish,p_version:crypto.randomUUID()};
   const saved=await db.rpc(secondary?'mqd_save_owner_garment_master':'mqd_save_team_master',secondary?{...params,p_product:product}:params);
   if(saved.error?.message==='Master changed. Reload before saving.')return json({code:'master_revision_conflict',error:'A newer master draft was saved. Your canvas is unchanged. Open the latest saved draft separately to compare before continuing.'},409);
   if(saved.error)throw new Error('Team data could not be saved. Your canvas is unchanged. Keep this page open or compare the latest saved draft in a separate tab.');
   return json(saved.data);
  }
  if(body.action==='owner-status'){
   const orders=await checked(db.from('mqd_team_orders').select('payment_status,paid_at,quantity,refunded_quantity,disputed,batch_id').eq('team_id',body.id));
   const batches=await checked(db.from('mqd_team_batches').select('id,status,days,expected_quantity,max_quantity,shipping_cents,shipping_paid_at,opens_at,cutoff_at,tracking').eq('team_id',body.id).order('created_at',{ascending:false}).limit(50));
   return json({account:safeAccount(account),name:account.shop_config.name,slug:business.preferred_slug,batches:batches.map((b:any)=>({...b,paidQuantity:orders.filter((o:any)=>o.batch_id===b.id&&o.payment_status==='paid'&&!o.disputed).reduce((n:number,o:any)=>n+o.quantity-o.refunded_quantity,0)})),reward:account.period_start&&account.period_end?nextMonthReward(orders,account.period_start,account.period_end):{garments:0,target:TEAM_REWARD_QUANTITY,remaining:TEAM_REWARD_QUANTITY,creditCents:0},enabled:config.enabled,mode:config.mode,policyVersion:TEAM_POLICY_VERSION});
  }
  if(body.action==='create-batch'){
   if(!teamAccess(account))throw new Error('An active Team subscription is required.');if(!uuid(body.requestId))throw new Error('A batch request identifier is required.');const draft=batchDraft(body.batch);
   const existing=await checked(db.from('mqd_team_batches').select('*').eq('id',body.requestId).maybeSingle());if(existing){if(existing.team_id!==body.id||Object.keys(draft.shipping_address).some(k=>existing.shipping_address[k]!==draft.shipping_address[k])||existing.days!==draft.days||existing.expected_quantity!==draft.expected_quantity)throw new Error('Batch retry mismatch');return json({batch:{id:existing.id,status:existing.status}});}
   const batch=await checked(db.from('mqd_team_batches').insert({id:body.requestId,team_id:body.id,livemode:config.live,...draft}).select('id,status').single());return json({batch,message:'Batch saved for MYMERCHNOW shipping-capacity review. Ordering has not opened.'});
  }
  if(body.action==='admin-approve-batch'){
   if(!uuid(body.batchId)||body.confirm!==business.preferred_slug||!Number.isInteger(body.maxQuantity)||body.maxQuantity<1||body.maxQuantity>500)throw new Error('Confirm this team and shipping capacity.');
   await checked(db.from('mqd_team_batches').update({status:'approved',approved_at:new Date().toISOString(),max_quantity:body.maxQuantity}).eq('id',body.batchId).eq('team_id',body.id).eq('status','awaiting_review').select('id').single());return json({approved:true});
  }
  if(['admin-pause-team','admin-resume-team','admin-terminate-team'].includes(body.action)){
   if(body.confirm!==business.preferred_slug)throw new Error('Confirm the Team link name.');
   if(body.action==='admin-pause-team')await checked(db.from('mqd_team_accounts').update({status:'paused',access_paused:true}).eq('team_id',body.id));
   if(body.action==='admin-resume-team'){if(account.status==='closed'||account.billing_status!=='active'||!(Date.parse(account.period_end)>Date.now()))throw new Error('An unexpired paid Team subscription is required.');await checked(db.from('mqd_team_accounts').update({status:'active',access_paused:false}).eq('team_id',body.id));}
   if(body.action==='admin-terminate-team'){
    if(!stripe||!config.enabled)throw new Error('Team billing connection required before termination.');
    if(account.stripe_subscription_id){const sub=await stripe.subscriptions.retrieve(account.stripe_subscription_id);if(sub.livemode!==config.live||objectId(sub.customer)!==account.stripe_customer_id||sub.items.data.length!==1||sub.items.data[0].price.id!==config.price)throw new Error('Team subscription ownership mismatch');if(sub.status!=='canceled')await stripe.subscriptions.cancel(sub.id,{invoice_now:false,prorate:false},{idempotencyKey:'team-terminate-'+body.id});}
    if(account.stripe_checkout_id){const checkout=await stripe.checkout.sessions.retrieve(account.stripe_checkout_id);if(checkout.livemode!==config.live||objectId(checkout.customer)!==account.stripe_customer_id)throw new Error('Checkout ownership mismatch');if(checkout.status==='open')await stripe.checkout.sessions.expire(checkout.id);else if(checkout.status==='complete'&&objectId(checkout.subscription)!==account.stripe_subscription_id)throw new Error('Payment confirmation is pending. Refresh billing before terminating.');}
    await checked(db.from('mqd_team_accounts').update({status:'closed',access_paused:true,billing_status:'canceled'}).eq('team_id',body.id));
   }
   await checked(db.from('mqd_team_actions').insert({id:crypto.randomUUID(),team_id:body.id,actor_id:actor.id,action:body.action}));return json({updated:true});
  }
  if(body.action==='admin-package'){
   const order=await checked(db.from('mqd_team_orders').select('package_path').eq('id',body.orderId).eq('team_id',body.id).eq('payment_status','paid').single());const result=await db.storage.from('mqd-team-production').createSignedUrl(order.package_path,300);if(result.error)throw new Error('Package download unavailable.');return json({url:result.data.signedUrl});
  }
  if(body.action==='admin-production'){
   if(!['in_production','shipped'].includes(body.status)||body.confirm!==business.preferred_slug||typeof(body.tracking||'')!=='string'||(body.tracking||'').length>200)throw new Error('Confirm the production update.');
   if(body.batchId){const batch=await checked(db.from('mqd_team_batches').select('*').eq('id',body.batchId).eq('team_id',body.id).single());if(!['closed','in_production'].includes(batch.status)||!batch.shipping_paid_at||batch.shipping_refunded)throw new Error('This batch is not ready for production.');await checked(db.from('mqd_team_batches').update({status:body.status,tracking:body.tracking||null}).eq('id',batch.id));await checked(db.from('mqd_team_orders').update({production_status:body.status,tracking:body.tracking||null}).eq('batch_id',batch.id).eq('payment_status','paid').eq('disputed',false).in('production_status',['ready','in_production']));}
   else await checked(db.from('mqd_team_orders').update({production_status:body.status,tracking:body.tracking||null}).eq('id',body.orderId).eq('team_id',body.id).eq('delivery','individual').eq('payment_status','paid').eq('disputed',false).in('production_status',['ready','in_production']).select('id').single());return json({updated:true});
  }
  if(!config.enabled||!stripe)return json({error:'Team payments are not enabled yet.'},503);
  const returnSite=!config.live&&ALLOWED.has(origin)?origin:BASE_URL;const ownerReturn=returnSite+'/team-owner.html?setupId='+body.id;
  if(body.action==='subscribe'){
   if(body.policyVersion!==TEAM_POLICY_VERSION)throw new Error('Read and accept the Team subscription terms.');if(account.status==='closed'||teamAccess(account)||account.stripe_subscription_id&&account.billing_status!=='canceled')throw new Error('Manage your existing Team subscription first.');
   const price=await stripe.prices.retrieve(config.price);if(price.livemode!==config.live||price.currency!=='usd'||price.unit_amount!==2000||price.recurring?.interval!=='month'||price.recurring.interval_count!==1)throw new Error('Team plan price is not configured correctly.');
   if(account.stripe_checkout_id){const previous=await stripe.checkout.sessions.retrieve(account.stripe_checkout_id);if(previous.status==='open'&&previous.url)return json({url:previous.url});}
   if(!account.stripe_customer_id){const customer=await stripe.customers.create({email:business.owner_email,name:account.shop_config.name,metadata:{service:'mqd-teams',team:body.id}},{idempotencyKey:'team-customer-'+body.id});await checked(db.from('mqd_team_accounts').update({stripe_customer_id:customer.id}).eq('team_id',body.id));account.stripe_customer_id=customer.id;}
   const session=await stripe.checkout.sessions.create({mode:'subscription',customer:account.stripe_customer_id,line_items:[{price:config.price,quantity:1}],subscription_data:{billing_mode:{type:'flexible'},metadata:{service:'mqd-teams',team:body.id}},automatic_tax:{enabled:false},integration_identifier:identifier(body.id),success_url:ownerReturn,cancel_url:ownerReturn},{idempotencyKey:'team-subscribe-'+body.id+'-'+(account.stripe_checkout_id||'first')});
   await checked(db.from('mqd_team_accounts').update({stripe_checkout_id:session.id,policy_version:TEAM_POLICY_VERSION,policy_accepted_at:new Date().toISOString()}).eq('team_id',body.id));return json({url:session.url});
  }
  if(body.action==='portal'){
   if(!account.stripe_customer_id)throw new Error('No Team billing account yet.');const portal=await stripe.billingPortal.sessions.create({customer:account.stripe_customer_id,configuration:config.portal,return_url:ownerReturn});return json({url:portal.url});
  }
  if(body.action==='open-funded-batch'){if(!teamAccess(account))throw new Error('Team subscription is inactive.');const b=await checked(db.from('mqd_team_batches').select('*').eq('id',body.batchId).eq('team_id',body.id).single());if(b.status!=='approved'||!b.shipping_paid_at||b.shipping_refunded||!b.max_quantity)throw new Error('This batch is not funded and approved.');const opened=await checked(db.rpc('mqd_open_team_batch',{p_team:body.id,p_batch:b.id,p_intent:b.shipping_payment_intent,p_paid_at:b.shipping_paid_at}));return json({opened:opened.status==='open',message:opened.status==='open'?'Batch opened.':'This funded batch is waiting for the current batch to close.'});}
  if(body.action==='batch-shipping'){
   if(!teamAccess(account))throw new Error('Team subscription is inactive.');const batch=await checked(db.from('mqd_team_batches').select('*').eq('id',body.batchId).eq('team_id',body.id).single());if(batch.status!=='approved'||batch.shipping_paid_at)throw new Error('This batch needs approval or is already funded.');
   if(batch.shipping_checkout_id){const prior=await stripe.checkout.sessions.retrieve(batch.shipping_checkout_id);if(prior.status==='open'&&prior.url)return json({url:prior.url});}
   const session=await stripe.checkout.sessions.create({mode:'payment',customer:account.stripe_customer_id,line_items:[{price_data:{currency:'usd',unit_amount:TEAM_BATCH_SHIPPING_CENTS,product_data:{name:'Combined team shipment · one batch'}},quantity:1}],automatic_tax:{enabled:false},metadata:{service:'mqd-teams',team:body.id,batch:batch.id},payment_intent_data:{metadata:{service:'mqd-teams',team:body.id,batch:batch.id}},integration_identifier:identifier(batch.id),success_url:ownerReturn,cancel_url:ownerReturn},{idempotencyKey:'team-batch-shipping-'+batch.id+'-'+(batch.shipping_checkout_id||'first')});await checked(db.from('mqd_team_batches').update({shipping_checkout_id:session.id}).eq('id',batch.id));return json({url:session.url});
  }
  if(body.action==='pause'||body.action==='resume'){
   if(!account.stripe_subscription_id)throw new Error('Start the Team subscription first.');
   const subscription=await stripe.subscriptions.retrieve(account.stripe_subscription_id);if(objectId(subscription.customer)!==account.stripe_customer_id||subscription.items.data.length!==1||subscription.items.data[0].price.id!==config.price||subscription.livemode!==config.live)throw new Error('Team subscription ownership mismatch.');
   if(body.action==='resume'&&(subscription.status==='canceled'||!teamAccess(account)))throw new Error('Use Start monthly subscription after the paid period ends.');
   await stripe.subscriptions.update(subscription.id,{cancel_at_period_end:body.action==='pause'},{idempotencyKey:'team-season-'+body.id+'-'+body.action+'-'+subscription.items.data[0].current_period_end});return json({message:body.action==='pause'?'Off-season pause scheduled for the end of the paid month. Existing paid orders remain in production.':'Scheduled pause canceled; monthly billing continues.'});
  }
  throw new Error('Unknown Team action.');
 }catch(error){const message=error instanceof Error?error.message:'Team request failed';if((error as any)?.type?.startsWith('Stripe'))return json({error:'Payment status could not be confirmed. Refresh your dashboard before retrying.'},502);return json({error:message.slice(0,220)},400);}
});
