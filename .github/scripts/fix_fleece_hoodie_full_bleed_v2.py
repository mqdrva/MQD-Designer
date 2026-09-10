from pathlib import Path
import re

# Fleece Hoodie only. Do not touch any approved garment renderer modules.
panels = Path('v20/fleece-hoodie-panels.js')
panels.write_text("""import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Keep Hood on the actual upper shell, but raise its lower capture so the
// Front/Back panels continue higher and meet the hood opening instead of
// stopping low across the upper chest.
const hoodRule={zone:4,tests:[
  v=>v[1]-.505,
  v=>1-(v[0]/.300)**2-((v[2]+.120)/.330)**2
]};

// Widen the body panels to the real armhole seam. Sleeves are still evaluated
// first, so they remain fully isolated, but they no longer steal the upper
// chest/shoulder area and make the Front look artificially narrow.
const sleeveEdge=v=>{
  const y=v[1],z=Math.abs(v[2]);
  let base;
  if(y>=.48)base=.350;
  else if(y>=.20)base=.365;
  else if(y>=0)base=.375-.01*y;
  else base=.405-.06*y;
  return base+Math.min(.045,z*.13);
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Keep the Front face high beneath the hood opening.
  {zone:0,tests:[v=>v[2]-.004+.195*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
""")

editor = Path('v20/editor.js')
s = editor.read_text()

# Bump only the Hoodie calibration marker.
s = re.sub(
    r"const MQD_FLEECE_HOODIE_CALIBRATION='[^']+';",
    "const MQD_FLEECE_HOODIE_CALIBRATION='isolated-fleece-hoodie-v4-raised-wide-front-solid-cutline-sleeves';",
    s,
    count=1,
)

# Replace the prior Hoodie sleeve cutline reconstruction with a stable,
# Hoodie-only silhouette mask that fills the entire printable sleeve interior.
start = s.find("  // Fleece Hoodie sleeves:")
end = s.find("  // Long Sleeve Polo Back:", start)
if start < 0 or end < 0:
    raise SystemExit('Fleece Hoodie sleeve mask block not found')

replacement = r'''  // Fleece Hoodie sleeves: solid-fill the complete printable sleeve interior.
  // The production template has a long opening in its dashed red cutline, which
  // makes flood-fill/connected-component approaches collapse into outline-only
  // regions. Use the calibrated sleeve silhouette for the fill, then draw the
  // original red production cutline on top as the guide.
  if(product.id==='fleece-hoodie'&&(zone==='Left Sleeve'||zone==='Right Sleeve')){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');
    mx.fillStyle='#fff';
    mx.beginPath();
    // Calibrated directly to /assets/templates/hoodie/sleeve.png.
    mx.moveTo(w*.315,h*.905);
    mx.lineTo(w*.205,h*.305);
    mx.bezierCurveTo(w*.31,h*.292,w*.415,h*.235,w*.455,h*.135);
    mx.lineTo(w*.485,h*.052);
    mx.lineTo(w*.605,h*.083);
    mx.bezierCurveTo(w*.615,h*.175,w*.665,h*.235,w*.845,h*.292);
    mx.lineTo(w*.758,h*.775);
    mx.lineTo(w*.758,h*.920);
    mx.lineTo(w*.330,h*.920);
    mx.closePath();
    mx.fill();

    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{
      x:w*.205,
      y:h*.052,
      w:w*(.845-.205),
      h:h*(.920-.052)
    }};
  }

'''
s = s[:start] + replacement + s[end:]
editor.write_text(s)

# Hoodie-only regression checks for the wider/high front and isolated sleeves.
test = Path('tests/fleece-hoodie-zones.mjs')
test.write_text("""import assert from 'node:assert/strict';
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
assert.equal(zoneAt(.20,.49,.30),0,'upper front must rise to the hood opening');
assert.equal(zoneAt(.34,.50,.25),0,'front shoulder/chest must remain wide');
assert.equal(zoneAt(.46,.50,.05),2,'outer upper left arm must remain Left Sleeve');
assert.equal(zoneAt(-.46,.50,.05),3,'outer upper right arm must remain Right Sleeve');

const crossing=partitionFleeceHoodieTriangle([
  [-.05,0,-.08,0,0,1],[.05,0,-.08,0,0,1],[0,0,.08,0,0,1]
]);
assert.ok(crossing.length>=2,'front/back crossing triangle should be clipped, not overlap');
for(const [zone,poly] of crossing){
  assert.ok(zone>=0&&zone<5);
  assert.ok(poly.length>=3);
}
console.log('Fleece Hoodie raised/wide front and sleeve isolation tests passed.');
""")
