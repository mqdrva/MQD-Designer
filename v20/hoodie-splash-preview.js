import {isCutlineBottomArtwork} from './water-splash-fit.js?v=grass-1';
// Preserve Background 4's approved frame; Background 2 has its own cut-line fit.
const ASSET='99b78d1f-7485-4b72-bbbc-cb2e1bd5bd17';
const frames={"Front":{"left":0.05238095238095238,"right":0.9476190476190476,"bottom":0.9462875197472354},"Back":{"left":0.005263157894736842,"right":0.9947368421052631,"bottom":0.9966499162479062},"Left Sleeve":{"left":0.18627929687500003,"right":0.8729248046875,"bottom":0.9975511476212738},"Right Sleeve":{"left":0.18627929687500003,"right":0.8729248046875,"bottom":0.9975511476212738},"Hood":{"left":0.10806451612903226,"right":0.8951612903225806,"bottom":0.7168367346938775}};
export function hoodieSplashPreviewFrame(zone,layer){
 if(layer?.type!=='image'||!layer.libraryLocked||layer.libraryAssetId!==ASSET)return null;
 const f=frames[zone];if(!f)return null;
 return {scaleX:1/(f.right-f.left),offsetX:-f.left/(f.right-f.left),offsetY:1-f.bottom};
}
export function hoodieArtworkBatches(zone,layers){
 const batches=[];
 for(const layer of layers){
  if(layer.visible===false)continue;
  const splash=isCutlineBottomArtwork(layer)||!!hoodieSplashPreviewFrame(zone,layer),last=batches.at(-1);
  if(last&&last.splash===splash)last.layers.push(layer);
  else batches.push({splash,layers:[layer]});
 }
 return batches;
}
