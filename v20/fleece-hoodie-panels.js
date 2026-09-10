import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
// Redeploy trigger after Vercel Pro upgrade: 2026-09-10.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Keep Hood on the actual upper shell while returning the upper chest to the
// body panels so Front can connect naturally beneath the hood opening.
const hoodRule={zone:4,tests:[
  v=>v[1]-.445,
  v=>1-(v[0]/.315)**2-((v[2]+.115)/.345)**2
]};

// Fleece Hoodie sleeves only. Pull the arm/body seam inward at the shoulder and
// underarm so the sleeve owns the complete arm surface instead of allowing
// Front/Back color to intrude into the inner sleeve.
const sleeveEdge=y=>{
  if(y>=.48)return .275;
  if(y>=.20)return .295;
  if(y>=0)return .315-.01*y;
  return .37-.09*y;
};

const rules=[
  hoodRule,
  // Sleeves are evaluated before Front/Back so they own their seam surface.
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},

  // Preserve the raised Front connection beneath the hood.
  {zone:0,tests:[v=>v[2]+.008+.155*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
