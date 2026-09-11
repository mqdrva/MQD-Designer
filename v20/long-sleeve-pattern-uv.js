// Long Sleeve T-Shirt only. Match the vertical boundaries of the flat pattern
// to the actual isolated body's neckline/shoulder and hem at each horizontal U.
// Text and images share this geometry mapping; no layer offsets are applied.
export function bodyPatternUv(positions,zone,mask,bounds,samples=257){
  const clamp=x=>Math.max(0,Math.min(1,x));
  let minX=Infinity,maxX=-Infinity;
  for(let i=0;i<positions.length;i+=3){minX=Math.min(minX,positions[i]);maxX=Math.max(maxX,positions[i]);}
  const width=maxX-minX;
  if(!(width>0))throw new Error('Empty body width');
  const low=new Float64Array(samples).fill(Infinity),high=new Float64Array(samples).fill(-Infinity);
  // Intersect projected triangle edges with each X column, including columns
  // between vertices. Vertex-only bins miss the neckline and hem boundaries.
  for(let i=0;i<positions.length;i+=9){
    const xs=[positions[i],positions[i+3],positions[i+6]],ys=[positions[i+1],positions[i+4],positions[i+7]];
    const start=Math.max(0,Math.ceil((Math.min(...xs)-minX)/width*(samples-1)-1e-8));
    const end=Math.min(samples-1,Math.floor((Math.max(...xs)-minX)/width*(samples-1)+1e-8));
    for(let j=start;j<=end;j++){
      const x=minX+width*j/(samples-1);
      for(let k=0;k<3;k++){
        const n=(k+1)%3,dx=xs[n]-xs[k];
        if(Math.abs(dx)<1e-10){
          if(Math.abs(x-xs[k])<1e-8){low[j]=Math.min(low[j],ys[k],ys[n]);high[j]=Math.max(high[j],ys[k],ys[n]);}
        }else{
          const t=(x-xs[k])/dx;
          if(t>=-1e-8&&t<=1+1e-8){const y=ys[k]+t*(ys[n]-ys[k]);low[j]=Math.min(low[j],y);high[j]=Math.max(high[j],y);}
        }
      }
    }
  }
  const top=new Float64Array(samples).fill(NaN),bottom=new Float64Array(samples).fill(NaN);
  for(let j=0;j<samples;j++){
    const x=Math.max(0,Math.min(mask.width-1,Math.round(bounds.x+bounds.w*j/(samples-1))));
    let first=-1,last=-1;
    for(let y=Math.max(0,Math.floor(bounds.y));y<Math.min(mask.height,Math.ceil(bounds.y+bounds.h));y++){
      if(mask.data[(y*mask.width+x)*4+3]>=128){if(first<0)first=y;last=y;}
    }
    if(first>=0){top[j]=clamp((first-bounds.y)/bounds.h);bottom[j]=clamp((last+1-bounds.y)/bounds.h);}
  }
  const repair=a=>{
    const valid=[];for(let j=0;j<a.length;j++)if(Number.isFinite(a[j]))valid.push(j);
    if(!valid.length)throw new Error('Missing panel boundary');
    for(let j=0;j<valid[0];j++)a[j]=a[valid[0]];
    for(let k=1;k<valid.length;k++){const l=valid[k-1],r=valid[k];for(let j=l+1;j<r;j++)a[j]=a[l]+(a[r]-a[l])*(j-l)/(r-l);}
    for(let j=valid.at(-1)+1;j<a.length;j++)a[j]=a[valid.at(-1)];
  };
  [low,high,top,bottom].forEach(repair);
  const at=(a,u)=>{const p=clamp(u)*(samples-1),i=Math.min(samples-2,Math.floor(p));return a[i]+(a[i+1]-a[i])*(p-i);};
  const result=new Float32Array(positions.length/3*2);
  for(let i=0,j=0;i<positions.length;i+=3,j+=2){
    const physicalU=clamp((positions[i]-minX)/width),u=zone==='Back'?1-physicalU:physicalU;
    const lo=at(low,physicalU),hi=at(high,physicalU);
    const fraction=clamp((hi-positions[i+1])/Math.max(1e-8,hi-lo));
    const t=at(top,u)+fraction*(at(bottom,u)-at(top,u));
    result[j]=u;result[j+1]=1-t;
  }
  return result;
}
