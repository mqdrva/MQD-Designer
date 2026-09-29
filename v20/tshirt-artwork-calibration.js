export const TSHIRT_BODY_ARTWORK_OFFSET_Y=-.09;
export const TSHIRT_AI_FRONT_LOGO_OFFSET_Y=-.12;

export function tshirtBodyImageOffsetY(layer){
  // Full-zone AI backgrounds share the unshifted 2D artwork frame. Applying
  // the foreground correction here raises the pattern and leaves a blank hem.
  if(layer?.aiAssetKind==='artwork')return 0;
  // User-approved 2D chest placement stays untouched. The front AI-logo
  // preview alone needs an additional 3% lift; the back keeps its calibration.
  if(layer?.aiManaged&&layer?.aiAssetKind==='logo'&&layer?.aiZone==='Front')return TSHIRT_AI_FRONT_LOGO_OFFSET_Y;
  return layer?.libraryAssetId&&layer?.libraryLocked?0:TSHIRT_BODY_ARTWORK_OFFSET_Y;
}
