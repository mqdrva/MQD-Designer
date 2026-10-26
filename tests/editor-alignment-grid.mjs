import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createCanvas} from '@napi-rs/canvas';
import {GARMENT_MAPPING} from '../v20/garment-mapping-catalog.js';

const section=(s,name)=>s.split('// @mapping-begin '+name+'\n')[1].split('\n// @mapping-end '+name)[0];
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const pixel=(c,x,y)=>Array.from(c.getContext('2d').getImageData(Math.round(x),Math.round(y),1,1).data);
let cases=0,zones=0;
for(const host of ['editor.js','shop-editor.js']){
  const source=fs.readFileSync(new URL('../v20/'+host,import.meta.url),'utf8');
  const c={editorCanvas:{width:760,height:860},editorZoom:1,showGrid:true,
    zoneState:()=>({background:'#101010',layers:[{type:'image'}]}),zoneHasContent:()=>true,
    drawEditorTextOverlay:()=>{},drawSafeAreaGuide:()=>{},
    traceZonePath:(ctx,_zone,w,h)=>{ctx.beginPath();ctx.rect(0,0,w,h);},
    drawLayerStack:(ctx,_zone,r)=>{ctx.fillStyle=c.fill;ctx.fillRect(r.x,r.y,r.w,r.h);}};
  vm.createContext(c);
  vm.runInContext(['editorRect','drawGridLines','drawZoneComposite'].map(n=>section(source,n)).join('\n'),c);
  for(const [id,product] of Object.entries(GARMENT_MAPPING))for(const zone of product.zones){
    if(host==='editor.js')zones++;
    c.product={id,...product};c.activeZone=zone;
    for(const fallback of [false,true])for(const zoom of [.6,1,1.6])for(const fill of ['#101010','#ffffff','#b82969']){
      c.editorZoom=zoom;c.fill=fill;
      const bitmap=createCanvas(400,400),b=bitmap.getContext('2d');b.fillStyle=fill;b.fillRect(0,0,400,400);
      const rec={img:bitmap,maskCanvas:bitmap,bounds:{x:0,y:0,w:400,h:400}};
      c.ensureTemplateImage=()=>fallback?null:rec;c.renderMaskedZoneCanvas=()=>bitmap;
      const render=(grid,guides=true)=>{c.showGrid=grid;const out=createCanvas(760,860);c.drawZoneComposite(out.getContext('2d'),760,860,guides);return out;};
      const before=render(false),after=render(true),r=c.editorRect(zone),cx=r.x+r.w/2,cy=r.y+r.h/2;
      assert.notDeepEqual(pixel(after,cx,cy),pixel(before,cx,cy),`${host} ${id}/${zone}: grid crosses opaque artwork (${fill}, zoom ${zoom}, fallback ${fallback})`);
      // A continuous center line must also reach the editor edges at every zoom.
      assert.notDeepEqual(pixel(after,380,2),pixel(before,380,2),`${id}/${zone}: top edge coverage`);
      assert.notDeepEqual(pixel(after,2,430),pixel(before,2,430),`${id}/${zone}: left edge coverage`);
      assert.deepEqual(pixels(render(true,false)),pixels(render(false,false)),`${id}/${zone}: guide-free output must not depend on grid toggle`);
      assert.deepEqual(pixels(render(false)),pixels(before),`${id}/${zone}: toggling off restores artwork`);
      cases++;
    }
  }
  // Canvas state must not leak into later artwork, safe-area or red cut guides.
  const canvas=createCanvas(760,860),ctx=canvas.getContext('2d');ctx.strokeStyle='#eb232d';ctx.lineWidth=9;ctx.setLineDash([12,9]);
  c.drawGridLines(ctx,{x:80,y:70,w:600,h:720});
  assert.equal(ctx.lineWidth,9);assert.deepEqual(ctx.getLineDash(),[12,9]);
  // napi-rs keeps a stale JS strokeStyle getter after restore; check its raster state.
  ctx.clearRect(0,0,760,860);ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(20,20);ctx.lineTo(100,20);ctx.stroke();
  assert.deepEqual(pixel(canvas,50,20),[235,35,45,255]);
}
console.log(`PASS: continuous overlay on ${zones} zones across all 12 garments, both hosts, 3 colors, 3 zoom levels, bitmap/fallback paths; ${cases} cases; guide-free output unchanged.`);
