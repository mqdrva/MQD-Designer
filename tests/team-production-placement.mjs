import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {placeTeamPrint} from '../v20/team-production-placement.js';
const source=createCanvas(20,20);source.getContext('2d').fillStyle='red';source.getContext('2d').fillRect(0,0,20,20);
for(const text of [false,true]){
 const target=createCanvas(1800,1800),ctx=target.getContext('2d'),placement={x:2,y:1,width:3,height:4};
 const art=text?{texts:[{placement}]}:{file:{},placement};placeTeamPrint(ctx,source,art,{width:6,height:6});
 assert.equal(ctx.getImageData(10,10,1,1).data[3],0,'Must not move artwork to origin');
 assert.equal(ctx.getImageData(601,301,1,1).data[0],255);assert.equal(ctx.getImageData(1499,1499,1,1).data[3],255);assert.equal(ctx.getImageData(1501,1501,1,1).data[3],0);
}
console.log('PASS 2D Team production pixels: original-image and rendered-text bounds retain exact saved inch placement at 300 pixels per inch.');
