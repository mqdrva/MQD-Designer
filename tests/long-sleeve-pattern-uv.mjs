import assert from 'node:assert/strict';
import {bodyPatternUv} from '../v20/long-sleeve-pattern-uv.js';
// A flat pattern with a deep center neckline; the worn neckline is shallower.
const width=101,height=101,data=new Uint8ClampedArray(width*height*4);
for(let x=0;x<width;x++)for(let y=Math.round(20*(1-Math.abs(x-50)/50));y<height;y++)data[(y*width+x)*4+3]=255;
const triangles=[[-1,0,0,0,0,0,0,.9,0],[-1,0,0,0,.9,0,-1,1,0],
  [0,0,0,1,0,0,1,1,0],[0,0,0,1,1,0,0,.9,0]];
// Interior horizontal samples do not change the boundary envelope.
const p=Float32Array.from([...triangles.flat(),-.5,.5,0,0,.5,0,.5,.5,0]);
for(const zone of ['Front','Back']){
  const mapped=bodyPatternUv(p,zone,{width,height,data},{x:0,y:0,w:100,h:101});
  for(let i=0;i<p.length;i+=3){
    const u=mapped[i/3*2],v=mapped[i/3*2+1];
    assert(Number.isFinite(u)&&Number.isFinite(v));
    if(p[i+1]===0)assert(Math.abs(v)<1e-6,'hem moved');
    if(p[i]===0&&p[i+1]>.8)assert(Math.abs(v-(1-20/101))<1e-6,'neckline not aligned');
  }
  // Equal physical heights must sample the same texture row across the panel.
  // This fails with the old per-column warp even though its center anchors pass.
  const rows=new Map();
  for(let i=0;i<p.length;i+=3){
    const y=p[i+1],v=mapped[i/3*2+1];
    if(rows.has(y))assert(Math.abs(rows.get(y)-v)<1e-6,'horizontal artwork bowed');
    else rows.set(y,v);
  }
}
console.log('PASS: pattern neckline maps to physical neckline; hem stays anchored on Front/Back.');
