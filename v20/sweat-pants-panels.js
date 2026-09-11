// Sweat Pants only: both the editor silhouette and the texture coordinates
// come from the same model-space frame. No independent decal scaling.
export function splitSweatTriangle(poly,seam){
  const out=[[],[]];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=a[2]-seam,db=b[2]-seam;
    out[da>=0?0:1].push(a);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db),v=a.map((x,k)=>x+(b[k]-x)*t);
      out[0].push(v);out[1].push(v);
    }
  }
  return out;
}
export function sweatUv(zone,x,y,b){
  const u=(x-b.min.x)/(b.max.x-b.min.x);
  return [zone==='Back'?1-u:u,(y-b.min.y)/(b.max.y-b.min.y)];
}
export function createSweatPanels(source,THREE){
  const g=source.geometry;
  if(!g.getAttribute('normal'))g.computeVertexNormals();
  g.computeBoundingBox();
  const bounds=g.boundingBox.clone(),p=g.getAttribute('position'),n=g.getAttribute('normal'),idx=g.index;
  const buffers=[{p:[],n:[],uv:[]},{p:[],n:[],uv:[]}];
  const seam=(bounds.min.z+bounds.max.z)/2;
  for(let i=0;i<(idx?idx.count:p.count);i+=3){
    const tri=[0,1,2].map(k=>{const j=idx?idx.getX(i+k):i+k;return [p.getX(j),p.getY(j),p.getZ(j),n.getX(j),n.getY(j),n.getZ(j)];});
    splitSweatTriangle(tri,seam).forEach((poly,z)=>{
      for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]){
        const b=buffers[z],length=Math.hypot(...v.slice(3))||1;
        b.p.push(...v.slice(0,3));b.n.push(...v.slice(3).map(x=>x/length));
        b.uv.push(...sweatUv(z?'Back':'Front',v[0],v[1],bounds));
      }
    });
  }
  const group=new THREE.Group(),panels=new Map();
  group.name='MQD_Sweat_Pants_Panels';group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
  buffers.forEach((b,z)=>{
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));
    geo.computeBoundingBox();geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,metalness:0}));
    mesh.name=z?'Sweat_Pants_Back':'Sweat_Pants_Front';group.add(mesh);panels.set(z?'Back':'Front',mesh);
  });
  source.parent.add(group);source.visible=false;
  return {panels,bounds};
}
export function sweatTemplate(mesh,bounds){
  const mask=document.createElement('canvas');mask.width=616;mask.height=1000;
  const cut=document.createElement('canvas');cut.width=mask.width;cut.height=mask.height;
  const aspect=(bounds.max.x-bounds.min.x)/(bounds.max.y-bounds.min.y);
  const h=Math.min(940,556/aspect),w=h*aspect,b={x:(616-w)/2,y:(1000-h)/2,w,h};
  const c=mask.getContext('2d');c.fillStyle='#fff';
  const uv=mesh.geometry.getAttribute('uv');
  // Rasterize every triangle, including the waist and cuffs, into the same UV frame.
  for(let i=0;i<uv.count;i+=3){
    c.beginPath();for(let k=0;k<3;k++){const x=b.x+uv.getX(i+k)*w,y=b.y+(1-uv.getY(i+k))*h;k?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();
  }
  const pixels=c.getImageData(0,0,616,1000),edge=cut.getContext('2d').createImageData(616,1000);
  for(let y=1;y<999;y++)for(let x=1;x<615;x++){
    const i=(y*616+x)*4;
    if(pixels.data[i+3]>127&&[-616,616,-1,1].some(d=>pixels.data[i+d*4+3]<128)){
      edge.data[i]=255;edge.data[i+1]=45;edge.data[i+2]=60;edge.data[i+3]=255;
    }
  }
  cut.getContext('2d').putImageData(edge,0,0);
  return {img:cut,maskCanvas:mask,cutlineCanvas:cut,bounds:b,artworkAspect:aspect,status:'ready'};
}
