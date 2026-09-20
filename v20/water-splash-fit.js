// Only these approved edge artworks use visible-pixel cutline fitting.
export const WATER_SPLASH_2='e39b3c60-1854-4655-890c-e1815d50cc2e';
export const isWaterSplash2=layer=>layer?.type==='image'&&layer.libraryLocked&&layer.libraryAssetId===WATER_SPLASH_2;
export const GRASS_BOTTOM='a610a709-e5d2-4d15-9452-cf0f29d86420';
export const isCutlineBottomArtwork=layer=>isWaterSplash2(layer)||(layer?.type==='image'&&layer.libraryLocked&&layer.libraryAssetId===GRASS_BOTTOM);

// Visible source pixels, not the transparent image rectangle, meet the cut edges.
// Return normalized flat coordinates first; preview adapters only change the frame.
export function splashFit(content,cut,flatAspect,imageAspect=1){
  const width=cut.right-cut.left;
  const height=width*flatAspect*(content.bottom-content.top)/((content.right-content.left)*imageAspect);
  return {left:cut.left,top:cut.bottom-height,width,height};
}

export function drawFittedSplash(ctx,image,content,cut,b,flatAspect,preview=false,flipX=false,flipY=false){
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const fit=splashFit(content,cut,flatAspect,iw/ih);
  const left=preview?0:fit.left,width=preview?1:fit.width;
  const bottom=preview?1:cut.bottom;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x+(preview?0:cut.left)*b.w,b.y+(preview?0:cut.top)*b.h,
    (preview?1:cut.right-cut.left)*b.w,(preview?1:cut.bottom-cut.top)*b.h);
  ctx.clip();
  ctx.translate(b.x+(left+width/2)*b.w,b.y+(bottom-fit.height/2)*b.h);
  ctx.scale(flipX?-1:1,flipY?-1:1);
  ctx.drawImage(image,content.left*iw,content.top*ih,(content.right-content.left)*iw,(content.bottom-content.top)*ih,
    -width*b.w/2,-fit.height*b.h/2,width*b.w,fit.height*b.h);
  ctx.restore();
}
