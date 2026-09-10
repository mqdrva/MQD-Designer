import {partitionWithRules} from './panels.js';

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
