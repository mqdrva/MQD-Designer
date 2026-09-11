import assert from 'node:assert/strict';
import {maskFrontUv,maskExteriorScore,MASK_MAPPING_CALIBRATION} from '../v20/mask-renderer.js';

const bounds={min:[-1,-1,-1],max:[1,1,1]};
assert.deepEqual(maskFrontUv([0,0,1],bounds).map(v=>+v.toFixed(4)),[.5,.5],
  '2D center must map to the visible front center');
assert(maskFrontUv([.5,.5,1],bounds)[0]>.5,
  'screen-right geometry must read from the right side of the 2D design');
assert.equal(maskFrontUv([0,1,1],bounds)[1],1,
  'top of the 3D mask must read from the top of the 2D design');
assert(maskExteriorScore([0,0,1],[0,0,1])>.99,
  'outward-facing fabric must be printable');
assert(maskExteriorScore([0,0,1],[0,0,-1])<-.99,
  'inside-facing fabric must not receive customer artwork');
assert.equal(MASK_MAPPING_CALIBRATION,'single-front-surface-v1');

console.log('PASS Mask uses one non-mirrored front artwork surface with full exterior color and neutral interior faces');
