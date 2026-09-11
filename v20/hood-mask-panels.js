import * as THREE from 'three';

export const hoodMaskPanelNames=['Front','Back','Left Sleeve','Right Sleeve','Hood','Built-In Mask'];
function interpolate(y,points){
 for(let i=1;i<points.length;i++)if(y<=points[i][0]){const [a,b]=points[i-1],[c,d]=points[i];return b+(d-b)*THREE.MathUtils.clamp((y-a)/(c-a),0,1);}
 return points.at(-1)[1];
}
// All boundaries are shared by both neighboring polygons. No overlay geometry.
function split(poly,field){
 const positive=[],negative=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],da=field(a),db=field(b);
  (da>=0?positive:negative).push(a);
  if((da>=0)!==(db>=0)){const t=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*t);positive.push(v);negative.push(v);}
 }
 return[positive,negative];
}
const sleeveEdge=y=>interpolate(y,[[-1,.30],[-.15,.30],[.04,.285],[.29,.325],[1,.325]]);
const openingWidth=y=>y>.60?.121*Math.sqrt(Math.max(0,1-((y-.60)/.145)**2)):interpolate(y,[[.32,0],[.38,.045],[.48,.09],[.60,.121]]);
export function partitionHoodMaskTriangle(triangle){
 const output=[],emit=(id,p)=>{if(p.length>=3)output.push([id,p]);};
 const [head,body]=split(triangle,v=>v[1]-(.32-THREE.MathUtils.clamp(v[2]/.1,0,1)*Math.max(0,.03-.10*Math.abs(v[0]))));
 if(body.length>=3){
  const [left,rest]=split(body,v=>v[0]-sleeveEdge(v[1]));emit(2,left);
  if(rest.length>=3){const [right,torso]=split(rest,v=>-v[0]-sleeveEdge(v[1]));emit(3,right);
   if(torso.length>=3){const [front,back]=split(torso,v=>v[2]);emit(0,front);emit(1,back);}
  }
 }
 if(head.length>=3){
  const [opening,hood]=split(head,v=>Math.min(openingWidth(v[1])-Math.abs(v[0]),v[2]-.065));emit(4,hood);
  if(opening.length>=3){const [face,mask]=split(opening,v=>v[1]-.60);emit(6,face);emit(5,mask);}
 }
 return output;
}
export function createHoodMaskPanels(source){
 const g=source.geometry,p=g.getAttribute('position'),index=g.index;
 const hash=a=>{let h=2166136261;for(const b of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))h=Math.imul(h^b,16777619)>>>0;return h;};
 if(p.count!==277256||index?.count!==1500000||hash(p.array)!==3144077492||hash(index.array)!==4074801253)throw new Error('Hood-mask model differs from calibrated asset');
 if(!g.getAttribute('normal'))g.computeVertexNormals();const n=g.getAttribute('normal');
 const buffers=Array.from({length:7},()=>({p:[],n:[]}));
 for(let i=0;i<index.count;i+=3){
  const triangle=[0,1,2].map(k=>{const j=index.getX(i+k);return[p.getX(j),p.getY(j),p.getZ(j),n.getX(j),n.getY(j),n.getZ(j)];});
  for(const [zone,poly] of partitionHoodMaskTriangle(triangle))for(let j=1;j<poly.length-1;j++)for(const v of[poly[0],poly[j],poly[j+1]]){
   buffers[zone].p.push(...v.slice(0,3));const length=Math.hypot(...v.slice(3))||1;buffers[zone].n.push(...v.slice(3).map(x=>x/length));
  }
 }
 const group=new THREE.Group();group.name='MQD_Hood_Mask_Panels';group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
 const panels=new Map();
 buffers.forEach((data,id)=>{
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));geometry.computeBoundingBox();
  const b=geometry.boundingBox,s=b.getSize(new THREE.Vector3()),c=b.getCenter(new THREE.Vector3()),uv=[];
  for(let k=0;k<data.p.length;k+=3){const [x,y,z]=data.p.slice(k,k+3);let u;
   if(id===2||id===3)u=(Math.atan2(z-c.z,x-c.x)/(2*Math.PI)+1)%1;
   else if(id===4)u=(Math.atan2(x,z)/(2*Math.PI)+1)%1;
   else u=id===1?(b.max.x-x)/s.x:(x-b.min.x)/s.x;
   uv.push(u,(y-b.min.y)/s.y);
  }
  if(id===2||id===3||id===4)for(let k=0;k<uv.length;k+=6){
   const us=[uv[k],uv[k+2],uv[k+4]];
   if(Math.max(...us)-Math.min(...us)>.5)for(const offset of[0,2,4])if(uv[k+offset]<.5)uv[k+offset]+=1;
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:id===6?'#bfbfbf':'#ffffff',roughness:.82,metalness:0,side:THREE.DoubleSide}));mesh.name=id===6?'Neutral_Face_Opening':hoodMaskPanelNames[id];group.add(mesh);if(id<6)panels.set(hoodMaskPanelNames[id],mesh);
 });
 source.parent.add(group);source.visible=false;return panels;
}
