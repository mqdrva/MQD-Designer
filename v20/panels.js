// Visual panel seams calibrated in the supplied T-shirt's local coordinates.
// Clip crossing triangles so neighboring panels share the same edge.
export const panelNames=['Front','Back','Left Sleeve','Right Sleeve','Collar'];

// The shirt collar wraps around the full neckline.  Treat the front and back
// halves as the same independent Collar zone so changing Front/Back can never
// recolor part of the rib ring.  The sleeve/body rules remain untouched.
function collarHalf(widthSign=1){
 return {
  zone:4,
  tests:[
   v=>v[1]+widthSign*.55*v[2]-.785,
   v=>.855-(v[1]+widthSign*.55*v[2]),
   v=>{
    const s=v[1]+widthSign*.55*v[2];
    const half=.12+1.22*(s-.785);
    return half-Math.abs(v[0]);
   }
  ]
 };
}

const planes=[
  collarHalf(1),   // front half of the rib collar
  collarHalf(-1),  // back half of the same collar ring
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

export function partitionTriangle(triangle){
 let remaining=[triangle];const result=[];
 for(const rule of planes){
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

export function panelUv(zone,x,y,z,b){
 const clamp=v=>Math.max(0,Math.min(1,v));
 if(zone==='Front'||zone==='Back')return[clamp(zone==='Back'?1-(x-b.min.x)/(b.max.x-b.min.x):(x-b.min.x)/(b.max.x-b.min.x)),clamp((y-b.min.y)/(b.max.y-b.min.y))];
 if(zone.includes('Sleeve')){
  const sign=zone==='Left Sleeve'?1:-1,px=sign*x-.34,py=y-.68,dx=.25,dy=-.43,len=Math.hypot(dx,dy);
  const along=clamp((px*dx+py*dy)/(len*len));
  const around=(Math.atan2(z+.055,(-dy*px+dx*py)/len)+Math.PI)/(2*Math.PI);
  return[around,1-along];
 }
 // Collar texture runs around the full neck circumference.  U follows the
 // angle around the neck, while V follows the physical rib height.  This is
 // independent of Front and Back and avoids recoloring the rear half.
 const u=(Math.atan2(z+.07,x)+Math.PI)/(2*Math.PI);
 const bh=Math.max(1e-6,b.max.y-b.min.y);
 return[u,clamp((y-b.min.y)/bh)];
}
