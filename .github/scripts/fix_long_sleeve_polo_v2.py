from pathlib import Path

panel = Path('v20/long-sleeve-polo-panels.js')
panel.write_text("""import {partitionWithRules} from './panels.js';

// Long Sleeve Polo only. Do not reuse these seams for the frozen
// Long Sleeve T-Shirt renderer. The polo sleeves sit closer to the
// torso and its folded collar extends wider/lower than the tee rib.
const sleeveEdge=y=>y>=0 ? .405-.035*y : .405-.045*y;
const rules=[
  {zone:4,tests:[
    v=>v[1]+.34*v[2]-.690,
    v=>1-(v[0]/.315)**2-((v[2]+.065)/.295)**2
  ]},
  {zone:2,tests:[v=>v[0]-sleeveEdge(v[1])]},
  {zone:3,tests:[v=>-v[0]-sleeveEdge(v[1])]},
  {zone:0,tests:[v=>v[2]+.025+.11*Math.max(0,v[1])]}
];

export function partitionLongSleevePoloTriangle(triangle){
  return partitionWithRules(triangle,rules);
}
""")

p = Path('v20/editor.js')
s = p.read_text()

import_old = "import {partitionLongSleeveTriangle,longSleevePanelUv} from './long-sleeve-panels.js';"
import_new = import_old + "\nimport {partitionLongSleevePoloTriangle} from './long-sleeve-polo-panels.js';"
if "import {partitionLongSleevePoloTriangle}" not in s:
    if import_old not in s:
        raise SystemExit('long sleeve import not found')
    s = s.replace(import_old, import_new, 1)

s = s.replace(
    "const MQD_LONG_SLEEVE_POLO_CALIBRATION='isolated-long-sleeve-polo-phase1';",
    "const MQD_LONG_SLEEVE_POLO_CALIBRATION='isolated-long-sleeve-polo-v2-exclusive-zones';"
)

old = "const parts=(longSleeve||longSleevePolo)?partitionLongSleeveTriangle(triangle):useExactPoloCollar?(isPoloCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):useExactCollar?(isTshirtCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):partitionTriangle(triangle);"
new = "const parts=longSleevePolo?partitionLongSleevePoloTriangle(triangle):longSleeve?partitionLongSleeveTriangle(triangle):useExactPoloCollar?(isPoloCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):useExactCollar?(isTshirtCollarFace(faceIndex)?[[4,triangle]]:partitionBodyTriangle(triangle)):partitionTriangle(triangle);"
if old in s:
    s = s.replace(old, new, 1)
elif new not in s:
    raise SystemExit('panel partition selector not found')

marker = """  // Keep the Short Sleeve Polo Back exactly on its previously approved mask.
  // The newer silhouette-fill logic remains active for the zones that needed it.
"""

special = """  // Long Sleeve Polo Back: derive the fill only from the true red production
  // outline. Dilate the dashed cutline just enough to close dash gaps, then
  // flood-fill from the outside. This prevents helper text/graphics from becoming
  // the mask while preserving the neckline opening and full back silhouette.
  if(product.id==='long-sleeve-polo'&&zone==='Back'){
    let barrier=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a>15&&r>170&&g<145&&b<145&&r>g*1.35)barrier[y*w+x]=1;
    }
    const passes=Math.max(18,Math.min(42,Math.round(Math.min(w,h)*.008)));
    for(let pass=0;pass<passes;pass++){
      const next=barrier.slice();
      for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
        const idx=y*w+x;
        if(barrier[idx])continue;
        if(barrier[idx-1]||barrier[idx+1]||barrier[idx-w]||barrier[idx+w]||
           barrier[idx-w-1]||barrier[idx-w+1]||barrier[idx+w-1]||barrier[idx+w+1])next[idx]=1;
      }
      barrier=next;
    }
    const outSide=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
    const push=idx=>{if(idx<0||idx>=outSide.length||outSide[idx]||barrier[idx])return;outSide[idx]=1;q[tail++]=idx;};
    for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
    for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
    while(head<tail){const idx=q[head++],x=idx%w,y=(idx/w)|0;if(x>0)push(idx-1);if(x<w-1)push(idx+1);if(y>0)push(idx-w);if(y<h-1)push(idx+w);}
    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d'),out=mx.createImageData(w,h);let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const idx=y*w+x,o=idx*4;if(!outSide[idx]){out.data[o]=255;out.data[o+1]=255;out.data[o+2]=255;out.data[o+3]=255;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
    if(maxX<minX||maxY<minY){minX=0;minY=0;maxX=w-1;maxY=h-1;mx.fillStyle='#fff';mx.fillRect(0,0,w,h);}else mx.putImageData(out,0,0);
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1}};
  }

"""

if "product.id==='long-sleeve-polo'&&zone==='Back'" not in s:
    if marker not in s:
        raise SystemExit('Short Sleeve Polo mask marker not found')
    s = s.replace(marker, special + marker, 1)

p.write_text(s)
