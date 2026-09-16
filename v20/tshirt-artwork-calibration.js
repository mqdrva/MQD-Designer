export const TSHIRT_BODY_ARTWORK_OFFSET_Y=-.09;

export function tshirtBodyImageOffsetY(layer){
  return layer?.libraryAssetId&&layer?.libraryLocked?0:TSHIRT_BODY_ARTWORK_OFFSET_Y;
}
