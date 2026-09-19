import assert from 'node:assert/strict';
import {jacketSplashPreviewFrame} from '../v20/jacket-splash-preview.js';

const layer={type:'image',libraryLocked:true,libraryAssetId:'99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17'};
const cases=[
  ['Front',66/796,760/796,817/878],
  ['Back',2/568,566/568,1],
  ['Left Sleeve',74/385,299/385,1],
  ['Right Sleeve',74/385,299/385,1],
  ['Hood',67/620,555/620,281/392],
];
for(const [zone,left,right,bottom] of cases){
  const t=jacketSplashPreviewFrame(zone,layer);
  // The visible water reaches both panel edges and its lower edge reaches the hem.
  assert.ok(Math.abs(t.offsetX+left*t.scaleX)<1e-10,zone+' left');
  assert.ok(Math.abs(t.offsetX+right*t.scaleX-1)<1e-10,zone+' right');
  assert.ok(Math.abs(t.offsetY+bottom-1)<1e-10,zone+' hem');
  assert.equal(jacketSplashPreviewFrame(zone,{...layer,libraryAssetId:'other'}),null);
  assert.equal(jacketSplashPreviewFrame(zone,{...layer,libraryLocked:false}),null);
  assert.equal(jacketSplashPreviewFrame(zone,{...layer,type:'text'}),null);
}
assert.equal(jacketSplashPreviewFrame('Collar',layer),null);
console.log('Jacket splash: five zone edges/hem and unrelated artwork isolation passed.');
