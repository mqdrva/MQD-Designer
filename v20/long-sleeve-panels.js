import {partitionWithRules} from './panels.js';

// Calibrated for the supplied long-sleeve-tshirt.glb, in mesh-local units.
// These exclusive geometry masks share clipped edges. Body textures never
// project onto sleeve/collar triangles; each panel owns its own material.
// Bend the separator through the measured torso/forearm gap below the armpit.
// A single shoulder plane cuts through the inward-facing elbow surface.
const sleeveEdge=y=>y>=0?.425-.04*y:.425-.175*y;
const rules=[
 {zone:4,tests:[v=>v[1]+.40*v[2]-.755,v=>1-(v[0]/.225)**2-((v[2]+.08)/.24)**2]},
 {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
 {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
 {zone:0,tests:[v=>v[2]+.025+.12*Math.max(0,v[1])]}
];
export function partitionLongSleeveTriangle(triangle){return partitionWithRules(triangle,rules);}
export function longSleevePanelUv(zone,x,y,z,b){
 const clamp=v=>Math.max(0,Math.min(1,v));
 if(zone==='Front'||zone==='Back'){
  // Fit to the isolated torso, not the whole garment or a padded decal box.
  // The top maps directly to the shoulder/neckline extent of this body panel.
  const u=(x-b.min.x)/Math.max(1e-6,b.max.x-b.min.x);
  return[clamp(zone==='Back'?1-u:u),clamp((y-b.min.y)/Math.max(1e-6,b.max.y-b.min.y))];
 }
 if(zone.includes('Sleeve')){
  const sign=zone==='Left Sleeve'?1:-1;
  // Shoulder to wrist, rather than the short-sleeve shoulder-to-cuff axis.
  const dx=.31,dy=-1.48,len=Math.hypot(dx,dy);
  const project=(xx,yy)=>((sign*xx-.44)*dx+(yy-.69)*dy)/len;
  const ends=[project(b.min.x,b.min.y),project(b.min.x,b.max.y),project(b.max.x,b.min.y),project(b.max.x,b.max.y)];
  const along=(project(x,y)-Math.min(...ends))/Math.max(1e-6,Math.max(...ends)-Math.min(...ends));
  const perpendicular=(-dy*(sign*x-.44)+dx*(y-.69))/len;
  const around=(Math.atan2(z+.035,perpendicular)+Math.PI)/(2*Math.PI);
  return[zone==='Left Sleeve'?1-around:around,1-clamp(along)];
 }
 return[(Math.atan2(z+.08,x)+Math.PI)/(2*Math.PI),clamp((y+.40*z-.755)/.085)];
}
