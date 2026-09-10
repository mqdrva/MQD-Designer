import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Match the approved green/black reference mockups: the hood drops lower at
// rear center, rises toward the shoulders, and leaves the front collar/chest
// pieces with Front so there are no white holes beside the hood opening.
const hoodLowerEdge=v=>
  .39+2*v[0]*v[0]+.55*Math.max(0,v[2]+.15);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>.315-Math.abs(v[0])
]};

// Pull the Front/Back body farther outward to the true armhole and side seam.
// The depth allowance specifically closes the red/green slivers that can show
// through beside a black body when the model is viewed from the back or side.
// Above the shoulder, the edge still curves inward to preserve the sleeve cap
// shape from the approved reference mockups.
const sleeveEdge=v=>{
  const y=v[1],depth=Math.min(.030,Math.abs(v[2])*.12);
  if(y>.48){
    const t=Math.min(1,(y-.48)/.32);
    return .447-.125*t*t+depth;
  }
  return .455+.040*Math.max(0,-y)+depth;
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Keep the complete waistband in Front; no sixth print zone.
  // Sleeves are removed first so their cuffs remain independent.
  {zone:0,tests:[v=>-.72-v[1]]},

  // Keep Front high under the hood while preserving Back on the rear face.
  {zone:0,tests:[v=>v[2]-.002+.225*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
