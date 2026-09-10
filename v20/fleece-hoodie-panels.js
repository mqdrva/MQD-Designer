import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. Calibrated against the supplied fleece-hoodie.glb.
// The hoodie is one 500,000-triangle mesh, so these rules split it into five
// mutually-exclusive physical surfaces before any color or artwork is applied.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Keep the Hood on the actual upper hood shell while giving the upper chest
// back to Front/Back. This raises the body panels closer to the hood opening
// instead of leaving the deep body-color gap visible in the 3D mockup.
const hoodRule={zone:4,tests:[
  v=>v[1]-.445,
  v=>1-(v[0]/.315)**2-((v[2]+.115)/.345)**2
]};

// Fleece Hoodie sleeves only. Move the arm/body seam slightly outward from the
// torso so the sleeves own the underarm/inner-arm surface without swallowing
// the upper chest/shoulder panel.
const sleeveEdge=y=>y>=0 ? .36-.02*y : .405-.13*y;
const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},

  // Raise Front farther into the neckline/upper-chest area. Hood is evaluated
  // first, so true hood surfaces remain Hood while the panel below connects
  // much closer to it.
  {zone:0,tests:[v=>v[2]+.008+.155*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
