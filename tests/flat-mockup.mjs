import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {drawFlatTshirt,drawFlatGarment,flatViews,supportsFlatMockup,installFlatMockup} from '../v20/flat-mockup.js';

const colors={'Front':'#112233','Back':'#445566','Right Sleeve':'#ff0000','Left Sleeve':'#00ff00','Collar':'#0000ff'};
const texture=zone=>{const c=createCanvas(200,200),x=c.getContext('2d');x.fillStyle=colors[zone];x.fillRect(0,0,200,200);return c;};
const canvas=createCanvas(800,900),ctx=canvas.getContext('2d');
const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data).slice(0,3);
drawFlatTshirt(canvas,'Front',texture);
assert.deepEqual(pixel(400,490),[17,34,51]);
assert.deepEqual(pixel(160,350),[255,0,0]);
assert.deepEqual(pixel(640,350),[0,255,0]);
assert.deepEqual(pixel(400,180),[247,247,247]);
drawFlatTshirt(canvas,'Back',texture);
assert.deepEqual(pixel(400,490),[68,85,102]);
assert.deepEqual(pixel(160,350),[0,255,0]);
assert.deepEqual(pixel(640,350),[255,0,0]);

function element(){return {children:[],attributes:{},classList:{toggle(){}},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;},addEventListener(k,f){this[k]=f;}};}
const three=element(),flat=element(),pane=element(),save=element(),share=element();
pane.querySelectorAll=()=>[three,flat];
globalThis.document={getElementById:id=>({previewPane:pane,saveScreenshot:save,shareScreenshot:share}[id]),createElement:tag=>{
 if(tag!=='canvas')return element();
 const c=createCanvas(800,900);c.setAttribute=()=>{};c.toBlob=fn=>fn(c.toBuffer('image/png'));return c;
}};
globalThis.requestAnimationFrame=fn=>{queueMicrotask(fn);return 1;};
let product={id:'tshirt',name:'Short Sleeve T-Shirt'};
const ui=installFlatMockup({getProduct:()=>product,drawZone:texture});
assert.equal(flat.disabled,false);flat.click();assert.equal(ui.isActive(),true);
const switcher=pane.children[0].children[1];switcher.children[1].onclick();
assert.equal(switcher.children[1].attributes['aria-pressed'],'true');
assert((await ui.capture()).length>1000);
three.click();assert.equal(ui.isActive(),false);
flat.click();product={id:'lightweight-jacket'};ui.update();
assert.equal(ui.isActive(),true);assert.equal(flat.disabled,false);
product={id:'hat'};ui.update();assert.equal(switcher.children[1].textContent,'Top of Bill');
switcher.children[1].onclick();assert.equal(switcher.children[1].attributes['aria-pressed'],'true');
product={id:'mask'};ui.update();assert.equal(switcher.hidden,true);assert.equal(switcher.children[1].hidden,true);
product={id:'tshirt'};ui.update();assert.equal(switcher.hidden,false);assert.equal(switcher.children[1].textContent,'Back');
product={id:'unknown'};ui.update();assert.equal(ui.isActive(),false);assert.equal(flat.disabled,true);

const topZones=['Front','Back','Left Sleeve','Right Sleeve','Collar'];
const hoodZones=['Front','Back','Left Sleeve','Right Sleeve','Hood'];
export const products={tshirt:topZones,'long-sleeve-tshirt':topZones,'short-sleeve-polo':topZones,'long-sleeve-polo':topZones,'fleece-hoodie':hoodZones,'lightweight-jacket':hoodZones,'hooded-long-sleeve':hoodZones,'hood-mask-shirt':[...hoodZones,'Built-In Mask'],shorts:['Front','Back'],'sweat-pants':['Front','Back'],mask:['Entire Mask'],hat:['Front Panel','Top of Bill']};
for(const [id,zones] of Object.entries(products)){
 assert(supportsFlatMockup(id));const seen=new Set();
 for(const side of flatViews(id)){
  drawFlatGarment(canvas,id,side,zone=>{assert(zones.includes(zone),id+' invalid zone '+zone);seen.add(zone);return texture(zone);});
  const pixels=ctx.getImageData(0,0,800,900).data;let filled=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]!==247||pixels[i+1]!==247||pixels[i+2]!==247)filled++;
  assert(filled>15000,id+' must render a visible silhouette');
 }
 assert.deepEqual([...seen].sort(),[...zones].sort(),id+' must show every printable zone');
}
console.log('PASS all 12 flat mockups: valid zones, complete zone coverage, visible silhouettes, sleeve orientation, view switching, PNG capture, unsupported fallback');
