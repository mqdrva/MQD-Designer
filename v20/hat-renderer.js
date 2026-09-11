import * as THREE from 'three';

export const hatZones=['Front Panel','Top of Bill'];

// Hat-only isolated renderer. Calibrated against the supplied hat.glb:
// x ±0.613, y -0.485..0.485, z -0.922..0.922.
// The bill occupies the low-y band; the printable crown panel is the forward,
// outward-facing portion of the crown. Everything else stays on an untouched
// neutral material so only the two customer print zones change color.
export function createHatZones(source){
  const geometry=source.geometry;
  const pos=geometry?.getAttribute('position');
  if(!pos||!source.parent)return null;
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  const normal=geometry.getAttribute('normal'),index=geometry.index;
  geometry.computeBoundingBox();
  const box=geometry.boundingBox.clone(),size=new THREE.Vector3();
  box.getSize(size);
  const center=new THREE.Vector3();
  box.getCenter(center);

  const billTopY=box.min.y+size.y*.315;
  const crownFrontZ=center.z+size.z*.035;

  const buffers={
    'Front Panel':{p:[],n:[]},
    'Top of Bill':{p:[],n:[]},
    Rest:{p:[],n:[]}
  };

  const count=index?index.count:pos.count;
  for(let t=0;t<count;t+=3){
    const verts=[0,1,2].map(k=>{
      const i=index?index.getX(t+k):t+k;
      return[
        pos.getX(i),pos.getY(i),pos.getZ(i),
        normal.getX(i),normal.getY(i),normal.getZ(i)
      ];
    });
    const cx=(verts[0][0]+verts[1][0]+verts[2][0])/3;
    const cy=(verts[0][1]+verts[1][1]+verts[2][1])/3;
    const cz=(verts[0][2]+verts[1][2]+verts[2][2])/3;
    let nx=(verts[0][3]+verts[1][3]+verts[2][3])/3;
    let ny=(verts[0][4]+verts[1][4]+verts[2][4])/3;
    let nz=(verts[0][5]+verts[1][5]+verts[2][5])/3;
    const nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;

    // Top surface of the brim/bill. Restrict by both height and upward normal
    // so the underside of the bill remains neutral.
    const topBill=cy<=billTopY&&ny>.12;

    // Front printable crown panel. Keep only the forward-facing crown surface;
    // side/back crown and the button/top structure remain neutral.
    const xRatio=Math.abs((cx-center.x)/Math.max(.001,size.x*.5));
    const frontPanel=!topBill&&cy>billTopY&&cz>=crownFrontZ&&nz>.02&&xRatio<.94;

    const key=topBill?'Top of Bill':frontPanel?'Front Panel':'Rest';
    const b=buffers[key];
    for(const v of verts){
      b.p.push(v[0],v[1],v[2]);
      const l=Math.hypot(v[3],v[4],v[5])||1;
      b.n.push(v[3]/l,v[4]/l,v[5]/l);
    }
  }

  if(!buffers['Front Panel'].p.length||!buffers['Top of Bill'].p.length){
    console.error('Hat zone calibration failed: printable geometry was not found');
    return null;
  }

  const group=new THREE.Group();
  group.name='MQD_Hat_Zones';
  group.position.copy(source.position);
  group.quaternion.copy(source.quaternion);
  group.scale.copy(source.scale);

  const base=Array.isArray(source.material)?source.material[0]:source.material;
  const zones=new Map();
  for(const key of['Front Panel','Top of Bill','Rest']){
    const b=buffers[key];
    if(!b.p.length)continue;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));
    g.computeBoundingBox();g.computeBoundingSphere();
    const m=base?.clone?base.clone():new THREE.MeshStandardMaterial();
    for(const mapKey of['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap'])if(mapKey in m)m[mapKey]=null;
    if(m.color)m.color.set('#f5f5f5');
    m.roughness=.84;m.metalness=0;m.transparent=false;m.opacity=1;m.needsUpdate=true;
    const mesh=new THREE.Mesh(g,m);
    mesh.name='Hat_'+key.replaceAll(' ','_');
    group.add(mesh);
    if(key!=='Rest')zones.set(key,mesh);
  }

  source.parent.add(group);
  source.visible=false;
  group.updateMatrixWorld(true);
  return zones;
}

export function hatProjection(mesh,zone){
  const b=new THREE.Box3().setFromObject(mesh),s=b.getSize(new THREE.Vector3()),p=b.getCenter(new THREE.Vector3()),r=new THREE.Euler();
  let d;
  if(zone==='Top of Bill'){
    r.set(-Math.PI/2,0,0);
    d=new THREE.Vector3(s.x*1.08,s.z*1.08,Math.max(.02,s.y*3));
  }else{
    r.set(0,0,0);
    d=new THREE.Vector3(s.x*1.08,s.y*1.08,Math.max(.02,s.z*2.2));
  }
  d.max(new THREE.Vector3(.001,.001,.001));
  return{p,r,d};
}
