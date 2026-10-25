import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',calls=[],errors=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const state={name:'Synthetic Organizer Team',slug:'synthetic-organizer',billingOnly:true,hasBillingPeriod:true,canSubscribe:true,enabled:true,mode:'sandbox',policyVersion:'2026-10-25-owner',account:{status:'active',billingStatus:'active',hasSubscription:true,periodEnd:'2026-11-25T00:00:00Z'},reward:{garments:3,target:5,remaining:2,creditCents:0},batches:[]};
 let packet=null,revision=0;
 const pricing={version:'qa',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500};
 await context.route('**/*',async route=>{
  const req=route.request(),url=req.url();
  if(url.startsWith('https://esm.sh/@supabase/supabase-js@2.57.4'))return route.fulfill({contentType:'application/javascript',body:`export const createClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}}),getUser:async()=>({data:{user:{app_metadata:{role:'admin'}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2'}})},signOut:async()=>({})}});`});
  if(url.includes('/functions/v1/mqd-team-service')){
   if(req.method()==='GET')return route.fulfill({json:{pricing}});
   const body=req.postDataJSON();calls.push(body);assert.equal(req.headers().authorization,'Bearer synthetic');
   if(body.action==='owner-status')return route.fulfill({json:state});
   if(body.action==='subscribe'){assert.equal(body.policyVersion,'2026-10-25-owner');assert.equal(body.rewardQuantity,5);return route.fulfill({status:409,json:{error:'Synthetic checkout captured. No external payment.'}});}
   if(body.action==='portal')return route.fulfill({status:409,json:{error:'Synthetic billing portal captured.'}});
   if(body.action==='admin-workspace-list')return route.fulfill({json:{workspaces:[]}});
   if(body.action==='admin-workspace-save'){packet=body.packet;return route.fulfill({json:{revision:++revision,message:'Owner draft saved.'}});}
   if(body.action==='admin-master-load')return route.fulfill({json:{draft:null,revision:0}});
   throw new Error('Unexpected action '+body.action);
  }
  if(req.method()!=='GET')throw new Error('Unexpected mutation '+url);
  return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8776/team-owner.html?setupId='+id+'&organizer=1');
 await page.getByText('3 of 5 qualifying paid garments',{exact:false}).waitFor();
 assert(await page.locator('#batchSection').isHidden());assert.equal(await page.getByRole('button',{name:/Edit|Publish|production/i}).count(),0);
 await page.locator('#teamPortal').click();await page.getByText('Synthetic billing portal captured.',{exact:true}).waitFor();
 state.account={status:'awaiting_review',billingStatus:'not_configured',hasSubscription:false};state.hasBillingPeriod=false;
 await page.locator('#teamRefresh').click();await page.getByText('Counting begins when your paid subscription starts.',{exact:false}).waitFor();
 const before=calls.length;await page.locator('#teamSubscribe').click();assert.equal(calls.length,before,'Terms consent required');await page.locator('#teamTerms').check();await page.locator('#teamSubscribe').click();await page.getByText('Synthetic checkout captured. No external payment.',{exact:true}).waitFor();
 await page.setViewportSize({width:390,height:844});assert(await page.locator('#teamTerms').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+5));
 await page.setViewportSize({width:1280,height:900});await page.goto('http://127.0.0.1:8776/team-setup.html?ownerWorkspace=1');await page.locator('#workspaceOrganizerBilling').waitFor();
 assert.equal(await page.locator('#workspaceOrganizerBilling').isChecked(),false);assert.equal(await page.locator('#workspaceRewardQuantity').inputValue(),'5');assert(await page.locator('#workspaceOrganizerLink').isHidden());
 await page.locator('#workspaceEditing').selectOption('strict');await page.locator('#teamDesignerMode').selectOption('3d');await page.locator('#businessName').fill('Synthetic Organizer Team');await page.locator('#setupConsent').check();await page.locator('#submitSetup').click();await page.getByText('Owner draft saved.',{exact:true}).waitFor();assert.deepEqual(packet.owner.organizerAccess,{enabled:false,rewardQuantity:5});
 await page.locator('#requestEmail').fill('organizer@example.invalid');await page.locator('#workspaceOrganizerBilling').check();await page.locator('#submitSetup').click();await page.waitForFunction(()=>!document.getElementById('workspaceOrganizerLink').hidden);assert.equal(packet.owner.organizerAccess.enabled,true);assert((await page.locator('#workspaceOrganizerLink').getAttribute('href')).endsWith('&organizer=1'));
 assert.deepEqual(errors,[]);await fs.mkdir('/private/tmp/mqd-organizer-qa',{recursive:true});await page.screenshot({path:'/private/tmp/mqd-organizer-qa/owner-controls.png',fullPage:true});
 console.log('PASS browser: owner access defaults off/target five; explicit grant and billing-only link; organizer progress, consent-required synthetic checkout/portal, hidden management/batches, mobile. No live writes/payments/messages.');
}finally{await browser.close();}
