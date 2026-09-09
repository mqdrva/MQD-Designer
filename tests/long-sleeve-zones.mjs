import fs from 'node:fs';
import assert from 'node:assert/strict';
import {partitionLongSleeveTriangle as partition,longSleevePanelUv as uv} from '../v20/long-sleeve-panels.js';
const b=fs.readFileSync(process.argv[2]),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));
function accessor(i,C,width){const a=j.accessors[i],v=j.bufferViews[a.bufferView];return new C(b.buffer,b.byteOffset+28+n+(v.byteOffset||0)+(a.byteOffset||0),a.count*width);}
const p=accessor(0,Float32Array,3),f=accessor(3,Uint32Array,1),counts=[0,0,0,0,0],out=[];
function area(t){const a=t[1].map((v,i)=>v-t[0][i]),b=t[2].map((v,i)=>v-t[0][i]);return Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])/2;}
let original=0,result=0;
for(let i=0;i<f.length;i+=3){const t=[0,1,2].map(k=>Array.from(p.subarray(f[i+k]*3,f[i+k]*3+3)));original+=area(t);for(const [zone,poly] of partition(t))for(let k=1;k<poly.length-1;k++){const t2=[poly[0],poly[k],poly[k+1]];result+=area(t2);counts[zone]++;if(zone<2)for(const v of t2){assert(v[0]+.13*v[1]<=.490001);assert(-v[0]+.13*v[1]<=.490001);}out.push(...t2.flat(),zone);}}
assert(Math.abs(original-result)<1e-7);assert(counts.every(n=>n>0));
const bounds={min:{x:-.45,y:-.85,z:-.35},max:{x:.45,y:.75,z:.35}};
assert.deepEqual(uv('Front',0,.75,.1,bounds),[.5,1]);assert.deepEqual(uv('Back',-.45,.75,-.1,bounds),[1,1]);
if(process.argv[3])fs.writeFileSync(process.argv[3],Buffer.from(new Float32Array(out).buffer));
console.log({original,result,counts,checks:'Area preserved; torso excludes both sleeves; neckline maps to top of texture.'});
