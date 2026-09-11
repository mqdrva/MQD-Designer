import * as THREE from 'three';

export const shortsPanelNames=['Front','Back'];

// Normalized outlines of the two production pieces shown in each Shorts
// template. Keeping both pieces in one zone preserves the editor coordinates
// while preventing the instruction circle from becoming the fill mask.
export const shortsTemplatePolygons={
  Front:[
    [[.145,.059],[.422,.069],[.480,.933],[.048,.927],[.061,.327]],
    [[.584,.070],[.861,.059],[.947,.327],[.960,.927],[.529,.933]]
  ],
  Back:[
    [[.055,.110],[.369,.083],[.493,.942],[.043,.924]],
    [[.626,.084],[.944,.111],[.951,.922],[.522,.942]]
  ]
};

function split(poly,field){
  const positive=[],negative=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=field(a),db=field(b);
    (da>=0?positive:negative).push(a);
    if((da>=0)!==(db>=0)){
      const t=da/(da-db),v=a.map((value,k)=>value+(b[k]-value)*t);
      positive.push(v);negative.push(v);
    }
  }
  return[positive,negative];
}

export function partitionShortsTriangle(triangle,seamZ=0){
  const [front,back]=split(triangle,v=>v[2]-seamZ),result=[];
  if(front.length>=3)result.push(['Front',front]);
  if(back.length>=3)result.push(['Back',back]);
  return result;
}

export function shortsPanelUv(zone,x,y,bounds){
  const sizeX=Math.max(1e-8,bounds.max.x-bounds.min.x);
  const sizeY=Math.max(1e-8,bounds.max.y-bounds.min.y);
  return[
    zone==='Back'?(bounds.max.x-x)/sizeX:(x-bounds.min.x)/sizeX,
    (y-bounds.min.y)/sizeY
  ];
}

function geometryHash(array){
  let hash=2166136261;
  for(const byte of new Uint8Array(array.buffer,array.byteOffset,array.byteLength))hash=Math.imul(hash^byte,16777619)>>>0;
  return hash;
}

function findTrimComponents(position,index,bounds){
  const parent=new Int32Array(position.count),size=new Int32Array(position.count);
  for(let i=0;i<parent.length;i++){parent[i]=i;size[i]=1;}
  const find=value=>{
    let root=value;
    while(parent[root]!==root)root=parent[root];
    while(parent[value]!==value){const next=parent[value];parent[value]=root;value=next;}
    return root;
  };
  const union=(a,b)=>{
    a=find(a);b=find(b);if(a===b)return;
    if(size[a]<size[b]){const swap=a;a=b;b=swap;}
    parent[b]=a;size[a]+=size[b];
  };
  for(let i=0;i<index.count;i+=3){const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);union(a,b);union(a,c);}

  const stats=new Map();
  for(let i=0;i<position.count;i++){
    const root=find(i),x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    let s=stats.get(root);
    if(!s){s={minX:x,minY:y,minZ:z,maxX:x,maxY:y,maxZ:z,triangles:0};stats.set(root,s);}
    else{s.minX=Math.min(s.minX,x);s.minY=Math.min(s.minY,y);s.minZ=Math.min(s.minZ,z);s.maxX=Math.max(s.maxX,x);s.maxY=Math.max(s.maxY,y);s.maxZ=Math.max(s.maxZ,z);}
  }
  for(let i=0;i<index.count;i+=3)stats.get(find(index.getX(i))).triangles++;

  const extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),trim=new Set();
  for(const [root,s] of stats){
    const componentCenterX=(s.minX+s.maxX)/2;
    // Actual cords and tips are very narrow disconnected components. The
    // center fly/fabric strip is also forward-facing, but is wider and must
    // remain part of the printable Front surface.
    if(s.triangles>=500&&s.maxX-s.minX<extent.x*.08&&Math.abs(componentCenterX-center.x)<extent.x*.09&&
       s.minZ>bounds.min.z+extent.z*.90&&s.minY>bounds.min.y+extent.y*.55&&s.maxY<bounds.min.y+extent.y*.985)trim.add(root);
  }
  return{find,trim};
}

// Shorts-only calibrated renderer. The garment is divided by one shared plane,
// so Front and Back meet without overlap on a perfectly straight side seam.
export function createShortsPanels(source){
  const geometry=source?.geometry,position=geometry?.getAttribute('position'),index=geometry?.index;
  if(!position||!index||!source.parent)return null;
  if(position.count!==287052||index.count!==1500000||geometryHash(position.array)!==3829853879||geometryHash(index.array)!==1181301504){
    console.error('Shorts model changed; calibrated zone map cannot be used');
    return null;
  }
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  const normal=geometry.getAttribute('normal'),sourceUv=geometry.getAttribute('uv');
  geometry.computeBoundingBox();
  const bounds=geometry.boundingBox.clone(),seamZ=(bounds.min.z+bounds.max.z)/2;
  const {find,trim}=findTrimComponents(position,index,bounds);
  const buffers={Front:{p:[],n:[]},Back:{p:[],n:[]},Trim:{p:[],n:[],uv:[]}};

  const append=(target,vertex,zone)=>{
    target.p.push(vertex[0],vertex[1],vertex[2]);
    const length=Math.hypot(vertex[3],vertex[4],vertex[5])||1;
    target.n.push(vertex[3]/length,vertex[4]/length,vertex[5]/length);
    if(zone==='Trim')target.uv.push(vertex[6],vertex[7]);
  };
  for(let i=0;i<index.count;i+=3){
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)];
    const triangle=ids.map(id=>[
      position.getX(id),position.getY(id),position.getZ(id),
      normal.getX(id),normal.getY(id),normal.getZ(id),
      sourceUv?sourceUv.getX(id):0,sourceUv?sourceUv.getY(id):0
    ]);
    if(trim.has(find(ids[0]))){for(const vertex of triangle)append(buffers.Trim,vertex,'Trim');continue;}
    for(const [zone,poly] of partitionShortsTriangle(triangle,seamZ)){
      for(let j=1;j<poly.length-1;j++)for(const vertex of[poly[0],poly[j],poly[j+1]])append(buffers[zone],vertex,zone);
    }
  }

  const group=new THREE.Group();group.name='MQD_Shorts_Panels';
  group.position.copy(source.position);group.quaternion.copy(source.quaternion);group.scale.copy(source.scale);
  const base=Array.isArray(source.material)?source.material[0]:source.material,zones=new Map();
  for(const zone of['Front','Back','Trim']){
    const data=buffers[zone];if(!data.p.length)continue;
    const panelGeometry=new THREE.BufferGeometry();
    panelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(data.p,3));
    panelGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.n,3));
    if(zone==='Trim')panelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
    else{
      const uv=[];
      for(let i=0;i<data.p.length;i+=3)uv.push(...shortsPanelUv(zone,data.p[i],data.p[i+1],bounds));
      panelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    }
    panelGeometry.computeBoundingBox();panelGeometry.computeBoundingSphere();
    const material=base?.clone?base.clone():new THREE.MeshStandardMaterial();
    if(zone!=='Trim'){
      for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(key in material)material[key]=null;
      if(material.color)material.color.set('#ffffff');
      material.roughness=.84;material.metalness=0;material.side=THREE.DoubleSide;material.transparent=false;material.opacity=1;material.needsUpdate=true;
    }else if(material.color){material.color.set('#ffffff');material.needsUpdate=true;}
    const mesh=new THREE.Mesh(panelGeometry,material);mesh.name='Shorts_'+zone;group.add(mesh);
    if(zone!=='Trim')zones.set(zone,mesh);
  }
  source.parent.add(group);source.visible=false;group.updateMatrixWorld(true);
  return zones;
}
