// Opt-in background transfer. Read the existing calibrated mesh; never change
// its UVs. Both panels meet on z + .06 + .12 * max(0,y) = 0.
export function tshirtSeamFrame(positions,uv,placement){
  const sides=[[],[]];
  for(let i=0;i<positions.length;i+=9)for(let k=0;k<3;k++){
    const a=i+k*3,b=i+(k+1)%3*3;
    const on=j=>Math.abs(positions[j+2]+.06+.12*Math.max(0,positions[j+1]))<2e-6;
    if(!on(a)||!on(b)||positions[a]*positions[b]<=0||Math.min(Math.abs(positions[a]),Math.abs(positions[b]))<.2)continue;
    const p=[positions[a+1],uv[a/3*2],Math.abs(positions[a])],q=[positions[b+1],uv[b/3*2],Math.abs(positions[b])];
    if(Math.abs(p[0]-q[0])<1e-9)continue;
    sides[positions[a]>0?1:0].push(p[0]<q[0]?[p,q]:[q,p]);
  }
  if(sides.some(s=>!s.length))throw new Error('The shirt side seams are not ready. Wait for the 3D shirt to load.');
  return {...placement,sides:sides.map(edges=>({segments:edges.sort((a,b)=>a[0][0]-b[0][0]),maxSpan:Math.max(...edges.map(([a,b])=>b[0]-a[0]))}))};
}
function sideAt({segments:edges,maxSpan},y){
  let best=null,nearest=null,distance=Infinity;
  let lo=0,hi=edges.length;
  while(lo<hi){const mid=(lo+hi)>>>1;if(edges[mid][0][0]<=y+1e-7)lo=mid+1;else hi=mid;}
  const start=Math.min(edges.length-1,lo);
  for(let i=start;i>=0;i--){
    const [a,b]=edges[i];
    if(i<start&&y-a[0]>maxSpan+1e-7&&nearest!==null)break;
    if(y>=a[0]-1e-7&&y<=b[0]+1e-7){const t=(y-a[0])/(b[0]-a[0]),x=a[2]+t*(b[2]-a[2]);if(!best||x>best.x)best={x,u:a[1]+t*(b[1]-a[1])};}
    for(const p of [a,b])if(Math.abs(y-p[0])<distance){distance=Math.abs(y-p[0]);nearest=p[1];}
  }
  return best?best.u:nearest;
}
export function tshirtSeamEdges(frame,y){
  const a=sideAt(frame.sides[0],y),b=sideAt(frame.sides[1],y);
  return [Math.min(a,b),Math.max(a,b)];
}
export function tshirtMirrorSample(from,to,u,v){
  const y=(v-to.intercept)/to.slope;
  const [fl,fr]=tshirtSeamEdges(from,y),[tl,tr]=tshirtSeamEdges(to,y);
  if(!(tr-tl>.1&&fr-fl>.1))throw new Error('The shirt side-seam span is invalid.');
  return {u:fr-(u-tl)*(fr-fl)/(tr-tl),v:from.slope*y+from.intercept};
}
// Build at the production artwork resolution, not screenshot resolution. The
// resulting ordinary PNG layer uses the existing editor/preview/export path.
export function renderTshirtSeamMirror(source,output,from,to){
  const c=output.getContext('2d'),w=output.width,h=output.height;
  const sw=source.width,sh=source.height,pixels=source.getContext('2d').getImageData(0,0,sw,sh).data,result=c.createImageData(w,h),out=result.data;
  for(let row=0;row<h;row++){
    const v=1-(row+.5)/h,a=tshirtMirrorSample(from,to,0,v),b=tshirtMirrorSample(from,to,1,v);
    // Match the texture's edge extension at the slightly different hem/neck
    // limits; a filled background must not acquire a transparent border.
    const sy=(1-a.v)*sh-.5;
    const fy=Math.max(0,Math.min(sh-1,sy)),y0=Math.floor(fy),y1=Math.min(sh-1,y0+1),ty=fy-y0;
    for(let x=0;x<w;x++){
      const sx=(a.u+(b.u-a.u)*(x+.5)/w)*sw-.5;
      const fx=Math.max(0,Math.min(sw-1,sx)),x0=Math.floor(fx),x1=Math.min(sw-1,x0+1),tx=fx-x0;
      const indices=[(y0*sw+x0)*4,(y0*sw+x1)*4,(y1*sw+x0)*4,(y1*sw+x1)*4],weights=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];
      const dst=(row*w+x)*4;let alpha=0;
      for(let k=0;k<4;k++)alpha+=pixels[indices[k]+3]*weights[k];
      out[dst+3]=alpha;
      if(alpha>0)for(let channel=0;channel<3;channel++){let value=0;for(let k=0;k<4;k++)value+=pixels[indices[k]+channel]*pixels[indices[k]+3]*weights[k];out[dst+channel]=value/alpha;}
    }
  }
  c.putImageData(result,0,0);
  return output;
}
