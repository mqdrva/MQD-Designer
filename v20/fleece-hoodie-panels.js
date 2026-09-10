import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Follow the actual hood shell instead of cutting it off with a flat horizontal
// band. The lower hood boundary drops at the center and rises toward the sides;
// front-facing lower collar/chest pieces are deliberately excluded so they stay
// with the Front panel instead of creating white holes beside the hood opening.
const hoodLowerEdge=v=>
  .400+
  .52*Math.abs(v[0])+
  .75*Math.max(0,v[2]+.02);

const hoodRule={zone:4,tests:[
  v=>v[1]-hoodLowerEdge(v),
  v=>1-(v[0]/.315)**2-((v[2]+.100)/.440)**2
]};

// Keep the body/sleeve seam nearly vertical through the chest and armhole so
// the Front panel is slightly wider and has a clean straight side edge. Only
// the lower sleeve transition widens gradually toward the cuff.
const sleeveEdge=v=>
  .388 + .07*Math.max(0,-v[1]-.18);

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Keep the Front face high beneath the hood opening while preserving the
  // rear body as Back.
  {zone:0,tests:[v=>v[2]-.004+.220*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
