import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only. Do not reuse these seams for the frozen
// Long Sleeve T-Shirt renderer. The polo sleeves sit closer to the
// torso and its folded collar extends wider/lower than the tee rib.
const sleeveEdge=y=>y>=0 ? .405-.035*y : .405-.045*y;
const rules=[
  {zone:4,tests:[
    v=>v[1]+.34*v[2]-.690,
    v=>1-(v[0]/.315)**2-((v[2]+.065)/.295)**2
  ]},
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
  {zone:0,tests:[v=>v[2]+.025+.11*Math.max(0,v[1])]}
];

export function partitionLongSleevePoloTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
