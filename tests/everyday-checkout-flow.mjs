import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { buildEverydaySubmission, draftQuote, appendEverydayCart, cartDestination, connectEverydayCheckout } from '../v20/everyday-checkout.js';
import { everydayHandler } from '../supabase/functions/_shared/mqd-everyday-submit.js';
import * as everyday from '../supabase/functions/_shared/mqd-everyday.js';
import * as promotion from '../supabase/functions/_shared/mqd-promotion-pricing.js';
import * as shipping from '../supabase/functions/_shared/mqd-shipping.js';
import { everydayProductionZip } from '../v20/everyday-production-package.js';
import { SIZES, colorsForProduct, sizesForProduct } from '../v20/everyday-contract.js';
import { zoneFor } from '../v20/everyday-preview-renderer.js';
const { createCanvas, loadImage } = await import(process.env.EVERYDAY_CANVAS_MODULE || '@napi-rs/canvas');
const root = new URL('../', import.meta.url), read = path => fs.readFileSync(new URL(path, root), 'utf8');
const pricing = everyday.everydayPricing(read('config/everyday-pricing.example.json'));
globalThis.document = { createElement: () => createCanvas(800, 900) };
globalThis.createImageBitmap = async blob => loadImage(Buffer.from(await blob.arrayBuffer()));
globalThis.fetch = async url => ({ ok: true, blob: async () => new Blob([fs.readFileSync(new URL(url.slice(1), root))]) });
const makeCanvas = () => { const canvas = createCanvas(800, 900); canvas.toBlob = fn => fn(new Blob([canvas.toBuffer('image/png')], { type: 'image/png' })); return canvas; };
const image = createCanvas(64,64); image.getContext('2d').fillStyle = '#ff5500'; image.getContext('2d').fillRect(0,0,64,64);
const original = new File([image.toBuffer('image/png')], 'untouched-customer-logo.png', { type: 'image/png' });
const guestToken = 'd6098f67-c597-4335-9043-eef71dcdcc64';
const guestHash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(guestToken))).toString('hex');
function draft(product = 'everyday-tshirt',size = '4XL') { return { product, color: 'Royal', size, quantity: 3, photos: {}, artwork: Object.fromEntries(everyday.EVERYDAY_VIEWS.map(view => [view, { name: original.name, file: original, placement: { x: .25, y: .5, width: 2, height: 2 } }])) }; }
// Verify the owner-approved per-garment method fees and method-specific back fee.
for (const product of Object.keys(everyday.EVERYDAY_CATALOG)) for (const size of sizesForProduct(product, 'Royal')) {
  for (const [printMethod, methodFee, backFee] of [['transfer',0,1000],['dtf',500,500],['dtg',1000,500]]) {
    const sample = { ...draft(product,size), printMethod };
    const extraSize = ['2XL','3XL','4XL','5XL','6XL'].includes(size) ? 500 : 0;
    const expected = pricing.baseCents[product] + extraSize + methodFee + backFee + 500;
    const clientQuote = draftQuote(sample,pricing);
    assert.equal(clientQuote.unitCents,expected);
    assert.equal(clientQuote.unitCents * sample.quantity,expected * 3,'Method fee is per garment, not per order');
    const sheet = (await import('../v20/everyday-contract.js')).orderSheet(sample);
    const serverQuote = everyday.everydayQuote({range:'everyday',product:{id:product},everyday:sheet,orderOptions:[{size,quantity:3}],totalQuantity:3},pricing);
    assert.equal(serverQuote.unitCents,expected);
    assert.equal(serverQuote.printMethod,printMethod);
    delete sample.artwork.right;
    assert.equal(draftQuote(sample,pricing).unitCents,expected,'One or both sleeves cost $5 total');
  }
}
for(const [id,catalog] of Object.entries(everyday.EVERYDAY_CATALOG)) {
  assert.deepEqual(catalog.sizes, sizesForProduct(id, 'Royal'));
  assert.deepEqual(catalog.colors,colorsForProduct(id));
  for(const size of ['S','M','L','XL']) {
    assert.equal(draftQuote(draft(id,size),pricing).sizeCents,0);
    const frontOnly=draft(id,size);frontOnly.artwork={front:frontOnly.artwork.front};
    assert.equal(draftQuote(frontOnly,pricing).unitCents,pricing.baseCents[id]);
  }
  for(const size of ['2XL','3XL','4XL']) {
    assert.equal(draftQuote(draft(id,size),pricing).unitCents,draftQuote(draft(id,'L'),pricing).unitCents+500);
    const frontOnly=draft(id,size);frontOnly.artwork={front:frontOnly.artwork.front};
    assert.equal(draftQuote(frontOnly,pricing).sizeCents,500);
    assert.equal(draftQuote(frontOnly,pricing).unitCents,pricing.baseCents[id]+500);
    assert.equal(draftQuote(frontOnly,pricing).unitCents*frontOnly.quantity,(pricing.baseCents[id]+500)*3);
    for(const view of everyday.EVERYDAY_VIEWS) {
      const {width,height}=zoneFor(draft(id,size),view);
      assert.deepEqual({width,height},everyday.everydayZone(id,size,view));
    }
  }
}
await assert.rejects(()=>buildEverydaySubmission(draft('everyday-polo','5XL'),pricing),/approved Everyday size/);
for (const [id, cents] of [['everyday-tshirt',4000],['everyday-long-sleeve',5000],['everyday-hoodie',6000],['everyday-polo',5000]]) assert.equal(draftQuote(draft(id), pricing).unitCents,cents);
const oneSleeve = draft(); delete oneSleeve.artwork.right;
assert.equal(draftQuote(oneSleeve,pricing).unitCents,draftQuote(draft(),pricing).unitCents,'Sleeve bundle charges once');
assert.throws(() => everyday.everydayPricing(''), /awaiting setup/);
for(const amount of [undefined,-1,1.5]) assert.throws(()=>everyday.everydayPricing(JSON.stringify({...pricing,sizeSurchargeCents:amount})),/size prices/);
const db = { mqd_orders: [], mqd_order_items: [], mqd_order_assets: [] }, blobs = new Map(), writes = [];
let failedUpload = false, actor = null;
class Query {
  constructor(table) { this.table = table; this.filters = []; }
  select() { return this; } eq(key,value) { this.filters.push(row => row[key] === value); return this; }
  in(key,values) { this.filters.push(row => values.includes(row[key])); return this; }
  or() { return this; }
  insert(value) { this.inserted = value; return this; } update(value) { this.updated = value; return this; }
  single() { this.one = true; return this; } maybeSingle() { this.one = true; return this; }
  then(resolve,reject) {
    let data;
    if (this.inserted) { const row = { ...structuredClone(this.inserted), id: this.inserted.id || crypto.randomUUID() }; if (this.table === 'mqd_orders') row.order_number = 'MQD-QA' + String(db.mqd_orders.length).padStart(6,'0'); db[this.table].push(row); data = this.one ? structuredClone(row) : null; writes.push(this.table); }
    else { const rows = db[this.table].filter(row => this.filters.every(filter => filter(row))); if (this.updated) { rows.forEach(row => Object.assign(row,structuredClone(this.updated))); data = null; writes.push(this.table); } else data = structuredClone(this.one ? rows[0] || null : rows); }
    return Promise.resolve({ data, error: null }).then(resolve,reject);
  }
}
const supabase = { auth: { getUser: async () => ({ data: { user: actor }, error: actor ? null : { message: 'expired' } }) }, from: table => new Query(table), rpc: async () => ({ data: true, error: null }), storage: { from: () => ({ upload: async (path,blob) => { if(failedUpload) return { error: {message:'fixture upload failed'} }; blobs.set(path,blob); return { error:null }; }, remove: async paths => { paths.forEach(path => blobs.delete(path)); return { error:null }; } }) } };
const env = { SUPABASE_URL:'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY:'fixture-only', MQD_EVERYDAY_PRICING:JSON.stringify(pricing), MQD_STRIPE_SECRET_KEY:'sk_live_fixture', MQD_STRIPE_TEST_SECRET_KEY:'sk_test_fixture' };
const submit = everydayHandler({ createClient: () => supabase, env: name => env[name] });
async function formFor(current = draft(), mutate, test = false) { const {form,payload} = await buildEverydaySubmission(current,pricing,{makeCanvas,test}); if(mutate) { mutate(payload); form.set('payload',JSON.stringify(payload)); } form.append('guestToken',guestToken); return form; }
const request = (form, authenticated = false) => new Request('https://fixture.invalid',{method:'POST',headers:authenticated ? {authorization:'Bearer fixture'} : {},body:form});
const firstForm = await formFor(), replayForm = new FormData(); for(const [key,value] of firstForm)replayForm.append(key,value);
const response = await submit(request(firstForm)); assert.equal(response.status,200,await response.clone().text());
const result = await response.json(), saved = db.mqd_orders[0];
assert.equal(saved.design_json.productionReady,true); assert.equal(saved.product_price,40); assert.deepEqual(saved.background_colors,{}); assert.equal(saved.guest_checkout_token_hash,guestHash);
assert.equal(saved.design_json.everyday.blankStyle,'Gildan 3000');assert.equal(saved.design_json.everyday.size,'4XL');assert.equal(db.mqd_order_items[0].order_options[0].size,'4XL');
assert.equal(saved.design_json.quote.sizeCents,500);
assert.equal(db.mqd_order_assets.length,8); assert.equal(blobs.size,8);
const replay = await submit(request(replayForm)); assert.equal(replay.status,200);assert.equal((await replay.json()).orderNumber,result.orderNumber);assert.equal(db.mqd_orders.length,1);assert.equal(db.mqd_order_assets.length,8);
const stalePrice = await submit(request(await formFor(draft(),p=>{p.quote.version='everyday-v1';p.quote.unitCents-=500;})));
assert.equal(stalePrice.status,409,'A stale price cannot skip the size surcharge');
for(const asset of db.mqd_order_assets.filter(a => a.metadata.kind === 'original-source')) assert.deepEqual(Buffer.from(await blobs.get(asset.storage_path).arrayBuffer()),Buffer.from(await original.arrayBuffer()));
for(const mutate of [p=>p.everyday.locations.front.width=30,p=>p.everyday.color='Unlisted',p=>{p.everyday.size='7XL';p.orderOptions[0].size='7XL';},p=>p.quote.unitCents=1,p=>p.totalQuantity=1000,p=>p.everyday.locations.left.x=3]) { const before = db.mqd_orders.length; const bad = await submit(request(await formFor(draft(),mutate))); assert.equal(bad.status,mutate.toString().includes('unitCents')?409:400); assert.equal(db.mqd_orders.length,before); }
const missing = await formFor(); const assets = missing.getAll('asset'),meta = missing.getAll('assetMeta'); missing.delete('asset');missing.delete('assetMeta'); for(let i=1;i<assets.length;i++){missing.append('asset',assets[i]);missing.append('assetMeta',meta[i]);} assert.equal((await submit(request(missing))).status,400);
const partial = structuredClone(saved); partial.design_json.productionReady=false; assert.throws(()=>everyday.everydayCheckout(partial,db.mqd_order_items[0],JSON.stringify(pricing)),/not ready/);
failedUpload=true; assert.equal((await submit(request(await formFor()))).status,500); assert.equal(db.mqd_orders.at(-1).status,'cancelled'); assert.equal(db.mqd_orders.at(-1).design_json.productionReady,false); failedUpload=false;
assert.equal((await submit(request(await formFor(),true))).status,401,'Invalid account session cannot fall through to guest');
actor={id:'account-fixture',email:'fixture@example.invalid',app_metadata:{provider:'google',providers:['google']}};
assert.equal((await submit(request(await formFor(draft('everyday-polo')),true))).status,200); assert.equal(db.mqd_orders.at(-1).user_id,actor.id);
assert.equal(db.mqd_orders.at(-1).design_json.everyday.blankStyle,'Gildan 64800');
const heatherPolo=draft('everyday-polo');heatherPolo.color='Charcoal';assert.equal((await submit(request(await formFor(heatherPolo),true))).status,200);
assert.equal((await submit(request(await formFor(draft('everyday-polo'),p=>p.everyday.color='Dark Heather'),true))).status,400);
const signedOrder=structuredClone(db.mqd_orders.at(-1)), signedItem=structuredClone(db.mqd_order_items.at(-1));
const legacyOrder=structuredClone(saved);
delete legacyOrder.design_json.everyday.printMethod; delete legacyOrder.design_json.everyday.printMethodLabel;
delete legacyOrder.design_json.quote.methodCents; delete legacyOrder.design_json.quote.printMethod; delete legacyOrder.design_json.quote.printMethodLabel;
assert.equal(everyday.everydayCheckout(legacyOrder,db.mqd_order_items[0],JSON.stringify(pricing)).unitCents,4000,'Existing standard transfer carts keep their original amount');
actor={id:'admin-fixture',app_metadata:{role:'admin'}};
assert.equal((await submit(request(await formFor(draft(),null,true),true))).status,200); assert.equal(db.mqd_orders.at(-1).is_test,true); assert.equal(db.mqd_orders.at(-1).user_id,null);
let captured;
class Stripe { static createFetchHttpClient(){return {};} constructor(){this.checkout={sessions:{create:async(params,options)=>{captured={params,options};return {id:params.metadata.mqd_test==='1'?'cs_test_fixture':'cs_live_fixture',url:'https://checkout.stripe.com/fixture',payment_status:'unpaid'};}}};} }
async function checkout(slug, order, item, { corrupt, badOwner=false, missingPricing=false }={}) {
  captured=null;let handler;
  const test=slug==='create-mqd-test-checkout', signed=slug==='create-mqd-checkout';
  const premium={id:'premium-fixture',order_number:'MQD-PREMIUM01',product_id:'tshirt',status:'submitted',user_id:signed?'account-fixture':null,guest_checkout_token_hash:guestHash,is_test:test};
  const orders=[structuredClone(order),premium],items=[structuredClone(item),{id:'premium-item',order_id:premium.id,product_id:'tshirt',quantity:2,order_options:[{size:'L',quantity:2}]}];
  orders[0].is_test=test; if(badOwner) orders[0].guest_checkout_token_hash='wrong'; if(corrupt) corrupt(orders[0],items[0]);
  const checkoutDb={...supabase,auth:{getUser:async()=>({data:{user:{id:signed?'account-fixture':'admin-fixture',app_metadata:{role:'admin'}}},error:null})},from:table=>{ const query=new Query(table); query.then=(resolve,reject)=>Promise.resolve(query.updated?{error:null}:{data:table==='mqd_orders'?orders:items,error:null}).then(resolve,reject); return query; }};
  const context=vm.createContext({...everyday,...promotion,...shipping,Stripe,crypto,Request,Response,URL,TextEncoder,console:{error(){}},createClient:()=>checkoutDb,Deno:{env:{get:name=>missingPricing&&name==='MQD_EVERYDAY_PRICING'?'':env[name]},serve:fn=>handler=fn}});
  vm.runInContext(stripTypeScriptTypes(read(`supabase/functions/${slug}/index.ts`).replace(/^import .*\n/gm,'')),context);
  const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{authorization:'Bearer fixture','content-type':'application/json'},body:JSON.stringify({orderNumbers:orders.map(o=>o.order_number),checkoutToken:crypto.randomUUID(),guestToken,price:0.01})}));
  return {response,captured};
}
for(const slug of ['create-mqd-checkout','create-mqd-guest-checkout','create-mqd-test-checkout']) {
  const order=slug==='create-mqd-checkout'?signedOrder:saved, item=slug==='create-mqd-checkout'?signedItem:db.mqd_order_items[0];
  const good=await checkout(slug,order,item); assert.equal(good.response.status,200,await good.response.clone().text());
  assert.deepEqual(Array.from(good.captured.params.line_items,line=>line.price_data.unit_amount),[order.product_price*100,promotion.garmentPriceCents('tshirt')]);
  assert.equal(good.captured.params.shipping_options[0].shipping_rate_data.fixed_amount.amount,shipping.shippingCentsForQuantity(5));
  for(const corrupt of [(o)=>o.design_json.productionReady=false,(o)=>o.design_json.quote.unitCents=1,(o)=>o.design_json.everyday.locations.front.width=25,(_o,i)=>i.quantity=99]) { const bad=await checkout(slug,order,item,{corrupt}); assert.notEqual(bad.response.status,200); assert.equal(bad.captured,null); }
  const unconfigured=await checkout(slug,order,item,{missingPricing:true});assert.equal(unconfigured.response.status,503);assert.equal(unconfigured.captured,null);
  if(slug!=='create-mqd-checkout'){const bad=await checkout(slug,order,item,{badOwner:true});assert.equal(bad.response.status,403);}
}
for (const [printMethod, expected] of [['dtf',4000],['dtg',4500]]) {
  actor={id:'account-fixture',email:'fixture@example.invalid',app_metadata:{provider:'google'}};
  const sample={...draft(),printMethod};
  const response=await submit(request(await formFor(sample),true)); assert.equal(response.status,200,await response.clone().text());
  const order=structuredClone(db.mqd_orders.at(-1)), item=structuredClone(db.mqd_order_items.at(-1));
  assert.equal(order.design_json.everyday.printMethod,printMethod);
  assert.equal(order.design_json.quote.methodCents,printMethod==='dtf'?500:1000);
  for (const slug of ['create-mqd-checkout','create-mqd-guest-checkout','create-mqd-test-checkout']) {
    const checkoutOrder=slug==='create-mqd-checkout'?order:{...order,user_id:null};
    const check=await checkout(slug,checkoutOrder,item); assert.equal(check.response.status,200,await check.response.clone().text());
    assert.equal(check.captured.params.line_items[0].price_data.unit_amount,expected);
    assert.match(check.captured.params.line_items[0].price_data.product_data.name,new RegExp(printMethod.toUpperCase()));
  }
  const assets=db.mqd_order_assets.filter(a=>a.order_id===order.id).map(a=>({...a,download_url:a.storage_path}));
  const zip=await everydayProductionZip({order,items:[item],assets},path=>blobs.get(path));
  assert(Buffer.from(await zip.arrayBuffer()).includes(Buffer.from(`"printMethod": "${printMethod}"`)),'Production ZIP identifies the selected method');
  const bad=await submit(request(await formFor(sample,p=>p.quote.unitCents-=500),true)); assert.equal(bad.status,409,'A method fee cannot be removed by client pricing');
}
assert.equal((await submit(request(await formFor(draft(),p=>p.everyday.printMethod='unsupported'),true))).status,400);
actor={id:'admin-fixture',app_metadata:{role:'admin'}};
let cartValue=JSON.stringify([{productId:'tshirt',orderNumber:'MQD-PREMIUM01',price:50,totalQuantity:2}]);
const migrationSource=read('v20/customer.js').match(/function migratePriceVersion\(\)\{[\s\S]*?\n\}/)[0];
for(const initialEpoch of [null,'old-premium-version']) {
  const readyEveryday={range:'everyday',productId:'everyday-polo',orderNumber:'MQD-FIRSTVISIT'};
  const memory=new Map([['mqd-cart',JSON.stringify([{productId:'tshirt',price:50},readyEveryday])]]);
  if(initialEpoch)memory.set('mqd-price-version',initialEpoch);
  const migrationContext=vm.createContext({syncStoredCatalogPrices(){},MQD_PRICE_VERSION:'current-premium-version',localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)}});
  vm.runInContext(migrationSource+';migratePriceVersion();',migrationContext);
  assert.deepEqual(JSON.parse(memory.get('mqd-cart')),[readyEveryday],'First premium visit must preserve an Everyday order while invalidating stale premium prices');
  assert.equal(memory.get('mqd-price-version'),'current-premium-version');
}
const storage={getItem:()=>cartValue,setItem:(_key,value)=>cartValue=value,removeItem(){}};
appendEverydayCart(storage,draft(),result);assert.equal(JSON.parse(cartValue).length,2);assert.equal(JSON.parse(cartValue)[1].price,40);assert.equal(JSON.parse(cartValue)[1].pendingSync,false);
appendEverydayCart(storage,draft(),result);assert.equal(JSON.parse(cartValue).length,2,'Retry never duplicates a confirmed cart entry');
assert.equal(cartDestination(true),'/?everydayPreview=1&openCart=1&mqdStripeTest=1');
const detail={order:{...saved,stripe_payment_status:'paid',is_test:true},items:[db.mqd_order_items[0]],assets:db.mqd_order_assets.filter(a=>a.order_id===saved.id).map(a=>({...a,download_url:a.storage_path}))};
const zip=await everydayProductionZip(detail,path=>blobs.get(path));assert(zip.size>original.size);
if(process.env.EVERYDAY_ORDER_ZIP)fs.writeFileSync(process.env.EVERYDAY_ORDER_ZIP,Buffer.from(await zip.arrayBuffer()));
const incomplete=structuredClone(detail);incomplete.assets.pop();await assert.rejects(everydayProductionZip(incomplete,path=>blobs.get(path)),/missing/);
// Exercise the actual editor-to-cart action with the real submission handler.
const nodes=new Map(['addEverydayToCart','everydayPrice','everydayCart','upload'].map(id=>[id,{id,disabled:id==='upload',textContent:''}]));
globalThis.document={getElementById:id=>nodes.get(id),querySelectorAll:()=>[...nodes.values()],createElement:makeCanvas};
globalThis.location={search:''};
const uiStore=new Map([['mqd-cart','[]'],['mqd-guest-order-token',guestToken]]),messages=[];
const uiStorage={getItem:key=>uiStore.get(key)||null,setItem:(key,value)=>uiStore.set(key,value),removeItem:key=>uiStore.delete(key)};
let redirected, savedDraft=false, uploads=0;
connectEverydayCheckout({getDraft:()=>draft(),saveDraft:async()=>{savedDraft=true;},status:text=>messages.push(text)},{storage:uiStorage,loadClient:async()=>({auth:{getSession:async()=>({data:{session:null}})}}),navigate:url=>redirected=url,fetch:async(_url,options)=>{if(options.method==='POST'){uploads++;return submit(new Request('https://fixture.invalid',{...options}));}return submit(new Request('https://fixture.invalid'));}});
await new Promise(resolve=>setTimeout(resolve,10));assert.equal(nodes.get('addEverydayToCart').disabled,false);assert.match(nodes.get('everydayPrice').textContent,/\$40.00 each/);
await nodes.get('addEverydayToCart').onclick();assert.equal(uploads,1);assert.equal(savedDraft,true);assert.equal(JSON.parse(uiStore.get('mqd-cart'))[0].price,40);assert.equal(redirected,cartDestination());assert.equal(nodes.get('upload').disabled,true,'Restore previously disabled controls');
// A signed-out sandbox click must explain why the cart remains empty beside the
// button, save the draft, and offer sign-in without uploading an unpaid order.
for (const id of ['everydayCheckoutMessage','everydayTestSignIn','everydayHeaderCart']) nodes.set(id,{id,dataset:{},hidden:true,href:'/?everydayPreview=1&mqdStripeTest=1&testSignIn=1',scrollIntoView(){}});
location.search='?mqdStripeTest=1';uiStore.set('mqd-cart','[]');uploads=0;redirected=undefined;savedDraft=false;
connectEverydayCheckout({getDraft:()=>draft(),saveDraft:async()=>{savedDraft=true;},status:text=>messages.push(text)},{storage:uiStorage,loadClient:async()=>({auth:{getSession:async()=>({data:{session:null}})}}),navigate:url=>redirected=url,fetch:async(_url,options)=>{if(options.method==='POST'){uploads++;throw Error('Signed-out tests must not upload');}return submit(new Request('https://fixture.invalid'));}});
await new Promise(resolve=>setTimeout(resolve,10));
assert.equal(nodes.get('everydayTestSignIn').hidden,false);assert.equal(nodes.get('everydayHeaderCart').textContent,'Cart (0)');
assert.equal(nodes.get('everydayHeaderCart').href,cartDestination(true));
await nodes.get('addEverydayToCart').onclick();
assert.equal(uploads,0);assert.equal(savedDraft,true);assert.deepEqual(JSON.parse(uiStore.get('mqd-cart')),[]);assert.equal(redirected,undefined);
assert.match(nodes.get('everydayCheckoutMessage').textContent,/owner account/);assert.match(nodes.get('everydayCheckoutMessage').textContent,/No item has been added yet/);assert.equal(nodes.get('everydayCheckoutMessage').dataset.error,'true');
await nodes.get('everydayTestSignIn').onclick({preventDefault(){}});assert.equal(redirected,nodes.get('everydayTestSignIn').href);
location.search='';
// Run the existing signed webhook against a paid Everyday + premium cart.
db.mqd_orders=[structuredClone(saved),{id:'premium-paid',order_number:'MQD-PREMIUM02',user_id:null,status:'submitted',product_name:'All-Over Print T-Shirt',is_test:false}];
db.mqd_order_items=[structuredClone(detail.items[0]),{id:'premium-paid-item',order_id:'premium-paid',quantity:2,unit_price:40,order_options:[{size:'L',quantity:2}]}];
let webhook;
const secret='whsec_fixture_only';
const context=vm.createContext({...shipping,crypto,Request,Response,TextEncoder,Date,console:{error(){}},createClient:()=>supabase,mqdOwnerEmails:async()=>[],queueMqdEmail:async()=>{throw Error('Fixture must not send mail');},escapeMqdEmailHtml:value=>value,Deno:{env:{get:name=>name==='MQD_STRIPE_WEBHOOK_SIGNING_SECRET'?secret:env[name]},serve:fn=>webhook=fn}});
vm.runInContext(stripTypeScriptTypes(read('supabase/functions/stripe-mqd-webhook/index.ts').replace(/^import .*\n/gm,'')),context);
async function paymentEvent(paymentStatus,amount){const time=Math.floor(Date.now()/1000),body=JSON.stringify({id:'evt_fixture',livemode:true,type:'checkout.session.completed',created:time,data:{object:{id:'cs_live_fixture',payment_status:paymentStatus,currency:'usd',metadata:{order_numbers:db.mqd_orders.map(o=>o.order_number).join(',')},amount_subtotal:amount,amount_total:amount+shipping.shippingCentsForQuantity(5),total_details:{amount_shipping:shipping.shippingCentsForQuantity(5)}}}});const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${time}.${body}`))).toString('hex');return webhook(new Request('https://fixture.invalid',{method:'POST',headers:{'stripe-signature':`t=${time},v1=${signature}`},body}));}
assert.equal((await paymentEvent('paid',1)).status,409);assert(db.mqd_orders.every(o=>o.status==='submitted'));
assert.equal((await paymentEvent('unpaid',20000)).status,200);assert(db.mqd_orders.every(o=>o.status==='submitted'));
assert.equal((await paymentEvent('paid',20000)).status,200);assert(db.mqd_orders.every(o=>o.status==='paid'));assert.equal(db.mqd_orders[0].amount_paid,120);
// Verify both added sizes on every Everyday garment through actual canvas
// exports, validated submissions, saved items, checkout and production ZIPs.
if(process.env.EVERYDAY_EXTENDED_ZIPS)fs.mkdirSync(process.env.EVERYDAY_EXTENDED_ZIPS,{recursive:true});
actor={id:'admin-fixture',app_metadata:{role:'admin'}};
for(const id of Object.keys(everyday.EVERYDAY_CATALOG)) for(const size of ['2XL','3XL','4XL']) {
  const current=draft(id,size),reply=await submit(request(await formFor(current,null,true),true));
  assert.equal(reply.status,200,await reply.clone().text());
  const confirmation=await reply.json(),order=structuredClone(db.mqd_orders.at(-1)),item=structuredClone(db.mqd_order_items.at(-1));
  assert.equal(order.design_json.everyday.size,size);assert.equal(item.order_options[0].size,size);assert.equal(order.is_test,true);
  assert.equal(order.design_json.quote.sizeCents,500);assert.equal(order.product_price*100,pricing.baseCents[id]+2000);
  const cartMemory=new Map([['mqd-cart','[]']]),cartStorage={getItem:key=>cartMemory.get(key)||null,setItem:(key,value)=>cartMemory.set(key,value),removeItem:key=>cartMemory.delete(key)};
  assert.equal(appendEverydayCart(cartStorage,current,confirmation,true)[0].orderOptions[0].size,size);
  const {response:sessionReply}=await checkout('create-mqd-test-checkout',order,item);assert.equal(sessionReply.status,200,await sessionReply.clone().text());
  const savedAssets=db.mqd_order_assets.filter(a=>a.order_id===order.id).map(a=>({...a,download_url:a.storage_path}));
  const production=await everydayProductionZip({order,items:[item],assets:savedAssets},path=>blobs.get(path));
  if(process.env.EVERYDAY_EXTENDED_ZIPS)fs.writeFileSync(process.env.EVERYDAY_EXTENDED_ZIPS+'/'+id+'-'+size+'.zip',Buffer.from(await production.arrayBuffer()));
}
// Text-only and image-plus-text orders preserve both print layout and source bytes.
const textLayer = placement => ({ id:crypto.randomUUID(), text:'MY TEAM', font:'Inter', color:'#111111', outline:0, outlineColor:'#ffffff', bold:true, italic:false, align:'center', placement });
const layered = draft(); for (const art of Object.values(layered.artwork)) art.texts = [textLayer({x:.5,y:1,width:1.5,height:.5})];
const beforePrice = draftQuote(draft(),pricing).unitCents;
assert.equal(draftQuote(layered,pricing).unitCents,beforePrice,'Multiple layers in a printed zone do not add a location fee');
actor={id:'account-fixture',email:'fixture@example.invalid',app_metadata:{provider:'google'}};
const layeredForm = await formFor(layered), layeredReplay = new FormData(); for(const [key,value] of layeredForm)layeredReplay.append(key,value);
assert.equal(layeredForm.getAll('asset').length,12);
const layeredResponse=await submit(request(layeredForm,true)); assert.equal(layeredResponse.status,200,await layeredResponse.clone().text());
assert.equal((await submit(request(layeredReplay,true))).status,200,'Layered submissions are idempotent');
const layeredOrder=structuredClone(db.mqd_orders.at(-1)),layeredItem=structuredClone(db.mqd_order_items.at(-1));
const layeredAssets=db.mqd_order_assets.filter(a=>a.order_id===layeredOrder.id).map(a=>({...a,download_url:a.storage_path}));
assert.equal(layeredAssets.length,12); assert.equal(layeredOrder.user_id,'account-fixture');
for(const asset of layeredAssets.filter(a=>a.metadata.kind==='upload-source')) assert.deepEqual(Buffer.from(await blobs.get(asset.storage_path).arrayBuffer()),Buffer.from(await original.arrayBuffer()));
assert.equal(layeredOrder.design_json.everyday.locations.front.texts[0].text,'MY TEAM');
const compoundZip = await everydayProductionZip({order:layeredOrder,items:[layeredItem],assets:layeredAssets},path=>blobs.get(path));
assert(Buffer.from(await compoundZip.arrayBuffer()).includes(Buffer.from('prints/front-front-print.png')));
await assert.rejects(everydayProductionZip({order:layeredOrder,assets:layeredAssets.filter(a=>a.metadata.kind!=='upload-source')},path=>blobs.get(path)),/Untouched upload/);
assert.equal((await checkout('create-mqd-checkout',layeredOrder,layeredItem)).response.status,200);
const onlyText={...draft('everyday-polo','L'),artwork:{front:{texts:[textLayer({x:.25,y:.25,width:2.5,height:1})]}}};
const textForm=await formFor(onlyText); assert.equal(textForm.getAll('asset').length,5);
const print = textForm.getAll('asset').find(file=>file.name==='front-print.png'), printImage=await loadImage(Buffer.from(await print.arrayBuffer()));
assert.equal(printImage.width,750); assert.equal(printImage.height,300);
const printCanvas=createCanvas(750,300);printCanvas.getContext('2d').drawImage(printImage,0,0);
const rgba=printCanvas.getContext('2d').getImageData(0,0,750,300).data;
assert.equal(rgba[3],0,'Production text PNG has a transparent background'); assert(rgba.some((value,index)=>index%4===3 && value>0),'Export contains the text glyphs');
assert.equal((await submit(request(textForm,true))).status,200);
for(const mutate of [p=>p.everyday.locations.front.texts[0].placement.x=99,p=>p.everyday.locations.front.texts[0].font='unsupported',p=>p.everyday.locations.front.texts[0].text='',p=>p.everyday.locations.front.printRasterDpi=72]) assert.equal((await submit(request(await formFor(onlyText,mutate),true))).status,400);
const missingUpload=await formFor(layered);const all=missingUpload.getAll('asset'),metas=missingUpload.getAll('assetMeta');missingUpload.delete('asset');missingUpload.delete('assetMeta');for(let i=0;i<all.length;i++)if(JSON.parse(metas[i]).kind!=='upload-source'){missingUpload.append('asset',all[i]);missingUpload.append('assetMeta',metas[i]);}assert.equal((await submit(request(missingUpload,true))).status,400);
console.log('PASS: layered text and image prints at 300 pixels per inch, transparent production PNGs, preserved uploads, text-only account orders, unchanged pricing, idempotency, validation and all existing checkout paths.');
