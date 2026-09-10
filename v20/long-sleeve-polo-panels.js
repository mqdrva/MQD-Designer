import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only. Do not reuse these seams for the frozen
// Long Sleeve T-Shirt renderer. Keep the approved collar split unchanged.
// Push the sleeve split outward so Front/Back own more of the shoulder/body
// and meet the sleeves closer to the physical armhole seam.
const sleeveEdge=y=>y>=0 ? .445-.035*y : .445-.045*y;
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
