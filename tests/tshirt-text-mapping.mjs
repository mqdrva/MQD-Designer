import assert from 'node:assert/strict';
import fs from 'node:fs';
import {panelUv} from '../v20/panels.js';
import {TSHIRT_BODY_ARTWORK_OFFSET_Y,TSHIRT_AI_FRONT_LOGO_OFFSET_Y,isTshirtBodyFullCoverageImage,tshirtBodyImageOffsetY} from '../v20/tshirt-artwork-calibration.js';

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

// Guard the calibrated All-Over Print T-Shirt artwork mapping. The Front
// uses production-pattern UVs at the front neckline/hem; Back text and movable
// customer images retain the 9% correction. Locked backgrounds stay put.
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
assert(editor.includes("MQD_TSHIRT_2D_FILL_LOCK='cutline-v4-approved'"));
assert(editor.includes("MQD_TSHIRT_TEXT_MAPPING_LOCK='front-back-text-up-9pct-v2'"));
assert(editor.includes("MQD_TSHIRT_EDITABLE_ARTWORK_MAPPING_LOCK='front-back-editable-artwork-up-9pct-v3'"));
assert(editor.includes("product.id==='short-sleeve-polo'&&zone==='Back'?-canvas.height*.08:0"));
assert(editor.includes("const tshirtBodyArtwork=product.id==='tshirt'&&zone==='Back'"));
assert(editor.includes("offsetY:TSHIRT_BODY_ARTWORK_OFFSET_Y,imageOffsetY}"));
assert.equal(TSHIRT_BODY_ARTWORK_OFFSET_Y,-.09);
assert.equal(tshirtBodyImageOffsetY({type:'image',chatBackground:true}),0,'ChatGPT backgrounds must match the 2D frame without the foreground upward offset');
assert.equal(tshirtBodyImageOffsetY({type:'image'}),-.09,'uploaded customer logos must receive the T-shirt body correction');
const manualBackground={type:'image',x:-3,y:3.3,scale:1,rotation:0,crop:{left:0,top:0,right:0,bottom:0}};
const backCoverage={zone:'Back',baseLayer:true,opaqueEdges:true};
assert(isTshirtBodyFullCoverageImage(manualBackground,backCoverage));
assert.equal(tshirtBodyImageOffsetY(manualBackground,backCoverage),0,'full-back uploaded artwork must reach the same hem as the 2D editor');
assert.equal(tshirtBodyImageOffsetY(manualBackground,{...backCoverage,zone:'Front'}),0,'a background copied from Back to Front retains the same 3D height');
assert.equal(tshirtBodyImageOffsetY(manualBackground,{...backCoverage,opaqueEdges:false}),-.09,'transparent back logos keep the foreground correction');
assert.equal(tshirtBodyImageOffsetY(manualBackground,{...backCoverage,baseLayer:false}),-.09,'upper layers keep the foreground correction');
assert.equal(tshirtBodyImageOffsetY({...manualBackground,y:25},backCoverage),-.09,'a deliberately positioned back image is not treated as a background');
assert.equal(tshirtBodyImageOffsetY({type:'image',libraryAssetId:'editable',libraryLocked:false}),-.09,'editable library artwork must receive the T-shirt body correction');
assert.equal(tshirtBodyImageOffsetY({type:'image',libraryAssetId:'grass',libraryLocked:true}),0,'locked library backgrounds must preserve their approved placement');
assert.equal(tshirtBodyImageOffsetY({type:'image',aiManaged:true,aiAssetKind:'artwork'}),0,'AI backgrounds must match the 2D frame, without an artificial blank hem');
assert.equal(tshirtBodyImageOffsetY({type:'image',aiManaged:true,aiAssetKind:'logo'}),-.09,'AI logos retain foreground calibration independently of backgrounds');
assert.equal(TSHIRT_AI_FRONT_LOGO_OFFSET_Y,-.12);
assert.equal(tshirtBodyImageOffsetY({type:'image',aiManaged:true,aiAssetKind:'logo',aiZone:'Front'}),-.12,'Front AI logo moves higher in 3D without changing its 2D anchor');
assert.equal(tshirtBodyImageOffsetY({type:'image',aiManaged:true,aiAssetKind:'logo',aiZone:'Back'}),-.09,'Back AI logo preserves the user-approved mapping');

console.log({
  zones:['Front','Back','Left Sleeve','Right Sleeve','Collar'],
  checks:'Front uses calibrated pattern UVs; Back foreground remains 9%; background exceptions and legacy helper calibration preserved.'
});
