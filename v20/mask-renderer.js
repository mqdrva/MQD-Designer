export const MASK_MAPPING_CALIBRATION='single-front-surface-v1';

export function maskFrontUv(position,bounds){
  const [x,y,z]=position;
  const xMin=bounds.min[0],xMax=bounds.max[0],yMin=bounds.min[1],yMax=bounds.max[1];
  const u=Math.max(0,Math.min(1,(x-xMin)/Math.max(1e-6,xMax-xMin)));
  const v=Math.max(0,Math.min(1,(y-yMin)/Math.max(1e-6,yMax-yMin)));
  return[u,v];
}

export function maskExteriorScore(position,normal){
  const radialLength=Math.hypot(position[0],position[2])||1;
  return(normal[0]*position[0]+normal[2]*position[2])/radialLength;
}

export function createMaskSurface(sourceMesh,THREE){
  if(!sourceMesh?.geometry?.getAttribute('position'))return null;
  const geometry=sourceMesh.geometry;
  if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const xMin=geometry.boundingBox.min.x,xMax=geometry.boundingBox.max.x;
  const yMin=geometry.boundingBox.min.y,yMax=geometry.boundingBox.max.y;
  const material=new THREE.MeshStandardMaterial({
    color:'#ffffff',
    roughness:.9,
    metalness:0,
    side:THREE.FrontSide
  });
  material.name='MQD_Mask_Exterior_Material';
  material.onBeforeCompile=shader=>{
    shader.uniforms.mqdMaskYMin={value:yMin};
    shader.uniforms.mqdMaskYRange={value:Math.max(1e-6,yMax-yMin)};
    shader.uniforms.mqdMaskXMin={value:xMin};
    shader.uniforms.mqdMaskXRange={value:Math.max(1e-6,xMax-xMin)};
    shader.uniforms.mqdMaskBaseColor={value:material.userData.maskBaseColor};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vMqdMaskPosition;\nvarying vec3 vMqdMaskNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvMqdMaskPosition=position;\nvMqdMaskNormal=normal;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vMqdMaskPosition;\nvarying vec3 vMqdMaskNormal;\nuniform float mqdMaskXMin;\nuniform float mqdMaskXRange;\nuniform float mqdMaskYMin;\nuniform float mqdMaskYRange;\nuniform vec3 mqdMaskBaseColor;')
      .replace('#include <map_fragment>',`#ifdef USE_MAP
        vec2 mqdUv=vec2(clamp((vMqdMaskPosition.x-mqdMaskXMin)/mqdMaskXRange,0.,1.),clamp((vMqdMaskPosition.y-mqdMaskYMin)/mqdMaskYRange,0.,1.));
        vec4 mqdDesign=texture2D(map,mqdUv);
        vec3 mqdRadial=normalize(vec3(vMqdMaskPosition.x,0.,vMqdMaskPosition.z)+vec3(1e-6,0.,0.));
        float mqdExterior=step(-.12,dot(normalize(vMqdMaskNormal),mqdRadial));
        float mqdFront=mqdExterior*step(.05,normalize(vMqdMaskNormal).z);
        vec3 mqdOuterColor=mix(mqdMaskBaseColor,mqdDesign.rgb,mqdDesign.a*mqdFront);
        diffuseColor*=vec4(mix(vec3(.84),mqdOuterColor,mqdExterior),1.);
      #endif`);
  };
  material.userData.maskBaseColor=new THREE.Color('#ffffff');
  material.customProgramCacheKey=()=>MASK_MAPPING_CALIBRATION;
  const oldMaterials=Array.isArray(sourceMesh.material)?sourceMesh.material:[sourceMesh.material];
  oldMaterials.filter(Boolean).forEach(old=>old.dispose?.());
  sourceMesh.material=material;
  sourceMesh.name='MQD_Mask_Print_Surface';
  return sourceMesh;
}

export function applyMaskTexture(maskSurface,texture,background,THREE){
  if(!maskSurface?.material||!texture)return false;
  maskSurface.material.map?.dispose?.();
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.flipY=true;
  texture.wrapS=THREE.ClampToEdgeWrapping;
  texture.wrapT=THREE.ClampToEdgeWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  maskSurface.material.map=texture;
  maskSurface.material.userData.maskBaseColor.set(background||'#FFFFFF');
  maskSurface.material.needsUpdate=true;
  return true;
}
