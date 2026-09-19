// Only the approved water artwork needs this cutline-to-projection correction.
// Flat artwork/export coordinates and the frozen garment geometry stay intact.
const WATER_SPLASH_4='99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17';
const frames={
  Front:{left:66/796,right:760/796,bottom:817/878},
  Back:{left:2/568,right:566/568,bottom:1},
  'Left Sleeve':{left:74/385,right:299/385,bottom:1},
  'Right Sleeve':{left:74/385,right:299/385,bottom:1},
  Hood:{left:67/620,right:555/620,bottom:281/392},
};
export function jacketSplashPreviewFrame(zone,layer){
  if(layer?.type!=='image'||!layer.libraryLocked||layer.libraryAssetId!==WATER_SPLASH_4)return null;
  const frame=frames[zone];
  if(!frame)return null;
  const width=frame.right-frame.left;
  return {scaleX:1/width,offsetX:-frame.left/width,offsetY:1-frame.bottom};
}
