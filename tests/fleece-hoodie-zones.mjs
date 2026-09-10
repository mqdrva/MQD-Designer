import assert from 'node:assert/strict';
import {partitionFleeceHoodieTriangle,hoodiePanelNames} from '../v20/fleece-hoodie-panels.js';

function zoneAt(x,y,z){
  const v=[x,y,z,0,0,1];
  const parts=partitionFleeceHoodieTriangle([v,v,v]);
  assert.equal(parts.length,1);
  return parts[0][0];
}

assert.deepEqual(hoodiePanelNames,['Front','Back','Left Sleeve','Right Sleeve','Hood']);
assert.equal(zoneAt(0,-.80,-.20),0,'rear waistband belongs to Front as requested');
assert.equal(zoneAt(.44,-.80,0),0,'side waistband must not become a sleeve');
assert.equal(zoneAt(.66,-.80,.1),2,'left cuff remains Left Sleeve');
assert.equal(zoneAt(-.66,-.80,.1),3,'right cuff remains Right Sleeve');
assert.equal(zoneAt(.1,.42,-.3),4,'rounded rear hood tip remains Hood');
assert.equal(zoneAt(.29,.53,-.2),1,'shoulder below hood belongs to Back');

// Hood follows the approved rear/side silhouette.
assert.equal(zoneAt(0,.43,-.20),4,'lower rear-center hood must remain Hood');
assert.equal(zoneAt(0,.70,-.10),4,'upper center must be Hood');
assert.equal(zoneAt(.28,.50,-.14),1,'rear shoulder outside hood must remain Back');

// Front fills the upper chest and the holes beside the hood opening.
assert.equal(zoneAt(.18,.56,.18),0,'upper front beside hood opening must be Front');
assert.equal(zoneAt(0,0,.30),0,'front torso must be Front');
assert.equal(zoneAt(0,0,-.30),1,'rear torso must be Back');

// Body panels stay slightly wider with clean sleeve separation.
assert.equal(zoneAt(.38,.48,.20),0,'front panel must stay wide to the armhole');
assert.equal(zoneAt(.38,.48,-.20),1,'back panel must stay wide to the armhole');
assert.equal(zoneAt(.44,.48,.05),2,'outer upper left arm must be Left Sleeve');
assert.equal(zoneAt(-.44,.48,.05),3,'outer upper right arm must be Right Sleeve');
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
console.log('Fleece Hoodie approved-reference calibration tests passed.');
