import assert from 'node:assert/strict';
import fs from 'node:fs';
import {longSleevePanelUv as uv} from '../v20/long-sleeve-panels.js';

const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');

// The Long Sleeve T-Shirt has one 2D layer render and the same normalized
// artwork is clipped to the production mask before it reaches the 3D texture.
assert(editor.includes("MQD_LONG_SLEEVE_TSHIRT_TEXT_MAPPING_LOCK='cutline-clipped-four-zones-v1-collar-frozen'"));
assert(editor.includes("if(product.id!=='long-sleeve-tshirt'||zone==='Collar')return artwork"));
assert(editor.includes("c.globalCompositeOperation='destination-in'"));
assert(editor.includes('c.drawImage(rec.maskCanvas,bounds.x,bounds.y,bounds.w,bounds.h,0,0,clipped.width,clipped.height)'));
assert(editor.includes("product.id!=='tshirt'&&product.id!=='long-sleeve-tshirt'"));
assert(editor.includes("?makeLongSleeveTshirtArtworkCanvas(zone,1600)"));

const bounds={min:{x:-.75,y:-.85,z:-.35},max:{x:.75,y:.78,z:.35}};
const near=(a,b,e=1e-9)=>Math.abs(a-b)<=e;

// Front and Back use the identical normalized 2D frame. Back reverses only X
// so text reads correctly from the outside; vertical placement stays exact.
for(const [u,v] of [[.2,.2],[.5,.5],[.8,.8]]){
  const x=bounds.min.x+u*(bounds.max.x-bounds.min.x);
  const y=bounds.min.y+v*(bounds.max.y-bounds.min.y);
  const front=uv('Front',x,y,.1,bounds),back=uv('Back',x,y,-.1,bounds);
  assert(near(front[0],u)&&near(front[1],v));
  assert(near(back[0],1-u)&&near(back[1],v));
}

// Mirrored physical sleeve points share one 2D coordinate frame. Their U
// directions oppose each other while shoulder-to-wrist placement remains equal.
for(const [x,y,z] of [[.48,.55,.08],[.56,-.15,.02],[.65,-.65,-.04]]){
  const left=uv('Left Sleeve',x,y,z,bounds);
  const right=uv('Right Sleeve',-x,y,z,bounds);
  assert(near(left[0]+right[0],1));
  assert(near(left[1],right[1]));
}

console.log({
  zones:['Front','Back','Left Sleeve','Right Sleeve'],
  collar:'approved mapping unchanged',
  checks:'single 2D text pass, cutline-clipped 3D artwork, symmetric sleeve coordinates'
});
