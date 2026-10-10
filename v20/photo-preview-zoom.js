// View-only zoom: the canvas pixels, uploaded photo and exported PNG stay unchanged.
export function installPhotoPreviewZoom(canvas, hasImage) {
  const frame = canvas.parentElement, points = new Map();
  let scale = 1, x = 0, y = 0, gesture = null, lastTap = 0;
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  function paint() {
    x = clamp(x, canvas.clientWidth * (1-scale), 0);
    y = clamp(y, canvas.clientHeight * (1-scale), 0);
    canvas.style.transformOrigin = '0 0';
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    canvas.style.touchAction = hasImage() ? 'none' : 'auto';
  }
  function local(event) { const r = frame.getBoundingClientRect(); return {x:event.clientX-r.left, y:event.clientY-r.top}; }
  function begin() {
    const p = [...points.values()];
    if (p.length >= 2) {
      const mid = {x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
      gesture = {mode:'pinch', distance:Math.max(1, Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)), scale, anchorX:(mid.x-x)/scale, anchorY:(mid.y-y)/scale};
    } else if (p.length) gesture = {mode:'pan', point:p[0], x, y};
    else gesture = null;
  }
  canvas.addEventListener('pointerdown', event => {
    if (!hasImage() || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); points.set(event.pointerId, local(event)); canvas.setPointerCapture(event.pointerId); begin();
    if (points.size > 1) lastTap = 0;
  });
  canvas.addEventListener('pointermove', event => {
    if (!points.has(event.pointerId)) return;
    event.preventDefault(); points.set(event.pointerId, local(event));
    const p = [...points.values()];
    if (gesture?.mode === 'pinch' && p.length >= 2) {
      scale = clamp(gesture.scale * Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y) / gesture.distance, 1, 4);
      x = (p[0].x+p[1].x)/2 - gesture.anchorX*scale;
      y = (p[0].y+p[1].y)/2 - gesture.anchorY*scale;
    } else if (gesture?.mode === 'pan' && scale > 1) {
      x = gesture.x+p[0].x-gesture.point.x; y = gesture.y+p[0].y-gesture.point.y;
    }
    paint();
  });
  function end(event) {
    if (!points.has(event.pointerId)) return;
    const tap = gesture?.mode === 'pan' && points.size === 1 && Math.hypot(local(event).x-gesture.point.x,local(event).y-gesture.point.y) < 8;
    points.delete(event.pointerId); begin();
    if (event.type === 'pointerup' && tap) {
      const now = Date.now(); if (lastTap && now-lastTap < 350) { reset(); lastTap=0; } else lastTap=now;
    }
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,end);
  canvas.addEventListener('wheel', event => {
    if (!hasImage() || !event.ctrlKey) return;
    event.preventDefault(); const p=local(event), next=clamp(scale*Math.exp(-event.deltaY*.01),1,4);
    x=p.x-(p.x-x)*next/scale; y=p.y-(p.y-y)*next/scale; scale=next; paint();
  }, {passive:false});
  canvas.addEventListener('dblclick', () => { if (hasImage()) reset(); });
  function reset() { points.clear(); gesture=null; scale=1; x=0; y=0; paint(); }
  const observer = new ResizeObserver(paint); observer.observe(canvas);
  paint(); return {reset};
}
