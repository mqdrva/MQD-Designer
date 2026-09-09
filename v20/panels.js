// Visual panel seams calibrated in the supplied T-shirt's local coordinates.
// Clip crossing triangles so neighboring panels share the same edge.
export const panelNames=['Front','Back','Left Sleeve','Right Sleeve','Collar'];
const planes=[
  // Legacy/fallback collar heuristic. Exact MQD T-shirt builds use the
  // precomputed physical collar-face mask instead; this stays as a fallback
  // if the GLB topology ever changes.
  {zone:4,tests:[
    v=>v[1]+.55*v[2]-.785,
    v=>.855-(v[1]+.55*v[2]),
    v=>{
      const s=v[1]+.55*v[2];
      const half=.12+1.22*(s-.785);
      return half-Math.abs(v[0]);
    }
  ]},
  {zone:2,tests:[v=>v[0]+.16*v[1]-.445]},
  {zone:3,tests:[v=>-v[0]+.16*v[1]-.445]},
  {zone:0,tests:[v=>v[2]+.06+.12*Math.max(0,v[1])]}
];
const bodyPlanes=[
  // Keep the already-good sleeve/body seam exactly as calibrated.
  {zone:2,tests:[v=>v[0]+.16*v[1]-.445]},
  {zone:3,tests:[v=>-v[0]+.16*v[1]-.445]},
  {zone:0,tests:[v=>v[2]+.06+.12*Math.max(0,v[1])]}
];
function split(poly,distance){
 const inside=[],outside=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=distance(a),db=distance(b);
  (da>=0?inside:outside).push(a);
  if((da>=0)!==(db>=0)){
   const t=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*t);
   inside.push(v);outside.push(v);
  }
 }
 return[inside,outside];
}
export function partitionWithRules(triangle,rules){
 let remaining=[triangle];const result=[];
 for(const rule of rules){
  const next=[];
  for(const poly of remaining){
   let candidate=poly;
   for(const test of rule.tests){
    if(candidate.length<3)break;
    const [yes,no]=split(candidate,test);if(no.length>=3)next.push(no);candidate=yes;
   }
   if(candidate.length>=3)result.push([rule.zone,candidate]);
  }
  remaining=next;
 }
 for(const poly of remaining)result.push([1,poly]);
 return result;
}
export function partitionTriangle(triangle){return partitionWithRules(triangle,planes);}
export function partitionBodyTriangle(triangle){return partitionWithRules(triangle,bodyPlanes);}
export function panelUv(zone,x,y,z,b){
 const clamp=v=>Math.max(0,Math.min(1,v));
 if(zone==='Front'||zone==='Back')return[clamp(zone==='Back'?1-(x-b.min.x)/(b.max.x-b.min.x):(x-b.min.x)/(b.max.x-b.min.x)),clamp((y-b.min.y)/(b.max.y-b.min.y))];
 if(zone.includes('Sleeve')){
  const sign=zone==='Left Sleeve'?1:-1,dx=.25,dy=-.43,len=Math.hypot(dx,dy);
  const project=(xx,yy)=>{const px=sign*xx-.34,py=yy-.68;return(px*dx+py*dy)/(len*len);};
  const raw=project(x,y),range=[project(b.min.x,b.min.y),project(b.min.x,b.max.y),project(b.max.x,b.min.y),project(b.max.x,b.max.y)];
  const minAlong=Math.min(...range),maxAlong=Math.max(...range),along=clamp((raw-minAlong)/Math.max(1e-6,maxAlong-minAlong));
  const px=sign*x-.34,py=y-.68;
  const around=(Math.atan2(z+.055,(-dy*px+dx*py)/len)+Math.PI)/(2*Math.PI);
  // Left sleeve UVs run opposite the flat artwork frame on this supplied GLB.
  // Mirror only U there; V is normalized to the physical sleeve length so the
  // same x/y layer position used in the 2D template lands at the same height in 3D.
  const u=zone==='Left Sleeve'?1-around:around;
  return[clamp(u),1-along];
 }
 // Collar: map around the neck circumference; V follows the isolated rib height.
 const u=(Math.atan2(z+.07,x)+Math.PI)/(2*Math.PI),bh=Math.max(1e-6,b.max.y-b.min.y);
 return[u,clamp((y-b.min.y)/bh)];
}
