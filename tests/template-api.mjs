import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
import {UUID,assertTemplateDraft,cloneTemplate,templateLayers} from '../v20/template-contract.js';
import {verifyTemplateOrder,prepareTemplateOrder} from '../supabase/functions/_shared/mqd-template-orders.js';
import {demoVersions} from '../v20/template-demo.js';
const owner=crypto.randomUUID(),other=crypto.randomUUID(),sourceId=crypto.randomUUID(),tables={mqd_shirt_templates:[],mqd_shirt_template_versions:[],customer_designs:[],mqd_library_assets:[]},assets=new Map();
const source=structuredClone(demoVersions[0].payload);for(const {zone,layer} of templateLayers(source))if(layer.type==='image'){layer.storagePath=owner+'/designs/'+sourceId+'/'+zone+'/'+layer.filename;delete layer.src;assets.set('customer-artwork/'+layer.storagePath,new Blob(['approved-original-'+layer.id],{type:'image/png'}));}
tables.customer_designs.push({id:sourceId,user_id:owner,status:'draft',name:'Owner source',product_name:'All-Over Print T-Shirt',design_json:source});
function from(table){let predicates=[],sort=null,mutation=null,returning=false;
 const q={select(){returning=true;return q;},eq(k,v){predicates.push(x=>x[k]===v);return q;},not(k,op,v){predicates.push(x=>x[k]!==v&&x[k]!==undefined);return q;},in(k,values){predicates.push(x=>values.includes(x[k]));return q;},order(k){sort=k;return q;},insert(value){mutation=['insert',value];return q;},update(value){mutation=['update',value];return q;},single(){return exec(true);},maybeSingle(){return exec(true);},then(a,b){return exec(false).then(a,b);}};
 async function exec(single){let rows=tables[table].filter(x=>predicates.every(p=>p(x)));
 if(mutation){const [mode,value]=mutation;if(mode==='insert'){const row=structuredClone({...value,id:value.id||crypto.randomUUID()});tables[table].push(row);rows=[row];}else{if(table==='mqd_shirt_template_versions')return{error:{message:'Immutable'}};rows.forEach(row=>Object.assign(row,structuredClone(value)));}}
 return{data:structuredClone(single?(rows[0]||null):rows),error:null};}
 return q;
}
const db={from,auth:{getUser:async(token)=>({data:{user:token==='owner'?{id:owner,app_metadata:{role:'admin'}}:token==='customer'?{id:other,app_metadata:{role:'customer'}}:null}})},storage:{from:bucket=>({
 upload:async(path,blob,{upsert})=>{assert.equal(upsert,false);if(assets.has(bucket+'/'+path))return{error:{message:'Already exists'}};assets.set(bucket+'/'+path,blob);return{data:{path},error:null};},
 download:async path=>({data:assets.get(bucket+'/'+path),error:assets.has(bucket+'/'+path)?null:{message:'Missing'}}),
 getPublicUrl:path=>({data:{publicUrl:'https://test.supabase.co/storage/v1/object/public/'+bucket+'/'+path}}),
 createSignedUrl:async path=>({data:{signedUrl:'https://test.supabase.co/private/'+path},error:null})})}};
let handler,mfa=true;const text=fs.readFileSync(new URL('../supabase/functions/mqd-shirt-templates/index.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
vm.runInNewContext(stripTypeScriptTypes(text),{Request,Response,Blob,File,crypto,fetch,structuredClone,console,UUID,assertTemplateDraft,cloneTemplate,templateLayers,createClient:()=>db,hasAdminMfa:async()=>mfa,Deno:{env:{get:()=> 'test-only'},serve:fn=>handler=fn}});
async function call(body,token){const response=await handler(new Request('https://test/templates',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));return{status:response.status,...await response.json()};}
assert.equal((await call({action:'owner-list'})).status,401);assert.equal((await call({action:'owner-list'},'customer')).status,403);mfa=false;assert.equal((await call({action:'create',designId:sourceId},'owner')).status,403);mfa=true;
assert.equal((await call({action:'create',designId:crypto.randomUUID()},'owner')).status,400);
const made=await call({action:'create',designId:sourceId},'owner');assert.equal(made.status,200);const id=made.template.id;
assert.deepEqual((await call({action:'gallery'})).designs,[]);assert.equal((await call({action:'select',id,versionId:crypto.randomUUID()})).status,404);
const draft=made.template.draft;draft.name='Owner-approved test fixture';draft.categories=['Pressure Washing','General Business'];draft.rules=structuredClone(demoVersions[0].rules);
assert.equal((await call({action:'save',id,draft},'customer')).status,403);assert.equal((await call({action:'save',id,draft},'owner')).status,200);
assert.equal((await call({action:'publish',id},'owner')).status,400);
for(const side of ['Front','Back'])assert.equal((await call({action:'preview-upload',id,side,data:'data:image/png;base64,dGVzdC1wcmV2aWV3'},'owner')).status,200);
const published=await call({action:'publish',id},'owner');assert.equal(published.status,200);
const gallery=await call({action:'gallery'});assert.equal(gallery.designs.length,1);assert(gallery.designs[0].categories.includes('General Business'));assert(!JSON.stringify(gallery).includes(owner));assert(!JSON.stringify(gallery).includes('storagePath'));
const first=await call({action:'select',id,versionId:published.versionId}),second=await call({action:'select',id,versionId:published.versionId});assert.equal(first.status,200);assert.notEqual(first.payload.design.template.copyId,second.payload.design.template.copyId);assert(!JSON.stringify(first).includes(owner));assert(!JSON.stringify(first).includes('storagePath'));
const payload=first.payload;const blob=new Blob(['new-business-logo'],{type:'image/png'}),hash=Buffer.from(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())).toString('hex'),form=new FormData();
for(const {zone,layer} of templateLayers(payload)){
 if(layer.templateRole==='text')layer.text=layer.label==='Phone number'?'804-123-4567':'Driveways and roofs';
 if(layer.templateRole==='logo'){delete layer.templateAssetPath;layer.templateReplaced=true;layer.templateReplacementHash=hash;delete layer.src;form.append('asset',blob,'my-logo.png');form.append('assetMeta',JSON.stringify({zone,layerId:layer.id}));}
 // Malicious file with the same layer identifier must never replace locked artwork.
 if(['locked','artwork'].includes(layer.templateRole)&&layer.type==='image'){form.append('asset',new Blob(['malicious'],{type:'image/png'}),'fake.png');form.append('assetMeta',JSON.stringify({zone,layerId:layer.id}));}
}
await prepareTemplateOrder(db,payload,form);assert.equal(form.getAll('asset').length,8);for(const file of form.getAll('asset'))assert.notEqual(await file.text(),'malicious');
// Movable social artwork stays canonical unless the customer explicitly replaces it.
const social=payload.design.zones.Back.layers[2];social.x=18;social.y=-17;social.scale=.07;social.rotation=4;
await verifyTemplateOrder(db,payload);const unchangedSocial=structuredClone(social);
const replacement=new Blob(['customer-social-icons'],{type:'image/png'}),replacementHash=Buffer.from(await crypto.subtle.digest('SHA-256',await replacement.arrayBuffer())).toString('hex');
social.templateReplaced=true;social.templateReplacementHash=replacementHash;delete social.templateAssetPath;delete social.src;
const socialForm=new FormData();for(const {zone,layer} of templateLayers(payload).filter(x=>x.layer.templateRole==='logo')){socialForm.append('asset',blob,'logo.png');socialForm.append('assetMeta',JSON.stringify({zone,layerId:layer.id}));}
socialForm.append('asset',replacement,'social.png');socialForm.append('assetMeta',JSON.stringify({zone:'Back',layerId:social.id}));
await prepareTemplateOrder(db,payload,socialForm);assert.equal(socialForm.getAll('asset').length,8);assert(socialForm.getAll('asset').some(f=>f.size===replacement.size));
const wrongSocial=new FormData();for(const [k,v] of socialForm.entries())wrongSocial.append(k,v);wrongSocial.delete('asset');wrongSocial.delete('assetMeta');for(const {zone,layer} of templateLayers(payload).filter(x=>['logo','artwork'].includes(x.layer.templateRole))){wrongSocial.append('asset',blob,'wrong.png');wrongSocial.append('assetMeta',JSON.stringify({zone,layerId:layer.id}));}
await assert.rejects(()=>prepareTemplateOrder(db,payload,wrongSocial),/does not match/);
payload.design.zones.Back.layers[2]=unchangedSocial;
const bad=structuredClone(payload);bad.design.zones.Front.layers[0].templateRole='logo';await assert.rejects(()=>verifyTemplateOrder(db,bad),/permissions/);
const badForm=new FormData();for(const {zone,layer} of templateLayers(payload).filter(x=>x.layer.templateRole==='logo')){badForm.append('asset',new Blob(['fake']),'fake.png');badForm.append('assetMeta',JSON.stringify({zone,layerId:layer.id}));}await assert.rejects(()=>prepareTemplateOrder(db,payload,badForm),/does not match/);
const old=structuredClone(tables.mqd_shirt_template_versions[0].snapshot);tables.mqd_shirt_templates[0].draft.name='Second version';const v2=await call({action:'publish',id},'owner');assert.notEqual(v2.versionId,published.versionId);assert.deepEqual(tables.mqd_shirt_template_versions[0].snapshot,old);
assert.equal((await call({action:'select',id,versionId:published.versionId})).status,404);await verifyTemplateOrder(db,payload);
await call({action:'unpublish',id},'owner');assert.equal((await call({action:'gallery'})).designs.length,0);assert.equal((await call({action:'select',id,versionId:v2.versionId})).status,404);await verifyTemplateOrder(db,payload);assert(assets.has('mqd-template-published/'+templateLayers(old.payload)[0].layer.templateAssetPath));
assert.equal((await call({action:'select',id:'../private',versionId:v2.versionId})).status,400);
assert.equal((await verifyTemplateOrder(db,{design:{zones:{}}})),null);
console.log('PASS actual template route and order helper with isolated fake DB/storage: auth/MFA/ownership, drafts, publish/gallery, two independent copies, no private data, hash verification, canonical masters, new versions, unpublish with historical asset/order durability, scratch no-op.');
// Run the existing signed-in and guest Checkout handlers with approved template order snapshots.
// Stripe is a strict local stub: this does not create a payment or a real Checkout Session.
const promotion=await import('../supabase/functions/_shared/mqd-promotion-pricing.js'),everyday=await import('../supabase/functions/_shared/mqd-everyday.js'),shipping=await import('../supabase/functions/_shared/mqd-shipping.js');
for(const slug of ['create-mqd-checkout','create-mqd-guest-checkout']){
 const guest=slug.includes('guest'),token=crypto.randomUUID(),guestHash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))).toString('hex');
 const order={id:crypto.randomUUID(),order_number:'MQD-TEMPLATE01',product_id:'tshirt',status:'submitted',user_id:guest?null:owner,guest_checkout_token_hash:guestHash,is_test:false,design_json:structuredClone(payload),design_id:crypto.randomUUID()};
 tables.mqd_orders=[order];tables.mqd_order_items=[{id:crypto.randomUUID(),order_id:order.id,product_id:'tshirt',quantity:3,order_options:[{size:'L',quantity:3}]}];
 let stripeCalls=0,checkoutHandler,captured;
 class Stripe{static createFetchHttpClient(){return{};}constructor(){this.checkout={sessions:{create:async(params)=>{stripeCalls++;captured=params;return{id:'cs_live_LOCAL_FIXTURE_ONLY',url:'https://checkout.stripe.com/local-fixture-only',payment_status:'unpaid'};}}};}}
 const code=fs.readFileSync(new URL('../supabase/functions/'+slug+'/index.ts',import.meta.url),'utf8').replace(/^import .*;\s*$/gm,'');
 vm.runInNewContext(stripTypeScriptTypes(code),{...promotion,...everyday,...shipping,Stripe,verifyTemplateOrder,createClient:()=>db,crypto,Request,Response,URL,TextEncoder,console:{error(){}},Deno:{env:{get:key=>key==='MQD_STRIPE_SECRET_KEY'?'sk_live_LOCAL_FIXTURE_ONLY':key==='SUPABASE_URL'?'https://test.supabase.co':key==='SUPABASE_SERVICE_ROLE_KEY'?'local-fixture-only':undefined},serve:fn=>checkoutHandler=fn}});
 const request=()=>new Request('https://test/checkout',{method:'POST',headers:{'Content-Type':'application/json',...(!guest?{Authorization:'Bearer owner'}:{})},body:JSON.stringify({orderNumbers:[order.order_number],checkoutToken:crypto.randomUUID(),guestToken:token})});
 let response=await checkoutHandler(request());assert.equal(response.status,200,await response.clone().text());assert.equal(stripeCalls,1);assert.equal(captured.line_items[0].quantity,3);assert.equal(captured.line_items[0].price_data.unit_amount,promotion.garmentPriceCents('tshirt'));assert.equal((await response.json()).url,'https://checkout.stripe.com/local-fixture-only');
 tables.mqd_orders[0].design_json.design.zones.Back.layers[3].text=source.design.zones.Back.layers[3].text;
 response=await checkoutHandler(request());assert.notEqual(response.status,200);assert.equal(stripeCalls,1,'Unchanged sample details must never reach Stripe');
}
console.log('PASS actual signed and guest Checkout handlers: customized historical template order reaches existing Stripe handoff/pricing; remaining sample fields prevent Stripe calls. Stripe and DB mocked.');
