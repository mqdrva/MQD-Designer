import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {chromium} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true}),page=await context.newPage(),errors=[];
const pricing={version:'qa',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500};
await context.route('**/*',r=>r.request().method()!=='GET'?r.abort():r.request().url().includes('mqd-team-service?catalog=1')?r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({pricing})}):r.continue());page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8776/team-setup.html');await page.locator('#teamDesignerMode').waitFor();await page.waitForFunction(()=>document.querySelector('#plan').disabled);
 await page.locator('#teamDesignerMode').selectOption('3d');assert(await page.locator('#garmentRows').isHidden());assert(await page.locator('#preview2d').isHidden());assert(await page.locator('#allOverSection').isVisible());
 const common3=page.locator('#allOverSection .shared-garment-setup');
 for(const el of await common3.locator('.shared-size').all())await el.setChecked(['L','5XL'].includes(await el.inputValue()));
 for(const id of ['tshirt','long-sleeve-tshirt','short-sleeve-polo','fleece-hoodie']){
  const row=page.locator(`[data-product="${id}"]`);assert.deepEqual(await row.locator('.offered-size:checked').evaluateAll(es=>es.map(e=>e.value)),['L','5XL']);await row.locator('.garment-enabled').check();assert.deepEqual(await row.locator('.offered-size:checked').evaluateAll(es=>es.map(e=>e.value)),['L','5XL']);
 }
 assert((await common3.getByRole('status').textContent()).includes('Sizes applied'));assert.equal(await page.locator('input[value="6XL"]').count(),0);
 await page.locator('#businessName').fill('Synthetic Team Options');await page.locator('#requestEmail').fill('team-options@example.com');await page.locator('#businessPhone').fill('2025550104');await page.locator('#setupConsent').check();await page.locator('.setup-backup').evaluate(e=>e.open=true);
 const pending=page.waitForEvent('download');await page.locator('#downloadSetup').click();const download=await pending;await download.saveAs('/private/tmp/mqd-team-options-backup.json');const p=JSON.parse(await fs.readFile('/private/tmp/mqd-team-options-backup.json'));assert.deepEqual(p.shop.engines,['3d']);assert.deepEqual(p.shop.pricing.baseCents,{});assert.equal(Object.keys(p.shop.garments).length,4);
 await page.locator('#teamDesignerMode').selectOption('both');const common2=page.locator('.shared-garment-setup').first();for(const el of await common2.locator('.shared-size').all())await el.setChecked(['L','4XL'].includes(await el.inputValue()));for(const el of await common2.locator('.shared-color').all())await el.setChecked((await el.inputValue())==='Black');await common2.getByRole('button',{name:'Apply sizes and colors to all 2D garments'}).click();
 for(const row of await page.locator('#garmentRows > .garment-card').all()){assert.deepEqual(await row.locator('.offered-size:checked').evaluateAll(es=>es.map(e=>e.value)),['L','4XL']);assert.deepEqual(await row.locator('.offered-color:checked').evaluateAll(es=>es.map(e=>e.value)),['Black']);await row.locator('.garment-enabled').check();}
 assert((await common2.getByRole('status').textContent()).includes('applied'));
 await page.locator('#loadSetup').setInputFiles('/private/tmp/mqd-team-options-backup.json');await page.waitForFunction(()=>document.getElementById('setupStatus').textContent.includes('loaded'));assert.equal(await page.locator('#teamDesignerMode').inputValue(),'3d');assert(await page.locator('#garmentRows').isHidden());
 await page.setViewportSize({width:390,height:844});assert(await page.locator('#teamDesignerMode').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 globalThis.Deno={env:{get:()=>JSON.stringify(pricing)}};
 const {canonicalTeamShop}=await import('../supabase/functions/mqd-team-service/runtime.js');const publicShop=canonicalTeamShop(p.shop);
 await context.route('**/functions/v1/mqd-team-service?team=*',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({shop:publicShop,batches:[],mode:'sandbox',master:null})}));
 await context.route('http://127.0.0.1:8776/teams/'+p.shop.slug+'/3d',async r=>r.fulfill({response:await context.request.get('http://127.0.0.1:8776/team-3d.html')}));
 await page.goto('http://127.0.0.1:8776/team-2d.html?shop='+p.shop.slug);await page.waitForURL('**/teams/'+p.shop.slug+'/3d');await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:60000});assert(await page.locator('#shopSwitch').isHidden());
 console.log('PASS 3D-only public member link redirects to 3D and hides the 2D switch.');
 console.log('PASS browser: 3D-only hides 2D, common 3D sizes populate all four garments before/after enabling, common 2D sizes/colors apply, 5XL cap, backup/reopen, mobile, no POSTs.');
}catch(e){console.log('SETUP STATUS',await page.locator('#setupStatus').textContent());throw e;}finally{await browser.close();}
