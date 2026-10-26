import {createCanvas} from '@napi-rs/canvas';
import JSZip from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/jszip/lib/index.js';
import {verifyTeamProduction} from '../supabase/functions/_shared/mqd-team-production.js';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {webkit} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
import {assertTeamMemberCopy} from '../supabase/functions/_shared/mqd-team-masters.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/print-shop-setup.json',import.meta.url)));
globalThis.Deno={env:{get:()=>JSON.stringify({version:'test',baseCents:{'everyday-tshirt':2000,'everyday-long-sleeve':3000,'everyday-polo':3000,'everyday-hoodie':4000},printCents:{front:0,back:1000,left:0,right:0},sleeveCents:500,sizeSurchargeCents:500})}};const {canonicalTeamShop}=await import('../supabase/functions/mqd-team-service/runtime.js');fixture.shop.garments.tshirt={colors:['White'],sizes:['S','M','L','XL']};fixture.shop.engines=['2d','3d'];const shop=canonicalTeamShop(fixture.shop);shop.slug='fixture-team';
const mapping=GARMENT_MAPPING.tshirt;
const master={id:crypto.randomUUID(),team_id:crypto.randomUUID(),name:'Synthetic team',payload:{schema:'mqd-design-v1',product:{id:'tshirt',name:'Short Sleeve T-Shirt',category:'T-Shirts',price:39,model:mapping.model},engine:{calibration:'v26-surface-uv-collar-strip'},templates:mapping.templates,design:{zones:Object.fromEntries(mapping.zones.map(z=>[z,{background:'#ffffff',layers:[]}]))}},rules:[{zone:'Front',layerId:'name',role:'text',label:'Member name',maxLength:30},{zone:'Back',layerId:'number',role:'text',label:'Number',maxLength:2,choices:['1','2','3']}]};
master.payload.design.zones.Front.layers=[{id:'name',type:'text',text:'NAME',font:'Inter',x:0,y:0,scale:1,rotation:0,visible:true,color:'#111111'}];master.payload.design.zones.Back.layers=[{...master.payload.design.zones.Front.layers[0],id:'number',text:'1'}];
const art=createCanvas(256,256);art.getContext('2d').fillRect(0,0,128,256);master.payload.design.zones.Front.layers.unshift({id:'logo',type:'image',filename:'synthetic-logo.png',src:art.toDataURL('image/png'),x:0,y:0,scale:.1,rotation:0,visible:true});master.rules.unshift({zone:'Front',layerId:'logo',role:'locked',label:'Protected logo'});

master.rules.filter(r=>r.role==='text').forEach(r=>r.allowMove=true);
master.payload.design.teamPermissions={wholeGarmentColor:true};
const browser=await webkit.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.route('**/*',route=>{const r=route.request();if(r.url().includes('/functions/v1/mqd-team-service'))return route.fulfill({json:{shop,batches:[],mode:'sandbox',master}});return r.method()==='GET'?route.continue():route.abort();});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8776/team-3d.html?shop=fixture-team');await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:90000});
 // Selection event is the same boundary used by tapping a text layer on canvas.
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('mqd:selection-changed',{detail:{id:'name',productId:'tshirt',zone:'Front',type:'text',text:'NAME',locked:true}})));
 assert.equal(await page.locator('#controlPane').isVisible(),false,'Selecting text must not open a clipped form sheet');
 assert(!((await page.locator('#mobileSelectedLayer').textContent()).includes('Locked')));
 await page.locator('#mobileEditLayer').click();assert.equal(await page.locator('.app').getAttribute('data-mobile-workspace'),'order');
 for(const viewport of [{width:390,height:844},{width:390,height:440},{width:844,height:390},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  const input=page.getByLabel('Member name',{exact:true});await input.fill('Mobile Taylor');await input.press('Tab');
  await page.waitForFunction(()=>window.MQDDesigner.exportDesign().design.zones.Front.layers.some(l=>l.text==='Mobile Taylor'));
  for(const selector of ['#teamMemberFields input[type=color]','#teamColorPresets button:last-child','#shopSend']){
   const target=page.locator(selector);await target.scrollIntoViewIfNeeded();
   const visible=await target.evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {reachable:r.top>=0&&r.bottom<=innerHeight+1&&!!hit&&(hit===el||el.contains(hit)),h:r.height};});
   assert(visible.reachable,JSON.stringify({viewport,selector,visible}));if(selector.includes('type=color'))assert(visible.h>=44);
  }
  const layout=await page.evaluate(()=>({overflow:getComputedStyle(document.querySelector('#controlPane')).overflowY,max:getComputedStyle(document.querySelector('#controlPane')).maxHeight,width:document.documentElement.scrollWidth,viewport:innerWidth,font:getComputedStyle(document.querySelector('#teamMemberFields input[type=text]')).fontSize}));
  assert.equal(layout.overflow,'visible');assert.equal(layout.max,'none');assert.equal(layout.font,'16px');assert(layout.width<=layout.viewport+1);
 }
 await page.getByRole('button',{name:'Color whole shirt Red',exact:true}).click();await page.waitForFunction(()=>Object.values(window.MQDDesigner.exportDesign().design.zones).every(z=>z.background==='#C62828'));
 await page.locator('[data-team-coordinate=y]').first().fill('15');await page.locator('[data-team-coordinate=y]').first().dispatchEvent('change');await page.waitForFunction(()=>window.MQDDesigner.exportDesign().design.zones.Front.layers.some(l=>l.type==='text'&&l.y===15));
 const result=await page.evaluate(()=>window.MQDDesigner.exportDesign());master.payload.engine=result.engine;master.payload.product=result.product;assertTeamMemberCopy(result,master);
 await page.locator('#teamColorPresets').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/mqd-mobile-scroll-fixed.png'});
 await page.getByRole('button',{name:'Preview my shirt',exact:true}).click();assert(await page.locator('#previewPane').isVisible());
 await page.locator('[data-mobile-pane=order]').click();assert.equal(await page.getByLabel('Member name',{exact:true}).inputValue(),'Mobile Taylor');
 assert.deepEqual(errors,[]);console.log('PASS WebKit mobile: no clipped selection sheet; names, movement and colors persist; all colors and checkout reachable at phone, keyboard-height and landscape sizes; protected artwork unchanged.');
}finally{await browser.close();}
