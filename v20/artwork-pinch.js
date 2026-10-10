// Resizes the selected design layer in inches, preserving aspect ratio and center.
export function pinchPlacement(original, factor, zone) {
  const ratio=original.height/original.width;
  const width=Math.min(Math.max(.1,original.width*factor),zone.width,zone.height/ratio), height=width*ratio;
  return {width,height,x:Math.max(0,Math.min(zone.width-width,original.x+(original.width-width)/2)),y:Math.max(0,Math.min(zone.height-height,original.y+(original.height-height)/2))};
}
export function installArtworkPinch(canvas, {selection, apply, cancelDrag}) {
  const points=new Map(); let gesture=null, finishing=false;
  const distance=()=>{const p=[...points.values()];return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);};
  function consume(event){event.preventDefault();event.stopImmediatePropagation();cancelDrag();}
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='touch')return;
    points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(points.size>=2){
      consume(event); canvas.setPointerCapture(event.pointerId);
      if(points.size===2&&!finishing){const current=selection(),d=distance();if(current&&d>0)gesture={...current,placement:{...current.placement},distance:d};}
    }
  },true);
  canvas.addEventListener('pointermove',event=>{
    if(!points.has(event.pointerId))return;
    points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(points.size>=2||finishing){
      consume(event);
      if(gesture&&points.size===2){const current=selection();if(current?.key===gesture.key)apply(pinchPlacement(gesture.placement,distance()/gesture.distance,current.zone),gesture.key);else {gesture=null;finishing=true;}}
    }
  },true);
  function end(event){
    if(!points.has(event.pointerId))return;
    const wasPinching=points.size>=2||!!gesture||finishing;
    points.delete(event.pointerId);
    if(wasPinching){consume(event);gesture=null;finishing=points.size>0;}
    if(!points.size)finishing=false;
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,end,true);
}
