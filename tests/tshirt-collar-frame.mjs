import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {createTshirtCollarFrame} from '../v20/tshirt-collar-frame.js';
const r=createTshirtCollarFrame({createElement:()=>createCanvas(1,1)},{width:3276,height:435});
assert.equal(r.artworkAspect,3276/435);
const pixels=r.maskCanvas.getContext('2d').getImageData(0,0,r.maskCanvas.width,r.maskCanvas.height).data;
for(let i=3;i<pixels.length;i+=4)assert.equal(pixels[i],255,'Entire strip is printable, no screenshot instruction outline');
assert.deepEqual(r.bounds,{x:0,y:0,w:1024,h:136});
console.log('PASS: collar uses complete configured print strip and preserves its aspect.');
