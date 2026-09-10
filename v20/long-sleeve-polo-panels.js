import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only. Do not reuse these seams for the frozen
// Long Sleeve T-Shirt renderer. The polo sleeves sit closer to the
// torso and its folded collar extends wider/lower than the tee rib.
function interpolate(value,points){
 if(value<=points[0][0])return points[0][1];
 for(let i=1;i<points.length;i++)if(value<=points[i][0]){
  const [a,b]=points[i-1],[c,d]=points[i];return b+(d-b)*(value-a)/(c-a);
 }
 return points.at(-1)[1];
}
// Shoulder-to-underarm curve from the supplied front/back reference. Below
// the underarm the boundary stays outside the torso, including the hem.
const sleeveSeam=[[-1,.50],[-.5,.455],[0,.395],[.2,.39],[.4,.46],[.7,.56],[.95,.62]];
const sleeveEdge=y=>interpolate(y,sleeveSeam);
// Follow the folded collar tips and neck band instead of coloring a broad
// ellipse across the chest and shoulders. Blend around the side of the neck.
const collarFront=[[0,.742],[.022,.742],[.04,.782],[.105,.648],[.24,.7884]];
const collarEdge=v=>{
 const front=interpolate(Math.abs(v[0]),collarFront);
 const blend=Math.max(0,Math.min(1,(v[2]+.04)/.08));
 return .805*(1-blend)+front*blend;
};
const rules=[
  {zone:4,tests:[
    v=>.24-Math.abs(v[0]),
    v=>v[1]-collarEdge(v)
  ]},
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
  {zone:0,tests:[v=>v[2]+.025+.11*Math.max(0,v[1])]}
];

export function partitionLongSleevePoloTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
