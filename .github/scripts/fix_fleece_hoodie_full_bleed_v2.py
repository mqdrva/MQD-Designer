from pathlib import Path
import re

# Fleece Hoodie only. Do not touch any approved garment renderer modules.
panels = Path('v20/fleece-hoodie-panels.js')
panels.write_text("""import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Match the approved reference mockups: the hood drops lower at rear center,
// rises toward the shoulders, and leaves the front collar/chest pieces with
// Front so there are no white holes beside the hood opening.
const hoodLowerEdge=v=>
  .385+
  .56*Math.abs(v[0])+
  .72*Math.max(0,v[2]+.02);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>1-(v[0]/.305)**2-((v[2]+.110)/.455)**2
]};

// Keep the body/sleeve seam nearly vertical like the approved front/back/side
// mockups. This makes Front and Back slightly wider while keeping each sleeve
// completely separate.
const sleeveEdge=v=>
  .395+.055*Math.max(0,-v[1]-.16);

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Keep Front high under the hood while preserving Back on the rear face.
  {zone:0,tests:[v=>v[2]-.002+.225*Math.max(0,v[1])]}
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
    "const MQD_FLEECE_HOODIE_CALIBRATION='isolated-fleece-hoodie-v7-reference-mockups-solid-back';",
    s,
    count=1,
)

# Replace the Hoodie sleeve section through the start of the Long Sleeve Polo
# section. This keeps the stable solid sleeve mask and adds an exact Back mask
# derived row-by-row from the actual red production cutline.
start = s.find("  // Fleece Hoodie sleeves:")
end = s.find("  // Long Sleeve Polo Back:", start)
if start < 0 or end < 0:
    raise SystemExit('Fleece Hoodie template mask section not found')

replacement = r'''  // Fleece Hoodie sleeves: solid-fill the complete printable sleeve interior.
  if(product.id==='fleece-hoodie'&&(zone==='Left Sleeve'||zone==='Right Sleeve')){
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');
    mx.fillStyle='#fff';
    mx.beginPath();
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

  // Fleece Hoodie Back: use the actual red production cutline as the authority.
  // For each template row, find the left/right red cutline edges, interpolate
  // across dashed gaps, then fill the full interior between them. This avoids
  // the old circular/blob mask and follows the supplied cutline shape.
  if(product.id==='fleece-hoodie'&&zone==='Back'){
    const left=new Int32Array(h),right=new Int32Array(h);
    left.fill(-1);right.fill(-1);
    let yMin=h,yMax=-1;

    for(let y=0;y<h;y++){
      let lx=w,rx=-1;
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
        const redInk=a>15&&r>170&&g<145&&b<145&&r>g*1.35;
        if(!redInk)continue;
        if(x<w*.52)lx=Math.min(lx,x);
        if(x>w*.48)rx=Math.max(rx,x);
      }
      if(lx<w)left[y]=lx;
      if(rx>=0)right[y]=rx;
      if(left[y]>=0||right[y]>=0){
        yMin=Math.min(yMin,y);
        yMax=Math.max(yMax,y);
      }
    }

    const interpolate=arr=>{
      const nextIndex=new Int32Array(h);
      let next=-1;
      for(let y=h-1;y>=0;y--){
        if(arr[y]>=0)next=y;
        nextIndex[y]=next;
      }
      let prev=-1;
      for(let y=0;y<h;y++){
        if(arr[y]>=0){prev=y;continue;}
        const n=nextIndex[y];
        if(prev>=0&&n>=0){
          const t=(y-prev)/(n-prev);
          arr[y]=Math.round(arr[prev]+(arr[n]-arr[prev])*t);
        }else if(prev>=0)arr[y]=arr[prev];
        else if(n>=0)arr[y]=arr[n];
      }
    };
    interpolate(left);interpolate(right);

    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');
    mx.fillStyle='#fff';

    let minX=w,maxX=-1;
    if(yMax<yMin){yMin=0;yMax=h-1;}
    for(let y=yMin;y<=yMax;y++){
      const lx=left[y],rx=right[y];
      if(lx<0||rx<0||rx<=lx)continue;
      mx.fillRect(lx,y,rx-lx+1,1);
      minX=Math.min(minX,lx);maxX=Math.max(maxX,rx);
    }

    if(maxX<minX){
      minX=Math.round(w*.095);maxX=Math.round(w*.905);
      yMin=Math.round(h*.12);yMax=Math.round(h*.925);
      mx.beginPath();
      mx.moveTo(w*.095,h*.925);
      mx.lineTo(w*.105,h*.455);
      mx.bezierCurveTo(w*.110,h*.355,w*.170,h*.290,w*.395,h*.120);
      mx.lineTo(w*.605,h*.120);
      mx.bezierCurveTo(w*.830,h*.290,w*.890,h*.355,w*.895,h*.455);
      mx.lineTo(w*.905,h*.925);
      mx.closePath();
      mx.fill();
    }

    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{
      x:minX,y:yMin,w:maxX-minX+1,h:yMax-yMin+1
    }};
  }

'''
s = s[:start] + replacement + s[end:]
editor.write_text(s)

# Hoodie-only regression checks for the approved-reference geometry.
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
""")
