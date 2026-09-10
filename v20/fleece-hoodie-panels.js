import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. Calibrated against the supplied fleece-hoodie.glb.
// The hoodie is one 500,000-triangle mesh, so these rules split it into five
// mutually-exclusive physical surfaces before any color or artwork is applied.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// The hood occupies the upper central head volume. The ellipse excludes the
// upper chest/shoulders while retaining the rear and side walls of the hood.
const hoodRule={zone:4,tests:[
  v=>v[1]-.385,
  v=>1-(v[0]/.34)**2-((v[2]+.06)/.38)**2
]};

// Long fleece sleeves angle away from the torso. Widen the body-side boundary
// toward the cuff so sleeve color cannot spill down the torso side wall.
const sleeveEdge=y=>y>=0 ? .405-.04*y : .425-.175*y;
const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
  {zone:0,tests:[v=>v[2]+.025+.11*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
