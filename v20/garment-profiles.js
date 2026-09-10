import {panelNames,partitionTriangle,partitionBodyTriangle,panelUv} from './panels.js';
import {partitionLongSleeveTriangle,longSleevePanelUv} from './long-sleeve-panels.js';
import {TSHIRT_FACE_COUNT,isTshirtCollarFace} from './tshirt-collar-mask.js';
import {POLO_FACE_COUNT,isPoloCollarFace} from './polo-collar-mask.js';

// Calibration is per garment. Sharing the engine must never imply that a
// different GLB has the same seams, collar topology, or approval status.
const names=Object.freeze([...panelNames]);
const angularZones=Object.freeze(['Left Sleeve','Right Sleeve','Collar']);
function profile(options){return Object.freeze({zones:names,angularZones,artworkOffsetY:()=>0,...options});}
function collarPartition(expected,isCollar){
 return (triangle,faceIndex,faceCount)=>faceCount===expected
  ?(isCollar(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle))
  :partitionTriangle(triangle);
}
export const garmentProfiles=Object.freeze({
 tshirt:profile({family:'tshirt',status:'approved',frozen:true,partition:collarPartition(TSHIRT_FACE_COUNT,isTshirtCollarFace),uv:panelUv,expectedFaces:TSHIRT_FACE_COUNT}),
 'long-sleeve-tshirt':profile({family:'tshirt',status:'approved',frozen:true,partition:partitionLongSleeveTriangle,uv:longSleevePanelUv}),
 'short-sleeve-polo':profile({family:'polo',status:'approved',frozen:true,partition:collarPartition(POLO_FACE_COUNT,isPoloCollarFace),uv:panelUv,expectedFaces:POLO_FACE_COUNT,artworkOffsetY:zone=>zone==='Back'?-.08:0}),
 // Preserve the existing long-polo implementation without claiming approval.
 'long-sleeve-polo':profile({family:'polo',status:'needs-visual-approval',frozen:false,partition:partitionLongSleeveTriangle,uv:longSleevePanelUv})
});
export function getGarmentProfile(id){return garmentProfiles[id]||null;}

// A reference is a starting point, NOT permission to enable its masks on a
// different model. Uncalibrated garments retain their existing renderer.
export const calibrationQueue=Object.freeze([
 ['long-sleeve-polo','polo','short-sleeve-polo'],
 ['fleece-hoodie','hooded','long-sleeve-tshirt'],
 ['hooded-long-sleeve','hooded','long-sleeve-tshirt'],
 ['hood-mask-shirt','hooded','hooded-long-sleeve'],
 ['lightweight-jacket','hooded','fleece-hoodie'],
 ['shorts','bottoms',null],['sweat-pants','bottoms','shorts'],
 ['mask','accessories',null],['hat','accessories',null]
].map(([id,family,reference])=>Object.freeze({id,family,reference,status:garmentProfiles[id]?.status||'needs-calibration'})));
