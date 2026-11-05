// Synthetic local QA. Every external request is intercepted; no real sign-in,
// email, payment, production database or customer asset is accessed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {stripTypeScriptTypes,createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {fixture,packageFor,businessId,shop,key} from './print-shop-design-fixture.mjs';
import {hasShopAccess} from '../supabase/functions/mqd-print-shop-pilot/access.js';
import {sharedShopDesign,savedShopAppearance} from '../supabase/functions/mqd-print-shop-designs/service.js';
import {MAX_REQUEST_BYTES,requestEstimate,money,validPhone,garmentLogo,assertFixedLogoPackage,garmentLogoPath,PILOT_SHOP} from '../supabase/functions/mqd-print-shop-pilot/contract.js';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url))),require=createRequire(import.meta.url);
let threeRoot=process.env.THREE_ROOT;
if(!threeRoot){try{threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');}catch{threeRoot=path.resolve(root,'../print-shop-paid-launch/node_modules/three');}}
const glb=process.env.MQD_TEST_TSHIRT_GLB||(process.platform==='darwin'?path.resolve(root,'../aop-short-sleeve-repair/diagnostics/tshirt.glb'):null);
if(process.platform==='darwin')process.env.CHROME_PATH||='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
assert(glb,'Set MQD_TEST_TSHIRT_GLB to the cached approved tshirt.glb');
const output=process.env.SHOP_SHARING_OUTPUT||path.join(root,'test-results/print-shop-sharing');await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(/^\/shops\/[^/]+\/3d$/.test(p))p='/shop-3d.html';else if(/^\/shops\/[^/]+$/.test(p))p='/shop-2d.html';const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))throw new Error();const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));const base='http://127.0.0.1:8765';
const f=fixture(),emails=[];let requestHandler;
const db={...f.db,rpc:async(name,args)=>name==='mqd_claim_print_shop_request'?{data:[{id:args.p_id,reference:'SYNTHETIC-REQUEST',status:'reserved'}]}:{data:'test-only-mail-key'},from:table=>table==='mqd_print_shop_requests'?{update:()=>({eq:async()=>({})})}:f.db.from(table)};
let pilot=await fs.readFile(path.join(root,'supabase/functions/mqd-print-shop-pilot/index.ts'),'utf8');pilot=pilot.replace(/^import .*;\n/gm,'');
vm.runInNewContext(stripTypeScriptTypes(pilot),{createClient:()=>db,hasShopAccess,sharedShopDesign,savedShopAppearance,JSZip,PILOT_SHOP,MAX_REQUEST_BYTES,requestEstimate,money,validPhone,garmentLogo,assertFixedLogoPackage,garmentLogoPath,crypto,TextEncoder,Uint8Array,Response,Request,File,btoa,atob,console,Deno:{env:{get:()=> 'synthetic-only'},serve:h=>requestHandler=h},fetch:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');emails.push(JSON.parse(options.body));return new Response('{"id":"synthetic-mail"}',{status:200});}});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1360,height:1000},acceptDownloads:true});
const errors=[];
await context.route('**/*',async route=>{
 const req=route.request(),url=req.url();
 if(url.includes('/functions/v1/mqd-print-shop-designs')){
  const r=await f.handler(new Request(url,{method:req.method(),headers:req.headers(),...(req.method()==='POST'?{body:req.postDataBuffer()}:{})}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 }
 if(url.includes('/functions/v1/mqd-print-shop-pilot')){
  if(req.method()==='GET')return route.fulfill({json:{shop}});
  const r=await requestHandler(new Request(url,{method:'POST',headers:req.headers(),body:req.postDataBuffer()}));return route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 }
 if(url.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({contentType:'text/javascript',body:`export const createClient=()=>({auth:{getSession:async()=>({data:{session:localStorage.getItem('synthetic-shop-owner')?{access_token:'owner'}:null}}),getUser:async()=>({data:{user:localStorage.getItem('synthetic-shop-owner')?{app_metadata:{}}:null}}),signInWithPassword:async()=>{localStorage.setItem('synthetic-shop-owner','signed-in');return {};},signOut:async()=>{localStorage.removeItem('synthetic-shop-owner');return {};}}});`});
 if(url.startsWith('https://unpkg.com/three@0.180.0/'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(path.join(threeRoot,url.split('three@0.180.0/')[1]))});
 if(url.includes('/garments/tshirt.glb'))return route.fulfill({contentType:'model/gltf-binary',body:await fs.readFile(glb)});
 if(url.startsWith('https://cdn.jsdelivr.net/npm/jszip@'))return route.fulfill({contentType:'text/javascript',body:await fs.readFile(require.resolve('jszip/dist/jszip.min.js'))});
 if(url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:'))return route.continue();
 if(url.startsWith('https://fonts.'))return route.fulfill({contentType:'text/css',body:''});
 return route.abort();
});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
const ready=async()=>{await page.waitForFunction(()=>document.body.dataset.ready==='true',{timeout:60000}).catch(async e=>{throw new Error(e.message+' '+await page.locator('body').innerText());});};
try{
 for(const engine of ['2d','3d']){
  console.log('Testing shared '+engine);
  const p=await packageFor(engine),id=crypto.randomUUID();const r=await f.call({action:'save',id,businessId,title:'Saved '+engine,locked:true,revision:0},{file:p.bytes});assert.equal(r.status,200,await r.clone().text());const design=(await r.json()).design;
  const url=base+'/shops/'+shop.slug+(engine==='3d'?'/3d':'')+'?design='+id+'#view='+design.token;
  await page.goto(url);await ready();
  assert.equal(await page.locator('body').getAttribute('data-shared-locked'),'true');
  assert.equal(await page.locator('.shop-request').isVisible(),false);
  assert.equal(await page.locator('#saveDraft').isVisible(),false);
  const read=async()=>engine==='3d'?page.evaluate(()=>window.MQDDesigner.exportDesign().design):page.evaluate(()=>window.MQDShopEveryday?document.getElementById('review').textContent:'');
  const before=await read();
  const edit=page.locator(engine==='2d'?'#textContent':'#layerY');assert.equal(await edit.isEnabled(),false);
  await page.locator(engine==='2d'?'#preview':'#editorCanvas').dispatchEvent('keydown',{key:'ArrowUp'});
  assert.deepEqual(await read(),before,'Locked canvas keyboard cannot reposition artwork');
  if(engine==='3d'){
   const actual=await page.evaluate(()=>window.MQDDesigner.exportDesign());assert.equal(actual.design.zones.Front.layers[0].y,-17);assert.equal(actual.design.zones.Front.background,'#2456A6');assert.equal(actual.product.id,'tshirt');
   await page.locator('#zoneRail button').filter({hasText:'Front'}).click();
  }else{
   assert((await page.locator('#review').textContent()).includes('ORIGINAL'));
   await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByRole('button',{name:'Front',exact:true}).click();
  }
  await page.screenshot({path:path.join(output,engine+'-locked.png'),fullPage:true});
  await f.call({action:'lock',id,businessId,locked:false,revision:1});
  await page.reload();await ready();
  if(engine==='2d'){
   await page.getByRole('button',{name:'Text: ORIGINAL',exact:true}).click();await page.locator('#textContent').fill('CUSTOMER COPY');await page.locator('#textContent').dispatchEvent('input');
  }else{
   await page.locator('#zoneRail button').filter({hasText:'Back'}).click();
   await page.locator('#textValue').fill('CUSTOMER COPY');await page.locator('#textValue').dispatchEvent('input');
  }
  const download=page.waitForEvent('download');await page.locator('#saveDraft').click();const d=await download;const file=path.join(output,engine+'-customer-copy.zip');await d.saveAs(file);const zip=await JSZip.loadAsync(await fs.readFile(file));const copied=JSON.parse(await zip.file('design.json').async('string'));
  assert.equal(engine==='2d'?copied.draft.artwork.front.texts[0].text:copied.design.design.zones.Back.layers[0].text,'CUSTOMER COPY');
  assert.deepEqual(f.files.get(f.designs.get(id).package_path),p.bytes,'Public edits preserve exact original');
  await page.setViewportSize({width:390,height:844});await page.goto(url);await ready();assert(await page.locator('.shop-design-toolbar').isVisible());
  await page.screenshot({path:path.join(output,engine+'-mobile.png'),fullPage:true});await page.setViewportSize({width:1360,height:1000});
 }
 console.log('Testing owner creation and save/reopen');
 await page.goto(base+'/print-shop-designs.html');await page.locator('#designEmail').fill('owner@example.com');await page.locator('#designPassword').fill('synthetic-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#newShopDesign').waitFor();await page.locator('#newShopDesign').click();await ready();
 await page.locator('.shop-design-toolbar input[maxlength="100"]').fill('Owner created design');await page.getByRole('button',{name:'Add Text',exact:true}).click();await page.locator('#textContent').fill('SHOP ORIGINAL');await page.locator('#textContent').dispatchEvent('input');
 await page.getByRole('button',{name:'Save design and get customer link'}).click();await page.getByText('Saved. Customer link ready.',{exact:false}).waitFor();
 const ownerLink=await page.getByRole('textbox',{name:'Customer design link'}).inputValue();assert(ownerLink.includes('#view='));
 const savedId=new URL(ownerLink).searchParams.get('design');assert(f.designs.get(savedId).locked);
 await page.goto(base+'/shops/'+shop.slug+'?shopOwner=1&businessId='+businessId+'&designId='+savedId);await ready();assert((await page.locator('#review').textContent()).includes('SHOP ORIGINAL'));
 console.log('Testing existing general shop request and ZIP');
 await page.goto(base+'/shops/'+shop.slug);await ready();assert.equal(await page.locator('.shop-design-toolbar').count(),0);await page.getByRole('button',{name:'Add Text',exact:true}).click();await page.locator('#textContent').fill('GENERAL REQUEST');await page.locator('#textContent').dispatchEvent('input');
 await page.locator('#shopName').fill('Synthetic Customer');await page.locator('#shopEmail').fill('test@example.com');await page.locator('#shopPhone').fill('2025550101');await page.locator('#shopForm input[type=checkbox]').check();await page.waitForTimeout(2200);await page.locator('#shopSend').click();await page.getByText('Request SYNTHETIC-REQUEST accepted',{exact:false}).waitFor();
 assert.equal(emails.length,1);assert.equal(emails[0].attachments.length,1);assert.equal(emails[0].to[0],'owner@example.com');assert((await JSZip.loadAsync(Buffer.from(emails[0].attachments[0].content,'base64'))).file('design.json'));
 assert.deepEqual(errors,[]);console.log('PASS browser: 2D/3D exact saved links, locked viewing, navigation, editable copies, mobile, owner save/reopen, general unpaid request/email/ZIP; no real services called.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
