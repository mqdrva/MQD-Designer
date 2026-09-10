import {partitionWithRules} from './panels.js';

// Fleece Hoodie only. These rules are intentionally isolated from every
// approved garment renderer. The supplied hoodie GLB is one mesh, so each
// triangle is clipped into exactly one of five physical print zones.
export const hoodiePanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood'];

// Keep Hood on the actual upper shell while returning the upper chest to the
// body panels. Raising this floor lets the Front meet the hood opening instead
// of ending low across the chest.
const hoodRule={zone:4,tests:[
  v=>v[1]-.475,
  v=>1-(v[0]/.315)**2-((v[2]+.115)/.345)**2
]};

// Fleece Hoodie only. The shoulder seam needs to stay narrow on the side-facing
// arm surface, but the front/back chest should extend wider like the approved
// garments. Depth-aware boost preserves sleeve ownership while widening the
// visible torso faces.
const sleeveEdge=v=>{
  const y=v[1],z=Math.abs(v[2]);
  let base;
  if(y>=.48)base=.285;
  else if(y>=.20)base=.295;
  else if(y>=0)base=.315-.01*y;
  else base=.37-.09*y;
  return base+Math.min(.07,z*.20);
};

const rules=[
  hoodRule,
  // Sleeves still evaluate first so their actual side/arm surface stays isolated.
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},

  // Pull Front farther upward beneath the hood opening.
  {zone:0,tests:[v=>v[2]+.002+.19*Math.max(0,v[1])]}
];

export function partitionFleeceHoodieTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
