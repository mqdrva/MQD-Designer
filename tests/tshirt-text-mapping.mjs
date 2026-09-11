import assert from 'node:assert/strict';
import fs from 'node:fs';
import {panelUv} from '../v20/panels.js';

const bounds={min:{x:-.7,y:-.8,z:-.4},max:{x:.7,y:.8,z:.4}};
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;

// Front/Back: the same normalized 2D anchor lands at the same vertical UV.
// Back mirrors X only so text remains visually correct when viewed from behind.
assert.deepEqual(panelUv('Front',0,0,0,bounds),[.5,.5]);
assert.deepEqual(panelUv('Back',0,0,0,bounds),[.5,.5]);
assert.deepEqual(panelUv('Front',-.7,0,0,bounds),[0,.5]);
assert.deepEqual(panelUv('Back',-.7,0,0,bounds),[1,.5]);

// Sleeve pair: symmetric physical points must share the same V (height),
// while U is mirrored for left/right so the 2D artwork reads correctly.
const left=panelUv('Left Sleeve',.5,0,.05,bounds);
const right=panelUv('Right Sleeve',-.5,0,.05,bounds);
assert(near(left[1],right[1]));
assert(near(left[0]+right[0],1));

// Collar: 2D vertical placement maps linearly from the lower to upper rib.
const collarLow=panelUv('Collar',.1,-.8,0,bounds);
const collarHigh=panelUv('Collar',.1,.8,0,bounds);
assert.equal(collarLow[1],0);
assert.equal(collarHigh[1],1);

// Guard the calibrated All-Over Print T-Shirt text mapping. Front/Back text
// is intentionally raised 9% in the 3D texture frame to match the 2D template;
// images and the other three T-shirt zones stay unshifted.
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
assert(editor.includes("MQD_TSHIRT_2D_FILL_LOCK='cutline-v4-approved'"));
assert(editor.includes("MQD_TSHIRT_TEXT_MAPPING_LOCK='front-back-text-up-9pct-v2'"));
assert(editor.includes("product.id==='short-sleeve-polo'&&zone==='Back'?-canvas.height*.08:0"));
assert(editor.includes("const tshirtBodyText=product.id==='tshirt'&&(zone==='Front'||zone==='Back')"));
assert(editor.includes("tshirtBodyText?{offsetY:-.09}:{}"));

console.log({
  zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],
  checks:'T-shirt Front/Back text is calibrated 9% higher in 3D; sleeves/collar and approved fill remain locked.'
});
