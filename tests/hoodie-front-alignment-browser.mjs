import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import {chromium} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
import {validateTeamMaster,assertTeamMemberCopy} from '../supabase/functions/_shared/mqd-team-masters.js';
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',mapping=GARMENT_MAPPING['fleece-hoodie'];
const pricing={version:'qa',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500};globalThis.Deno={env:{get:()=>JSON.stringify(pricing)}};const {canonicalTeamShop}=await import('../supabase/functions/mqd-team-service/runtime.js');
const packet=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url)));packet.shop.engines=['3d'];packet.shop.garments={'fleece-hoodie':{brand:'',style:'',sizes:['S','M','L','XL','2XL','3XL','4XL','5XL'],colors:['White'],logoPreset:{mode:'none'}}};packet.shop=canonicalTeamShop(packet.shop);packet.shop.name='Synthetic visual team';
const c=createCanvas(256,256);c.getContext('2d').fillRect(10,10,236,236);const png=c.toBuffer('image/png'),src=c.toDataURL();
const image=(key,x,y,scale)=>({id:key,label:key,type:'image',filename:'synthetic-logo.png',src,x,y,scale,rotation:0,visible:true});
const text=(key,x,y)=>({id:key,label:key,type:'text',text:'NAME',font:'Inter',color:'#111111',x,y,scale:.5,rotation:0,visible:true});
let draft={name:'Synthetic visual master',payload:{schema:'mqd-design-v1',engine:{calibration:'v26-surface-uv-collar-strip'},product:{id:'fleece-hoodie',model:mapping.model},templates:mapping.templates,activeZone:'Front',design:{teamPermissions:{wholeGarmentColor:true},zones:Object.fromEntries(mapping.zones.map(z=>[z,{background:'#FFFFFF',layers:z==='Front'?[image('front-logo',36.244,-41,.12),text('front-name',-32,-41)]:z==='Back'?[image('back-logo',0,20,.3),text('back-name',0,-50)]:[]}]))}},rules:[{zone:'Front',layerId:'front-logo',role:'locked',label:'Front logo'},{zone:'Front',layerId:'front-name',role:'text',label:'Front name',maxLength:24,allowMove:true},{zone:'Back',layerId:'back-logo',role:'locked',label:'Back logo'},{zone:'Back',layerId:'back-name',role:'text',label:'Back name',maxLength:24,allowMove:true}]};validateTeamMaster(draft);
const historical=JSON.stringify(draft),calls=[],errors=[];let revision=1,authenticated=true,holdSave=false,releaseSave;
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{const context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.route('**/*',async route=>{const req=route.request(),url=req.url();if(url.startsWith('https://esm.sh/@supabase/supabase-js@2.57.4'))return route.fulfill({contentType:'application/javascript',body:`export const createClient=()=>({auth:{getSession:async()=>({data:{session:${authenticated?"{access_token:'synthetic-owner'}":"null"}}}),getUser:async()=>({data:{user:{app_metadata:{role:'admin'}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})}}});`});
if(url.includes('/functions/v1/mqd-team-service')){if(req.method()==='GET')return route.fulfill({contentType:'application/json',body:JSON.stringify({pricing})});const b=req.postDataJSON();calls.push(b.action);assert.equal(req.headers().authorization,'Bearer synthetic-owner');let data;if(b.action==='admin-workspace-load')data={id,revision:1,kind:'team',editingMode:'strict',packet,published:false};else if(b.action==='admin-master-load')data={draft,revision};else if(b.action==='admin-workspace-list')data={workspaces:[]};else if(b.action==='admin-master-save'){assert.equal(b.publish,false);if(b.revision!==revision)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({code:'master_revision_conflict',error:'A newer master draft was saved. Your canvas is unchanged. Open the latest saved draft separately to compare before continuing.'})});validateTeamMaster(b.draft);draft=structuredClone(b.draft);data={revision:++revision};if(holdSave)await new Promise(resolve=>releaseSave=resolve);}else throw new Error('Unexpected mutation '+b.action);return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}
if(url.includes('/teams/pilot/3d'))return route.fulfill({response:await context.request.get('http://127.0.0.1:8776/team-3d.html')});if(req.method()!=='GET'){console.log('Intercepted background request',new URL(url).pathname);return route.fulfill({status:200,contentType:'application/json',body:'{}'});}return route.continue();});

await context.addInitScript(()=>window.addEventListener('mqd:garment-ready',e=>window.hoodieReady=e.detail.productId));
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
for(const host of ['main','team']){
 await page.goto(host==='main'?'http://127.0.0.1:8776/index.html':'http://127.0.0.1:8776/teams/pilot/3d?setupPreview=1&ownerWorkspace='+id+'&garment=fleece-hoodie');
 await page.waitForFunction(()=>window.MQDDesigner,null,{timeout:60000});
 if(host==='main')await page.evaluate(p=>window.MQDDesigner.loadDesign(p,{notify:false}),structuredClone(draft.payload));
 else await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:60000});
 await page.waitForFunction(()=>window.hoodieReady==='fleece-hoodie',null,{timeout:60000});
 if(await page.getByRole('button',{name:'Skip tour',exact:true}).isVisible())await page.getByRole('button',{name:'Skip tour',exact:true}).click();
 for(const zone of ['Front','Back']){
 await page.locator('#zoneRail button').filter({hasText:zone}).click();
 await page.evaluate(zone=>window.MQDDesigner.setProductionProofView(zone.toLowerCase()),zone);
 await page.waitForTimeout(1500);
 await page.screenshot({path:'/private/tmp/hoodie-'+host+'-'+zone.toLowerCase()+'-alignment.png'});
 }
 const out=await page.evaluate(()=>window.MQDDesigner.exportDesign());
 for(const zone of ['Front','Back'])for(const layer of draft.payload.design.zones[zone].layers){const after=out.design.zones[zone].layers.find(l=>l.id===layer.id);for(const key of ['x','y','scale','rotation','src','text'])assert.equal(after[key],layer[key],host+' '+zone+' saved '+key);}
}
assert.deepEqual(errors,[]);assert(!calls.includes('admin-master-save'));
console.log('PASS main and Team hoodie load the same unchanged design, render Front/Back, retain saved coordinates and original image bytes; no live writes.');
}finally{await browser.close();}
