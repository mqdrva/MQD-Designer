import {partitionWithRules} from './panels.js';

// Lightweight Jacket only.
// Calibrated to the supplied front/back/side reference mockups.
export const lightweightJacketPanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

// The hood narrows sharply where it meets the body, then widens higher up.
// This removes the red shoulder/yoke band while preserving the deep center
// drop of the hood seen in the supplied rear reference.
const hoodHalfWidth=v=>{
  const t=clamp((v[1]-.36)/.38);
  return .205+.145*t;
};
const hoodLowerEdge=v=>
  .335 + 1.95*v[0]*v[0] + .48*Math.max(0,v[2]+.12);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>hoodHalfWidth(v)-Math.abs(v[0])
]};

// Pull the sleeve ownership inward to the physical armhole and keep the full
// sleeve cylinder red all the way through the cuff. The previous boundary was
// too far outward and left black strips on the inner sleeves/cuffs.
const sleeveEdge=v=>{
  const y=v[1];
  const depth=-Math.min(.020,Math.abs(v[2])*.055);
  if(y>.58){
    const t=clamp((y-.58)/.24);
    return .395-.035*t+depth;
  }
  if(y>.18)return .395+depth;
  if(y>-.38)return .365+depth;
  return .340+depth;
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Front owns the forward half; all remaining body geometry is Back.
  {zone:0,tests:[v=>v[2]-.004+.205*Math.max(0,v[1])]}
];

export function partitionLightweightJacketTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
