import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createCanvas} from '@napi-rs/canvas';
import {chromium} from '/Users/uptownharlem/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {GARMENT_MAPPING} from '../v20/garment-mapping-catalog.js';

const base=process.env.MQD_GRID_PREVIEW_URL||'http://127.0.0.1:8786';
const out=process.env.MQD_GRID_SCREENSHOTS||'/private/tmp/mqd-grid-preview';
await fs.mkdir(out,{recursive:true});
const art=createCanvas(480,640),c=art.getContext('2d');
c.fillStyle='#101012';c.fillRect(0,0,480,640);
c.fillStyle='#b64d28';c.fillRect(50,160,380,320);
c.fillStyle='#fff';c.font='bold 45px sans-serif';c.textAlign='center';c.fillText('ALIGNMENT',240,320);
const png=art.toDataURL(),mapping=GARMENT_MAPPING['fleece-hoodie'];
const payload={schema:'mqd-design-v1',engine:{calibration:'v26-surface-uv-collar-strip'},product:{id:'fleece-hoodie',model:mapping.model},templates:mapping.templates,activeZone:'Front',design:{zones:Object.fromEntries(mapping.zones.map(zone=>[zone,{background:'#101012',layers:[{id:'qa-art',label:'Synthetic opaque artwork',type:'image',filename:'alignment.png',src:png,x:0,y:0,scale:1,rotation:0,visible:true}]}]))}};
const errors=[],mutations=[];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  await context.route('**/*',async route=>{
    const req=route.request();
    if(req.method()!=='GET'){mutations.push(new URL(req.url()).pathname);return route.fulfill({status:200,contentType:'application/json',body:'{}'});}
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/index.html');
  await page.waitForFunction(()=>window.MQDDesigner,null,{timeout:60000});
  await page.evaluate(p=>window.MQDDesigner.loadDesign(p,{notify:false}),payload);
  await page.waitForTimeout(2000);
  const skip=page.getByRole('button',{name:'Skip tour',exact:true});
  if(await skip.isVisible())await skip.click();
  const zones=process.env.MQD_GRID_ZONES?.split(',')||mapping.zones;
  for(const zone of zones){
    await page.locator('#zoneRail button[title^="'+zone+'"]').click();
    await page.waitForTimeout(400);
    const before=await page.evaluate(()=>{const {savedAt,...design}=window.MQDDesigner.exportDesign();return JSON.stringify(design);});
    const withGrid=await page.locator('#editorCanvas').evaluate(e=>e.toDataURL());
    await page.locator('#gridToggle').click();
    const withoutGrid=await page.locator('#editorCanvas').evaluate(e=>e.toDataURL());
    assert.notEqual(withGrid,withoutGrid,zone+' toggle changes visible grid');
    await page.locator('#gridToggle').click();
    assert.equal(await page.locator('#editorCanvas').evaluate(e=>e.toDataURL()),withGrid,zone+' grid restores exactly');
    assert.equal(await page.evaluate(()=>{const {savedAt,...design}=window.MQDDesigner.exportDesign();return JSON.stringify(design);}),before,zone+' toggle does not change saved design');
    await page.locator('#editorCanvas').screenshot({path:out+'/'+zone.toLowerCase().replaceAll(' ','-')+'.png'});
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,zones,screenshots:out,interceptedNonGetRequests:mutations}));
}finally{await browser.close();}
