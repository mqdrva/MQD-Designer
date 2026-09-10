from pathlib import Path

editor = Path('v20/editor.js')
s = editor.read_text()

# Fleece Hoodie only. Bump the calibration marker without touching frozen renderers.
s = s.replace(
    "const MQD_FLEECE_HOODIE_CALIBRATION='isolated-fleece-hoodie-v1-exclusive-five-zones';",
    "const MQD_FLEECE_HOODIE_CALIBRATION='isolated-fleece-hoodie-v2-cutline-full-bleed';"
)

marker = "  cx.putImageData(cutData,0,0);\n\n"
insert = r'''  // Fleece Hoodie sleeves: build the printable mask from the ACTUAL red
  // production cutline, not from the largest generic ink component. The old
  // generic detector was locking onto an interior graphic and creating the
  // blue/red circular blob seen in the editor. Work on a small raster so the
  // dashed outline can be closed efficiently even when the production file is
  // several thousand pixels tall, then scale the finished mask back up.
  if(product.id==='fleece-hoodie'&&(zone==='Left Sleeve'||zone==='Right Sleeve')){
    const mw=320,mh=Math.max(96,Math.round(h/w*mw));
    let barrier=new Uint8Array(mw*mh);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(y*w+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2],a=pixels[i+3];
      if(a>15&&r>170&&g<145&&b<145&&r>g*1.35){
        const xx=Math.min(mw-1,Math.floor(x*mw/w)),yy=Math.min(mh-1,Math.floor(y*mh/h));
        barrier[yy*mw+xx]=1;
      }
    }

    // Close the dashed red production line. This is intentionally performed on
    // the reduced mask instead of the full 3276x6124 artwork canvas.
    const passes=6;
    for(let pass=0;pass<passes;pass++){
      const next=barrier.slice();
      for(let y=1;y<mh-1;y++)for(let x=1;x<mw-1;x++){
        const idx=y*mw+x;if(barrier[idx])continue;
        if(barrier[idx-1]||barrier[idx+1]||barrier[idx-mw]||barrier[idx+mw]||
           barrier[idx-mw-1]||barrier[idx-mw+1]||barrier[idx+mw-1]||barrier[idx+mw+1])next[idx]=1;
      }
      barrier=next;
    }

    const outsideSmall=new Uint8Array(mw*mh),q=new Int32Array(mw*mh);let head=0,tail=0;
    const push=idx=>{if(idx<0||idx>=outsideSmall.length||outsideSmall[idx]||barrier[idx])return;outsideSmall[idx]=1;q[tail++]=idx;};
    for(let x=0;x<mw;x++){push(x);push((mh-1)*mw+x);}
    for(let y=0;y<mh;y++){push(y*mw);push(y*mw+mw-1);}
    while(head<tail){const idx=q[head++],x=idx%mw,y=(idx/mw)|0;if(x>0)push(idx-1);if(x<mw-1)push(idx+1);if(y>0)push(idx-mw);if(y<mh-1)push(idx+mw);}

    const small=document.createElement('canvas');small.width=mw;small.height=mh;
    const sm=small.getContext('2d'),si=sm.createImageData(mw,mh);
    let minX=mw,minY=mh,maxX=-1,maxY=-1,area=0;
    for(let y=0;y<mh;y++)for(let x=0;x<mw;x++){
      const idx=y*mw+x,o=idx*4;
      if(!outsideSmall[idx]){
        si.data[o]=255;si.data[o+1]=255;si.data[o+2]=255;si.data[o+3]=255;area++;
        minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      }
    }
    sm.putImageData(si,0,0);

    // Safety fallback: if a future template changes enough that its dashed line
    // cannot be closed, use the known sleeve silhouette rather than an interior
    // graphic. This still avoids the circular/blob mask failure.
    if(area<mw*mh*.08||area>mw*mh*.90){
      sm.clearRect(0,0,mw,mh);sm.fillStyle='#fff';traceZonePath(sm,zone,mw,mh);sm.fill();
      minX=Math.round(mw*.10);maxX=Math.round(mw*.92);minY=Math.round(mh*.08);maxY=Math.round(mh*.92);
    }

    const mask=document.createElement('canvas');mask.width=w;mask.height=h;
    const mx=mask.getContext('2d');mx.imageSmoothingEnabled=true;mx.imageSmoothingQuality='high';mx.drawImage(small,0,0,w,h);
    return{maskCanvas:mask,cutlineCanvas:cut,bounds:{
      x:minX/mw*w,y:minY/mh*h,w:(maxX-minX+1)/mw*w,h:(maxY-minY+1)/mh*h
    }};
  }

'''

if "product.id==='fleece-hoodie'&&(zone==='Left Sleeve'||zone==='Right Sleeve')" not in s:
    if marker not in s:
        raise SystemExit('buildTemplateMask insertion marker not found')
    s = s.replace(marker, marker + insert, 1)

editor.write_text(s)

# Keep the Hoodie-only geometry regression test aligned with the tighter seam.
test = Path('tests/fleece-hoodie-zones.mjs')
t = test.read_text()
t = t.replace(
    "assert.equal(zoneAt(.33,.50,.35),0,'front shoulder must not be captured by Hood');",
    "assert.equal(zoneAt(.20,.50,.35),0,'central upper front must remain Front');\nassert.equal(zoneAt(.30,.50,.05),2,'inner upper left arm must belong to Left Sleeve');\nassert.equal(zoneAt(-.30,.50,.05),3,'inner upper right arm must belong to Right Sleeve');"
)
test.write_text(t)
