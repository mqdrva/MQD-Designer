import * as THREE from 'three';
import {jacketFaceZone,matchesJacketGeometry} from './lightweight-jacket-zones.js';
import {jacketHoodValue,splitJacketHood} from './lightweight-jacket-hood.js';

export const jacketZones=['Front','Back','Left Sleeve','Right Sleeve','Hood'];
export function createJacketZones(source){
 const geometry=source.geometry,pos=geometry.getAttribute('position'),index=geometry.index;
 if(!matchesJacketGeometry(pos,index)){console.error('Lightweight Jacket model changed; calibrated zone map cannot be used');return null;}
 if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
 const normal=geometry.getAttribute('normal'),buffers=jacketZones.map(()=>({p:[],n:[]}));
 for(let face=0;face<index.count/3;face++){
  const zone=jacketFaceZone(face);
  const triangle=[0,1,2].map(k=>{const i=index.getX(face*3+k);return[pos.getX(i),pos.getY(i),pos.getZ(i),normal.getX(i),normal.getY(i),normal.getZ(i),jacketHoodValue(i)];});
  const bodyZone=zone===4?(triangle.reduce((sum,v)=>sum+v[2],0)/3>.015?0:1):zone;
  const parts=zone===2||zone===3?[[zone,triangle]]:splitJacketHood(triangle,bodyZone);
  for(const [target,poly] of parts){const b=buffers[target];for(let k=1;k<poly.length-1;k++)for(const v of[poly[0],poly[k],poly[k+1]]){b.p.push(...v.slice(0,3));const length=triangle.includes(v)?1:(Math.hypot(...v.slice(3,6))||1);b.n.push(v[3]/length,v[4]/length,v[5]/length);}}
 }
 const group=new THREE.Group();group.name='MQD_Lightweight_Jacket_Zones';group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
 const zones=new Map();
 buffers.forEach((b,i)=>{
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.computeBoundingBox();g.computeBoundingSphere();
  const m=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.82,metalness:0,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(g,m);mesh.name='Jacket_'+jacketZones[i].replaceAll(' ','_');group.add(mesh);zones.set(jacketZones[i],mesh);
 });
 source.parent.add(group);source.visible=false;group.updateMatrixWorld(true);return zones;
}

// Projection bounds belong to the isolated panel, including its full height.
export function jacketProjection(mesh,zone){
 const b=new THREE.Box3().setFromObject(mesh),s=b.getSize(new THREE.Vector3()),p=b.getCenter(new THREE.Vector3()),r=new THREE.Euler();
 let d;
 if(zone.includes('Sleeve')){r.y=zone==='Left Sleeve'?Math.PI/2:-Math.PI/2;d=new THREE.Vector3(s.z,s.y,s.x*2);}
 else{r.y=zone==='Back'||zone==='Hood'?Math.PI:0;d=new THREE.Vector3(s.x,s.y,s.z*2);}
 d.max(new THREE.Vector3(.001,.001,.001));return{p,r,d};
}
