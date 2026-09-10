import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Keep Hood on the actual upper shell, but raise its lower capture so the
// Front/Back panels continue higher and meet the hood opening instead of
// stopping low across the upper chest.
const hoodRule={zone:4,tests:[
  v=>v[1]-.505,
  v=>1-(v[0]/.300)**2-((v[2]+.120)/.330)**2
]};

// Widen the body panels to the real armhole seam. Sleeves are still evaluated
// first, so they remain fully isolated, but they no longer steal the upper
// chest/shoulder area and make the Front look artificially narrow.
const sleeveEdge=v=>{
  const y=v[1],z=Math.abs(v[2]);
  let base;
  if(y>=.48)base=.350;
  else if(y>=.20)base=.365;
  else if(y>=0)base=.375-.01*y;
  else base=.405-.06*y;
  return base+Math.min(.045,z*.13);
};

const rules=[
  hoodRule,
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Keep the Front face high beneath the hood opening.
  {zone:0,tests:[v=>v[2]-.004+.195*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
