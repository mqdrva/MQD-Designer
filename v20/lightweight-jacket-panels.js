import {partitionWithRules} from './panels.js';

// Lightweight Jacket only.
// Tightened against the supplied front/back/side references:
// black body reaching cleanly to the armholes, red sleeves, red hood.
export const lightweightJacketPanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Let the hood drop lower at center and rise smoothly toward both shoulders.
const hoodLowerEdge=v=>
  .37 + 2.20*v[0]*v[0] + .52*Math.max(0,v[2]+.13);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>.36-Math.abs(v[0])
]};

// Keep the body panel wide across the shoulders and sidewall, matching the
// reference mockups. The sleeve boundary stays close to the true armhole seam
// instead of cutting inward across the upper shoulder.
const sleeveEdge=v=>{
  const y=v[1];
  const depth=Math.min(.034,Math.abs(v[2])*.13);
  if(y>.52){
    const t=Math.min(1,(y-.52)/.30);
    return .472-.035*t*t+depth;
  }
  if(y>.08)return .472+depth;
  return .478+.030*Math.max(0,-y)+depth;
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Preserve independent Front and Back body panels while keeping the side
  // transition centered on the garment.
  {zone:0,tests:[v=>v[2]-.004+.205*Math.max(0,v[1])]}
];

export function partitionLightweightJacketTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
