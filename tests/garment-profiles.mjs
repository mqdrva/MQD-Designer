import assert from 'node:assert/strict';
import {getGarmentProfile,garmentProfiles,calibrationQueue} from '../v20/garment-profiles.js';
import {partitionTriangle,partitionBodyTriangle,panelUv} from '../v20/panels.js';
import {partitionLongSleeveTriangle,longSleevePanelUv} from '../v20/long-sleeve-panels.js';
import {TSHIRT_FACE_COUNT,isTshirtCollarFace} from '../v20/tshirt-collar-mask.js';
import {POLO_FACE_COUNT,isPoloCollarFace} from '../v20/polo-collar-mask.js';

// Reproduce the pre-refactor routing independently of the profile registry.
function previous(id,t,index,count){
 if(id==='long-sleeve-tshirt'||id==='long-sleeve-polo')return partitionLongSleeveTriangle(t);
 if(id==='short-sleeve-polo'&&count===POLO_FACE_COUNT)return isPoloCollarFace(index)?[[4,t]]:partitionBodyTriangle(t);
 if(id==='tshirt'&&count===TSHIRT_FACE_COUNT)return isTshirtCollarFace(index)?[[4,t]]:partitionBodyTriangle(t);
 return partitionTriangle(t);
}
let seed=1234;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const bounds={min:{x:-.7,y:-.85,z:-.35},max:{x:.7,y:.85,z:.35}};
for(const [id,profile] of Object.entries(garmentProfiles)){
 assert(Object.isFrozen(profile));
 const count=profile.expectedFaces||500000;
 for(let i=0;i<2000;i++){
  const t=Array.from({length:3},()=>[rand()*1.4-.7,rand()*1.7-.85,rand()*.7-.35,0,0,1]);
  const face=Math.floor(rand()*count);
  for(const size of [count,count+1])assert.deepEqual(profile.partition(t,face,size),previous(id,t,face,size));
  for(const zone of profile.zones)assert.deepEqual(profile.uv(zone,...t[0].slice(0,3),bounds),(id.includes('long-sleeve')?longSleevePanelUv:panelUv)(zone,...t[0].slice(0,3),bounds));
 }
 assert.equal(profile.artworkOffsetY('Back'),id==='short-sleeve-polo'?-.08:0);
}
assert.equal(new Set([...Object.keys(garmentProfiles),...calibrationQueue.map(p=>p.id)]).size,12);
for(const item of calibrationQueue)if(item.status==='needs-calibration')assert.equal(getGarmentProfile(item.id),null);
for(const id of ['tshirt','long-sleeve-tshirt','short-sleeve-polo'])assert.equal(getGarmentProfile(id).frozen,true);
console.log('PASS: 16,000 partition comparisons, 40,000 UV comparisons, artwork offsets, frozen profiles, and all 12 catalog entries.');
