import * as THREE from 'three';
import {partitionWithRules} from './panels.js';

// Long Sleeve Shirt With Hood only. The five customer print zones own
// exclusive geometry; the hood lining and drawstrings remain neutral trim.
export const hoodedLongSleevePanelNames=[
  'Front','Back','Left Sleeve','Right Sleeve','Hood'
];

export const hoodedLongSleeveNeutralNames=['Drawstrings','Hood Lining'];

// Only the physical sleeve UV direction needs correction for text. Images,
// torso text, and hood text keep the same orientation as the 2D editor.
export function hoodedLongSleeveArtworkTransform(zone){
  return{flipX:zone==='Left Sleeve'||zone==='Right Sleeve'};
}

const leftCordX=-.121;
const rightCordX=.119;
const cordRadius=.016;

// The printable torso follows the hood seam closely. The added front-depth
// term keeps the front panel high without shrinking the rear hood shell.
const hoodLowerEdge=v=>
  .44+1.65*v[0]*v[0]+.85*Math.max(0,v[2]+.13);

const openingWidth=y=>{
  if(y<=.62)return 0;
  if(y<=.68)return (y-.62)/.06*.17;
  if(y<=.76)return .17+(y-.68)/.08*.12;
  if(y<=.90)return .29+(y-.76)/.14*.02;
  return .31;
};

const sleeveEdge=v=>{
  const y=v[1];
  const edge=y>.50
    ?.430-.14*Math.min(1,(y-.50)/.35)**2
    :.440+.03*Math.max(0,-y);
  return edge+.04*Math.min(.5,Math.abs(v[2]));
};

// The source garment hangs slightly forward toward the hem. Following that
// center plane keeps the Front/Back seam straight while preventing one side's
// color from appearing on the opposite face at the lower folds.
const bodyCenter=v=>.028-.045*v[1];

const rules=[
  // The cords are modeled into the single source mesh. Remove only their
  // narrow physical corridors before any printable zone is assigned.
  {zone:5,tests:[
    v=>cordRadius-Math.abs(v[0]-leftCordX),
    v=>v[1]+.245,
    v=>.67-v[1],
    v=>v[2]-.015
  ]},
  {zone:5,tests:[
    v=>cordRadius-Math.abs(v[0]-rightCordX),
    v=>v[1]-.005,
    v=>.67-v[1],
    v=>v[2]-.015
  ]},

  // Keep the recessed inside of the hood on its original black lining.
  // The outer hood still owns the complete cyan/printable shell and rim.
  {zone:6,tests:[
    v=>v[1]-hoodLowerEdge(v),
    v=>.46-Math.abs(v[0]),
    v=>v[1]-.62,
    v=>openingWidth(v[1])-Math.abs(v[0]),
    v=>v[2]+.13
  ]},
  {zone:4,tests:[
    v=>v[1]-hoodLowerEdge(v),
    v=>.46-Math.abs(v[0])
  ]},

  // Both sleeve/body joins share the same clipped curve. Below the armhole,
  // the Front/Back separator follows one straight, gently sloped side seam.
  {zone:2,tests:[v=>v[0]-sleeveEdge(v)]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v)]},
  {zone:0,tests:[v=>v[2]-bodyCenter(v)]}
];

export function partitionHoodedLongSleeveTriangle(triangle){
  return partitionWithRules(triangle,rules);
}

export function hoodedLongSleevePanelUv(zone,x,y,z,b){
  const clamp=v=>Math.max(0,Math.min(1,v));
  const height=Math.max(1e-6,b.max.y-b.min.y);
  if(zone==='Front'||zone==='Back'){
    const u=(x-b.min.x)/Math.max(1e-6,b.max.x-b.min.x);
    return[clamp(zone==='Back'?1-u:u),clamp((y-b.min.y)/height)];
  }
  if(zone.includes('Sleeve')){
    const center=b.getCenter(new THREE.Vector3());
    const outward=zone==='Left Sleeve'?x-center.x:center.x-x;
    const u=(.5+Math.atan2(z-center.z,outward)/(2*Math.PI)+1)%1;
    return[u,clamp((y-b.min.y)/height)];
  }
  // The center of the 2D hood artwork lands on the exterior rear center.
  return[(Math.atan2(x,z)/(2*Math.PI)+1)%1,clamp((y-b.min.y)/height)];
}

function exactGeometryMatches(position,index){
  if(position?.count!==288086||index?.count!==1500000)return false;
  const hash=a=>{
    let h=2166136261;
    for(const byte of new Uint8Array(a.buffer,a.byteOffset,a.byteLength))
      h=Math.imul(h^byte,16777619)>>>0;
    return h;
  };
  return hash(position.array)===1441029011&&hash(index.array)===418496254;
}

export function createHoodedLongSleevePanels(source){
  const geometry=source?.geometry;
  const position=geometry?.getAttribute('position');
  const index=geometry?.index;
  if(!source?.parent||!exactGeometryMatches(position,index))
    throw new Error('Hooded long-sleeve model differs from calibrated asset');
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  const normal=geometry.getAttribute('normal');
  const sourceUv=geometry.getAttribute('uv');
  if(!sourceUv)throw new Error('Hooded long-sleeve source UVs are required for neutral trim');

  const buffers=Array.from({length:7},()=>({position:[],normal:[],sourceUv:[]}));
  for(let i=0;i<index.count;i+=3){
    const triangle=[0,1,2].map(k=>{
      const vertex=index.getX(i+k);
      return[
        position.getX(vertex),position.getY(vertex),position.getZ(vertex),
        normal.getX(vertex),normal.getY(vertex),normal.getZ(vertex),
        sourceUv.getX(vertex),sourceUv.getY(vertex)
      ];
    });
    for(const [zone,polygon] of partitionHoodedLongSleeveTriangle(triangle)){
      const out=buffers[zone];
      for(let k=1;k<polygon.length-1;k++)for(const vertex of[polygon[0],polygon[k],polygon[k+1]]){
        out.position.push(...vertex.slice(0,3));
        const length=Math.hypot(...vertex.slice(3,6))||1;
        out.normal.push(...vertex.slice(3,6).map(value=>value/length));
        out.sourceUv.push(...vertex.slice(6,8));
      }
    }
  }
  if(buffers.some(buffer=>!buffer.position.length))
    throw new Error('Hooded long-sleeve calibration produced an empty surface');

  const base=Array.isArray(source.material)?source.material[0]:source.material;
  const group=new THREE.Group();
  group.name='MQD_Hooded_Long_Sleeve_Zones';
  group.position.copy(source.position);
  group.quaternion.copy(source.quaternion);
  group.scale.copy(source.scale);
  const panels=new Map();

  buffers.forEach((buffer,zoneIndex)=>{
    const panelGeometry=new THREE.BufferGeometry();
    panelGeometry.setAttribute('position',new THREE.Float32BufferAttribute(buffer.position,3));
    panelGeometry.setAttribute('normal',new THREE.Float32BufferAttribute(buffer.normal,3));
    panelGeometry.computeBoundingBox();
    panelGeometry.computeBoundingSphere();

    let name;
    if(zoneIndex<5){
      name=hoodedLongSleevePanelNames[zoneIndex];
      const uv=[];
      for(let i=0;i<buffer.position.length;i+=3)
        uv.push(...hoodedLongSleevePanelUv(name,...buffer.position.slice(i,i+3),panelGeometry.boundingBox));
      if(zoneIndex>=2)for(let i=0;i<uv.length;i+=6){
        const values=[uv[i],uv[i+2],uv[i+4]];
        if(Math.max(...values)-Math.min(...values)>.5)
          for(const offset of[0,2,4])if(uv[i+offset]<.5)uv[i+offset]+=1;
      }
      panelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    }else{
      name=hoodedLongSleeveNeutralNames[zoneIndex-5];
      panelGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(buffer.sourceUv,2));
    }

    const material=base?.clone?base.clone():new THREE.MeshStandardMaterial();
    if(zoneIndex<5){
      for(const key of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])
        if(key in material)material[key]=null;
      if(material.color)material.color.set('#ffffff');
      material.roughness=.86;
      material.metalness=0;
      material.side=THREE.FrontSide;
    }else if(material.color)material.color.set('#ffffff');
    material.needsUpdate=true;

    const mesh=new THREE.Mesh(panelGeometry,material);
    mesh.name='MQD_Hooded_Long_'+name.replace(/\s+/g,'_');
    group.add(mesh);
    if(zoneIndex<5)panels.set(name,mesh);
  });

  source.parent.add(group);
  source.visible=false;
  return panels;
}
