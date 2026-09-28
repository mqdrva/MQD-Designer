import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {drawFlatTshirt,installFlatMockup} from '../v20/flat-mockup.js';

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
assert.equal(ui.isActive(),false);assert.equal(flat.disabled,true);
console.log('PASS flat mockup: front/back colors, sleeve orientation, tab switching, PNG capture, unsupported garment fallback');
