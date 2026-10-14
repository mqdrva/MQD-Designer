export const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function cropGeometry(width,height,cutout,state){
 const scale=(cutout?Math.min(500/width,500/height):Math.max(500/width,500/height))*state.zoom;
 const w=width*scale,h=height*scale,rx=Math.max(0,(w-500)/2),ry=Math.max(0,(h-500)/2);
 return {w,h,rx,ry,x:(500-w)/2+state.panX*rx,y:(500-h)/2+state.panY*ry};
}
// Keep the image point under the gesture midpoint fixed while zooming and dragging.
export function transformCrop(width,height,cutout,state,from,to,factor=1){
 const old=cropGeometry(width,height,cutout,state),next={...state,zoom:clamp(state.zoom*factor,1,3)};
 const g=cropGeometry(width,height,cutout,next),ratio=next.zoom/state.zoom;
 next.panX=g.rx?clamp((to.x-(from.x-old.x)*ratio-(500-g.w)/2)/g.rx,-1,1):0;
 next.panY=g.ry?clamp((to.y-(from.y-old.y)*ratio-(500-g.h)/2)/g.ry,-1,1):0;
 return next;
}
