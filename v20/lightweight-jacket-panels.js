import {partitionWithRules} from './panels.js';

// Lightweight Jacket only.
// Calibrated to the supplied front/back/side references:
// black body panels, red sleeves, red hood, with clean armhole and hood seams.
export const lightweightJacketPanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Hood stays fully independent. The lower edge drops at center back/front and
// rises toward the shoulders, matching the supplied jacket hood silhouette.
const hoodLowerEdge=v=>
  .405 + 1.85*v[0]*v[0] + .46*Math.max(0,v[2]+.13);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>.34-Math.abs(v[0])
]};

// Body owns the shoulder cap up to the true armhole, while the sleeve owns the
// full arm below it. Depth allowance prevents red sleeve slivers on side views.
const sleeveEdge=v=>{
  const y=v[1];
  const depth=Math.min(.032,Math.abs(v[2])*.13);
  if(y>.50){
    const t=Math.min(1,(y-.50)/.30);
    return .455-.115*t*t+depth;
  }
  if(y>.12)return .463+depth;
  return .470+.035*Math.max(0,-y)+depth;
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Front owns the forward half; the remainder is Back.
  {zone:0,tests:[v=>v[2]-.004+.205*Math.max(0,v[1])]}
];

export function partitionLightweightJacketTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
