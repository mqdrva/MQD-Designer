import assert from 'node:assert/strict';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from '../v20/fleece-hoodie-panels.js';

function zoneAt(x,y,z){
  const v=[x,y,z,0,0,1];
  const parts=partitionFleeceHoodieTriangle([v,v,v]);
  assert.equal(parts.length,1);
  return parts[0][0];
}

assert.deepEqual(hoodiePanelNames,['Front','Back','Left Sleeve','Right Sleeve','Hood']);

// Hood follows the upper shell: lower in the center, higher at the sides.
assert.equal(zoneAt(0,.43,-.20),4,'lower center hood must remain Hood');
assert.equal(zoneAt(0,.70,-.10),4,'upper center must be Hood');
assert.equal(zoneAt(.26,.49,-.15),1,'rear shoulder below the shaped hood edge must remain Back');

// Front fills the upper chest/collar openings instead of being stolen by Hood.
assert.equal(zoneAt(.20,.55,.20),0,'upper front beside the hood opening must be Front');
assert.equal(zoneAt(0,0,.30),0,'front torso must be Front');
assert.equal(zoneAt(0,0,-.30),1,'rear torso must be Back');

// The front/body edge is slightly wider and stays clean before the sleeve begins.
assert.equal(zoneAt(.37,.50,.25),0,'upper front panel must stay wide to the armhole');
assert.equal(zoneAt(.43,.50,.05),2,'outer upper left arm must remain Left Sleeve');
assert.equal(zoneAt(-.43,.50,.05),3,'outer upper right arm must remain Right Sleeve');
assert.equal(zoneAt(.68,-.40,.05),2,'positive-X arm must be Left Sleeve');
assert.equal(zoneAt(-.68,-.40,.05),3,'negative-X arm must be Right Sleeve');

const crossing=partitionFleeceHoodieTriangle([
  [-.05,0,-.08,0,0,1],[.05,0,-.08,0,0,1],[0,0,.08,0,0,1]
]);
assert.ok(crossing.length>=2,'front/back crossing triangle should be clipped, not overlap');
for(const [zone,poly] of crossing){
  assert.ok(zone>=0&&zone<5);
  assert.ok(poly.length>=3);
}
console.log('Fleece Hoodie shaped hood, clean front seam, and zone isolation tests passed.');
