import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const packet=JSON.parse(await fs.readFile(new URL('../../../outputs/print-shop-pilot/business-setup-dimensions.json',import.meta.url)));
const api='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-setup';
const key='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage(),errors=[],calls=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.route(api,async route=>{const body=route.request().postDataJSON();calls.push(body);await route.fulfill({json:body.action==='load'?{setup:packet,revision:2,status:'pilot_active',emailVerified:true}:{revision:3,message:'Changes saved for review. Your current live settings remain unchanged.'}});});
 const id=crypto.randomUUID();await page.goto('http://127.0.0.1:8765/print-shop-setup.html?setupId='+id+'#manage='+'a'.repeat(64));
 await page.waitForFunction(()=>document.getElementById('submitSetup').textContent.includes('updates'));
 assert.equal(new URL(page.url()).hash,'');assert(await page.locator('#requestEmail').evaluate(e=>e.readOnly));assert(await page.locator('#shopSlug').evaluate(e=>e.readOnly));
 await page.locator('#businessName').fill('UPDATED SHOP');await page.locator('#setupConsent').check();await page.waitForTimeout(2100);await page.locator('#submitSetup').click();await page.waitForFunction(()=>document.getElementById('setupStatus').textContent.includes('Changes saved'));
 assert.equal(calls[1].action,'update');assert.equal(calls[1].revision,2);assert.equal(calls[1].setup.shop.name,'UPDATED SHOP');assert.deepEqual(errors,[]);
 await page.unroute(api);
 const invalid=await page.request.post(api,{headers:{apikey:key,Origin:'http://127.0.0.1:8765'},data:{action:'load',id,token:'b'.repeat(64)}});assert.equal(invalid.status(),401);
 const admin=await page.request.post(api,{headers:{apikey:key,Origin:'http://127.0.0.1:8765'},data:{action:'admin-list'}});assert.equal(admin.status(),403);
 if(process.env.TEST_SUBMIT_SETUP==='1'){
  const own=structuredClone(packet);own.owner.requestEmail='mqdrva@gmail.com';own.shop.slug='mqd-service-test-'+Date.now().toString(36);own.shop.name='MYMERCHNOW onboarding test';
  const body={action:'submit',setup:own,requestId:crypto.randomUUID(),website:'',startedAt:Date.now()-3000};
  const first=await page.request.post(api,{headers:{apikey:key,Origin:'http://127.0.0.1:8765'},data:body});const result=await first.json();assert.equal(first.status(),200,JSON.stringify(result));assert.equal(result.confirmationAccepted,true);
  const retry=await page.request.post(api,{headers:{apikey:key,Origin:'http://127.0.0.1:8765'},data:body});assert.equal(retry.status(),200);assert.equal((await retry.json()).reference,result.reference);
  const inactive=await page.request.get('https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-pilot?shop='+own.shop.slug,{headers:{apikey:key}});assert.equal(inactive.status(),404);
  await fs.writeFile(new URL('../../../outputs/print-shop-pilot/onboarding-live-verification.json',import.meta.url),JSON.stringify({reference:result.reference,shop:own.shop.slug,privateId:body.requestId,confirmationAccepted:true,idempotentRetry:true,inactiveUntilApproved:true},null,2));
  console.log(JSON.stringify({reference:result.reference,confirmationAccepted:true,idempotentRetry:true,inactiveUntilApproved:true}));
 }
 await page.goto('http://127.0.0.1:8765/print-shop-admin.html');await page.waitForFunction(()=>document.getElementById('adminLogin'));assert(await page.locator('#adminLogin').isVisible());assert.equal(await page.locator('#businessList').evaluate(e=>e.children.length),0);assert.deepEqual(errors,[]);
 console.log('Private owner UI, deployed authorization checks, and administrator sign-in screen passed.');
}finally{await browser.close();}
