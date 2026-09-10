import assert from 'node:assert/strict';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from '../v20/fleece-hoodie-panels.js';

function zoneAt(x,y,z){
  const v=[x,y,z,0,0,1];
  const parts=partitionFleeceHoodieTriangle([v,v,v]);
  assert.equal(parts.length,1);
  return parts[0][0];
}

assert.deepEqual(hoodiePanelNames,['Front','Back','Left Sleeve','Right Sleeve','Hood']);
assert.equal(zoneAt(0,.70,-.10),4,'upper center must be Hood');
assert.equal(zoneAt(0,0,.30),0,'front torso must be Front');
assert.equal(zoneAt(0,0,-.30),1,'rear torso must be Back');
assert.equal(zoneAt(.68,-.40,.05),2,'positive-X arm must be Left Sleeve');
assert.equal(zoneAt(-.68,-.40,.05),3,'negative-X arm must be Right Sleeve');
assert.equal(zoneAt(.20,.50,.35),0,'central upper front must remain Front');
assert.equal(zoneAt(.30,.50,.05),2,'inner upper left arm must belong to Left Sleeve');
assert.equal(zoneAt(-.30,.50,.05),3,'inner upper right arm must belong to Right Sleeve');

const crossing=partitionFleeceHoodieTriangle([
  [-.05,0,-.08,0,0,1],[.05,0,-.08,0,0,1],[0,0,.08,0,0,1]
]);
assert.ok(crossing.length>=2,'front/back crossing triangle should be clipped, not overlap');
for(const [zone,poly] of crossing){
  assert.ok(zone>=0&&zone<5);
  assert.ok(poly.length>=3);
}
console.log('Fleece Hoodie five-zone isolation tests passed.');
