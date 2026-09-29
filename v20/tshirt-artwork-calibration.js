export const TSHIRT_BODY_ARTWORK_OFFSET_Y=-.09;
export const TSHIRT_AI_FRONT_LOGO_OFFSET_Y=-.12;

export function isTshirtBackFullCoverageImage(layer,{zone,baseLayer=false,opaqueEdges=false}={}){
  if(zone!=='Back'||layer?.type!=='image'||!baseLayer||!opaqueEdges||layer.aiManaged||layer.libraryAssetId)return false;
  const crop=layer.crop||{};
  return Math.abs(Number(layer.x)||0)<=10&&Math.abs(Number(layer.y)||0)<=10
    &&Math.abs((Number(layer.scale)||1)-1)<=.1&&Math.abs(Number(layer.rotation)||0)<=1
    &&['left','top','right','bottom'].every(edge=>!(Number(crop[edge])||0));
}

export function tshirtBodyImageOffsetY(layer,context){
  // Full-zone AI backgrounds share the unshifted 2D artwork frame. Applying
  // the foreground correction here raises the pattern and leaves a blank hem.
  if(layer?.chatBackground||layer?.aiAssetKind==='artwork')return 0;
  // An opaque, bottom-most customer image covering the Back is also background
  // artwork, even when it was added with Add Image rather than Upload Background.
  if(isTshirtBackFullCoverageImage(layer,context))return 0;
  // User-approved 2D chest placement stays untouched. The front AI-logo
  // preview alone needs an additional 3% lift; the back keeps its calibration.
  if(layer?.aiManaged&&layer?.aiAssetKind==='logo'&&layer?.aiZone==='Front')return TSHIRT_AI_FRONT_LOGO_OFFSET_Y;
  return layer?.libraryAssetId&&layer?.libraryLocked?0:TSHIRT_BODY_ARTWORK_OFFSET_Y;
}
