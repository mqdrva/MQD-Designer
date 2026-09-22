import {drawFittedSplash} from './water-splash-fit.js?v=grass-1';

// Scoped to the front and back artwork; garment geometry and other art stay frozen.
export function isJacketSplash5(productId,zone,layer){
  return productId==='lightweight-jacket'&&['Front','Back'].includes(zone)&&layer?.type==='image'&&
    layer.libraryLocked&&layer.libraryAssetId==='3599008d-9fe7-4c04-b65b-b65494f71aa7';
}

export function drawJacketSplash5(ctx,layer,content,cut,frame,flatAspect,preview=false){
  // Fit visible pixels to the flat cutline. The 3D projection spans that cutline
  // from side to side and neckline to hem, so normalize both axes together.
  const height=cut.bottom-cut.top;
  if(height<=0||cut.right<=cut.left)return;
  drawFittedSplash(ctx,layer.image,content,cut,frame,
    preview?flatAspect/height:flatAspect,preview,!!layer.flipX,!!layer.flipY);
}
