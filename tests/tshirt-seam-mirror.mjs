import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {tshirtSeamFrame,tshirtMirrorSample,renderTshirtSeamMirror} from '../v20/tshirt-seam-mirror.js';
// Unequal panel frames and seam widths: a plain horizontal flip is insufficient.
const positions=Float32Array.from([-.4,-.7,-.06,-.36,.3,-.096,-.2,0,.2,.4,-.7,-.06,.36,.3,-.096,.2,0,.2]);
const front=tshirtSeamFrame(positions,Float32Array.from([0,0,.05,0,.3,0,1,0,.95,0,.7,0]),{slope:.5,intercept:.4});
const back=tshirtSeamFrame(positions,Float32Array.from([1,0,.98,0,.7,0,0,0,.02,0,.3,0]),{slope:.55,intercept:.46});
for(const [from,to]of [[front,back],[back,front]])for(const y of [-.6,-.3,0,.25])for(const u of [.05,.2,.5,.8,.95]){
 const v=to.slope*y+to.intercept,s=tshirtMirrorSample(from,to,u,v),round=tshirtMirrorSample(to,from,s.u,s.v);
 assert(Math.abs(round.u-u)<1e-7);assert(Math.abs(round.v-v)<1e-7);
}
const c=createCanvas(120,180),x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,60,180);x.fillStyle='#0000ff';x.fillRect(60,0,60,180);
const copy=renderTshirtSeamMirror(c,createCanvas(120,180),front,back),d=copy.getContext('2d').getImageData(0,0,120,180).data;
assert(d[(90*120+20)*4+2]>250);assert(d[(90*120+100)*4]>250);
for(let i=3;i<d.length;i+=4)assert.equal(d[i],255,'no transparent hem gap');
assert.throws(()=>tshirtSeamFrame(new Float32Array(9),new Float32Array(6),{}),/not ready/);
console.log('PASS: unequal seam frames, reversible sampling, mirror pixels, edge coverage and readiness guard.');
