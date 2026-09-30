import {panelUv} from './panels.js';

// Keep the inner neck wall shaded, rather than painting a second bright
// collar through the opening. Outer rim and upward-facing fabric stay printable.
export function isTshirtCollarInterior(triangle){
  const x=triangle.reduce((s,v)=>s+v[0],0)/3,z=triangle.reduce((s,v)=>s+v[2],0)/3+.07;
  const nx=triangle.reduce((s,v)=>s+(v[3]||0),0)/3,nz=triangle.reduce((s,v)=>s+(v[5]||0),0)/3;
  return nx*x+nz*z<-.025;
}

// Keep the approved center and vertical placement; unwrap only the body edges
// around the torso instead of projecting one texture column across each side.
export function tshirtSideWrapUv(zone,x,y,z,b){
  const uv=panelUv(zone,x,y,z,b);
  if(zone!=='Front'&&zone!=='Back')return uv;
  const center=(b.min.x+b.max.x)/2,half=(b.max.x-b.min.x)/2;
  const edge=Math.max(0,Math.min(1,(Math.abs(x-center)/half-.55)/.25));
  if(!edge)return uv;
  const seam=-.06-.12*Math.max(0,y);
  const depth=zone==='Front'?z-seam:seam-z;
  let around=.5+Math.atan2(x-center,Math.max(0,depth))/Math.PI;
  if(zone==='Back')around=1-around;
  const weight=edge*edge*(3-2*edge);
  return [uv[0]+(around-uv[0])*weight,uv[1]];
}

// The supplied model closes its sleeve openings with end-facing triangles.
// These represent the shaded interior, not a printable cylindrical sleeve.
export function isTshirtSleeveInterior(zone,triangle){
  if(zone!=='Left Sleeve'&&zone!=='Right Sleeve')return false;
  const sign=zone==='Left Sleeve'?1:-1,dx=sign*.25,dy=-.43,length=Math.hypot(dx,dy);
  const [a,b,c]=triangle,x=(a[0]+b[0]+c[0])/3,y=(a[1]+b[1]+c[1])/3,z=(a[2]+b[2]+c[2])/3;
  const along=((sign*x-.34)*.25+(y-.68)*dy)/(.25*.25+dy*dy);
  const radial=Math.hypot((.43*(sign*x-.34)+.25*(y-.68))/length,z+.055);
  if(along>.7&&radial<.1)return true;
  if(along<.85)return false;
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
  const nx=ab[1]*ac[2]-ab[2]*ac[1],ny=ab[2]*ac[0]-ab[0]*ac[2],nz=ab[0]*ac[1]-ab[1]*ac[0];
  return (nx*dx+ny*dy)/Math.max(1e-12,Math.hypot(nx,ny,nz)*length)>.6;
}
