import {collarContour} from './tshirt-collar-contour.js';
// Preview-only closed fabric band. Lower contour is fitted to the existing
// scanned collar seam; no print frame or production artwork is changed.
export function refineTshirtCollar(outer,oldInterior,THREE,color='#FFFFFF',bodies=[]){
 const n=collarContour.length,thickness=.006,positions=[],uv=[],outside=[],inside=[];
 // Remove overlapping scan fragments underneath the new band, retaining the
 // original attributes and every body triangle outside the neck opening.
 for(const mesh of bodies){
  const g=mesh.geometry,p=g.attributes.position,index=g.index,keep=[];
  for(let f=0;f<(index?index.count:p.count);f+=3){
   const ids=[0,1,2].map(k=>index?index.getX(f+k):f+k);
   const x=ids.reduce((v,i)=>v+p.getX(i),0)/3,y=ids.reduce((v,i)=>v+p.getY(i),0)/3,z=ids.reduce((v,i)=>v+p.getZ(i),0)/3+.07;
   const u=(Math.atan2(z,x)/(2*Math.PI)+.5)*n,i=Math.floor(u)%n,t=u-Math.floor(u),a=collarContour[i],b=collarContour[(i+1)%n];
   const radius=a[0]*(1-t)+b[0]*t,height=a[1]*(1-t)+b[1]*t;
   // Keep a narrow body underlap beneath the binding. Cutting beyond the
   // collar edge exposes the neutral inner facing as a white seam.
   if(!(y>height+.003&&Math.hypot(x,z)<radius-.004))keep.push(...ids);
  }
  g.setIndex(keep);
 }
 for(let i=0;i<=n;i++){
  const [lr,ly,ur,uy]=collarContour[i%n],a=2*Math.PI*(i/n-.5);
  for(const [r,y,v] of [[lr,ly,0],[ur,uy,1],[ur-thickness,uy,1],[lr-thickness,ly,0]]){
   positions.push(r*Math.cos(a),y,r*Math.sin(a)-.07);uv.push(i/n,v);
  }
 }
 for(let i=0;i<n;i++)for(let edge=0;edge<4;edge++){
  const a=i*4+edge,b=i*4+(edge+1)%4,c=(i+1)*4+edge,d=(i+1)*4+(edge+1)%4;
  (edge===0?outside:inside).push(a,b,c,b,d,c);
 }
 const make=indices=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;};
 outer.geometry.dispose();outer.geometry=make(outside);outer.material.side=THREE.DoubleSide;
 if(oldInterior)oldInterior.visible=false;
 const liner=new THREE.Mesh(make(inside),new THREE.MeshStandardMaterial({color,roughness:1,metalness:0,side:THREE.DoubleSide}));
 // The shirt's unprinted inside is separate from the collar binding.
 // Recess its floor and add an inner wall rather than filling the opening
 // with a shallow, collar-colored fan.
 const bowlPositions=[],bowlIndices=[],depth=.14;
 for(let ring=0;ring<2;ring++)for(let i=0;i<n;i++){
  const j=i*12+9,x=positions[j],y=positions[j+1],z=positions[j+2];
  bowlPositions.push(x*(ring?.55:1),y-ring*depth,(z+.07)*(ring?.55:1)-.07);
 }
 for(let i=0;i<n;i++){const next=(i+1)%n;bowlIndices.push(i,next,n+i,next,n+next,n+i);}
 bowlPositions.push(0,Math.min(...collarContour.map(row=>row[1]))-.24,-.07);
 for(let i=0;i<n;i++)bowlIndices.push(n+i,n+(i+1)%n,2*n);
 const bowlGeometry=new THREE.BufferGeometry();bowlGeometry.setAttribute('position',new THREE.Float32BufferAttribute(bowlPositions,3));bowlGeometry.setIndex(bowlIndices);bowlGeometry.computeVertexNormals();
 const insideFabric=new THREE.MeshStandardMaterial({color:'#E8E8E8',roughness:1,metalness:0,side:THREE.DoubleSide});
 const bowl=new THREE.Mesh(bowlGeometry,insideFabric);bowl.name='MQD_Tshirt_Plain_Inner_Facing';liner.add(bowl);
 liner.name='MQD_Tshirt_Collar_Closed_Liner';liner.userData.neutralNeckInterior=true;outer.parent.add(liner);return liner;
}
