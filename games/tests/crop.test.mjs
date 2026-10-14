import test from 'node:test';
import assert from 'node:assert/strict';
import {cropGeometry,transformCrop} from '../public/crop.js';
const initial={zoom:1,panX:0,panY:0};
test('pinch preserves image point under moving midpoint',()=>{const from={x:200,y:220},to={x:230,y:240};const before=cropGeometry(800,800,false,initial);const next=transformCrop(800,800,false,initial,from,to,2);const after=cropGeometry(800,800,false,next);assert.equal(next.zoom,2);assert.equal((from.x-before.x)/before.w,(to.x-after.x)/after.w);assert.equal((from.y-before.y)/before.h,(to.y-after.y)/after.h)});
test('drag and extreme pinch stay within crop bounds',()=>{const next=transformCrop(1200,800,false,initial,{x:250,y:250},{x:9999,y:-9999},10);assert.equal(next.zoom,3);assert.equal(next.panX,1);assert.equal(next.panY,-1);const reset=transformCrop(1200,800,false,next,{x:250,y:250},{x:250,y:250},.001);assert.equal(reset.zoom,1);assert.equal(reset.panY,0)});
test('transparent cutout fits all edges at reset without nonfinite offsets',()=>{const g=cropGeometry(800,1200,true,initial);assert.equal(g.h,500);assert.ok(g.w<500);const next=transformCrop(800,1200,true,initial,{x:0,y:0},{x:100,y:100});assert.deepEqual(next,initial)});
