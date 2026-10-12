import {partitionWithRules} from './panels.js';
// Short-sleeve-only lower armhole refinement. The shoulder endpoint remains
// fixed; the body extends over the narrow folded sleeve-root tongues.
export function tshirtArmholeInset(y){
 const t=Math.max(0,Math.min(1,(.70-y)/.37));
 return .045*t*t*(3-2*t);
}
export function partitionTshirtBodyTriangle(triangle){
 return partitionWithRules(triangle,[
  {zone:2,tests:[v=>v[0]+.16*v[1]-.445-tshirtArmholeInset(v[1])]},
  {zone:3,tests:[v=>-v[0]+.16*v[1]-.445-tshirtArmholeInset(v[1])]},
  {zone:0,tests:[v=>v[2]+.06+.12*Math.max(0,v[1])]}
 ]);
}

// Keep the accepted sleeve artwork frame while refining only its root edge.
export const tshirtSleeveArtworkBounds={
 'Left Sleeve':{min:{x:.3202225532255349,y:.13609270751476288,z:-.2738085285156826},max:{x:.6860024333000183,y:.7798590423404068,z:.1456969128841829}},
 'Right Sleeve':{min:{x:-.6866843104362488,y:.13572102785110474,z:-.27382008784182577},max:{x:-.3201313054724304,y:.78042934079731,z:.14622316306529043}}
};
