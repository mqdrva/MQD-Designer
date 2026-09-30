import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bodyPatternUv} from '../v20/long-sleeve-pattern-uv.js';
// Production front center neckline at .19775 of the template, within its
// .035..910 artwork frame. The shallow worn neckline must sample that row.
const width=1001,height=1001,data=new Uint8ClampedArray(width*height*4);
for(let x=0;x<width;x++)for(let y=198;y<910;y++)data[(y*width+x)*4+3]=255;
const p=Float32Array.from([-1,0,0,1,0,0,0,.9,0]);
const mapped=bodyPatternUv(p,'Front',{width,height,data},{x:110,y:35,w:780,h:875});
assert(Math.abs(mapped[5]-(1-(198-35)/875))<1e-6,'neckline must crop the same image row as 2D');
assert(Math.abs(mapped[1])<1e-6,'hem must remain anchored');
const source=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');
assert(source.includes("const accurateTshirtFront=product.id==='tshirt'&&zone==='Front'"));
assert(source.includes('for(let i=1;i<uv.length;i+=2)uv[i]=mapped[i]'),'preserve horizontal side mapping');
assert(source.includes("const tshirtBodyArtwork=product.id==='tshirt'&&zone==='Back'"),'no extra layer offsets on calibrated front');
console.log('PASS: front neckline crop, hem anchor, unchanged horizontal UVs, and front-only scope.');
