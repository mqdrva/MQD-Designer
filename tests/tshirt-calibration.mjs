import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {decodeTshirtSurfaceUv} from '../v20/tshirt-surface-uv.js';
const raw=fs.readFileSync(new URL('../assets/calibration/tshirt-surface-uv.bin',import.meta.url)),metadata=JSON.parse(fs.readFileSync(new URL('../assets/calibration/tshirt-surface-uv.json',import.meta.url)));
assert.equal(createHash('sha256').update(raw).digest('hex'),metadata.calibrationSha256);
const buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length),records=decodeTshirtSurfaceUv(buffer);
assert.deepEqual([...records.keys()],['Front','Back','Collar']);
for(const record of records.values()){assert(record.count>1000);assert(record.fingerprint>0);assert.equal(record.values.length,record.count);}
assert.throws(()=>decodeTshirtSurfaceUv(buffer.slice(0,-2)),/Truncated/);
console.log('PASS: approved calibration asset integrity and topology record validation.');
