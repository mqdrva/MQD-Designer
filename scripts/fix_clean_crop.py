from pathlib import Path

p=Path('v20/editor.js')
s=p.read_text()

old="""function drawImageLayer(c,l,b){
  if(!l.image)return;
  const crop=l.crop||{left:0,top:0,right:0,bottom:0};
  const left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
  const sx=l.image.width*left,sy=l.image.height*top,sw=Math.max(1,l.image.width*(1-left-right)),sh=Math.max(1,l.image.height*(1-top-bottom));
  const base=Math.max(b.w/sw,b.h/sh),scale=base*(l.scale||1),iw=sw*scale,ih=sh*scale;
  c.scale(l.flipX?-1:1,l.flipY?-1:1);
  c.drawImage(l.image,sx,sy,sw,sh,-iw/2,-ih/2,iw,ih);
}"""
new="""function drawImageLayer(c,l,b){
  if(!l.image)return;
  const crop=l.crop||{left:0,top:0,right:0,bottom:0};
  const left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
  const fullW=Math.max(1,l.image.width),fullH=Math.max(1,l.image.height);
  const sx=fullW*left,sy=fullH*top,sw=Math.max(1,fullW*(1-left-right)),sh=Math.max(1,fullH*(1-top-bottom));
  const base=Math.max(b.w/fullW,b.h/fullH),scale=base*(l.scale||1),iw=fullW*scale,ih=fullH*scale;
  const dx=-iw/2+iw*left,dy=-ih/2+ih*top,dw=iw*(1-left-right),dh=ih*(1-top-bottom);
  c.scale(l.flipX?-1:1,l.flipY?-1:1);
  c.drawImage(l.image,sx,sy,sw,sh,dx,dy,dw,dh);
}"""
if old not in s: raise SystemExit('drawImageLayer block not found')
s=s.replace(old,new,1)

old="""  if(l.type==='image'&&l.image){const crop=l.crop||{left:0,top:0,right:0,bottom:0},left=Number(crop.left)||0,top=Number(crop.top)||0,right=Number(crop.right)||0,bottom=Number(crop.bottom)||0,sw=Math.max(1,l.image.width*(1-left-right)),sh=Math.max(1,l.image.height*(1-top-bottom)),base=Math.max(b.w/sw,b.h/sh),scale=base*(l.scale||1);return{x:cx-sw*scale/2,y:cy-sh*scale/2,w:sw*scale,h:sh*scale,cx,cy,b};}"""
new="""  if(l.type==='image'&&l.image){
    const crop=l.crop||{left:0,top:0,right:0,bottom:0},left=Math.max(0,Math.min(.45,Number(crop.left)||0)),top=Math.max(0,Math.min(.45,Number(crop.top)||0)),right=Math.max(0,Math.min(.45,Number(crop.right)||0)),bottom=Math.max(0,Math.min(.45,Number(crop.bottom)||0));
    const fullW=Math.max(1,l.image.width),fullH=Math.max(1,l.image.height),base=Math.max(b.w/fullW,b.h/fullH),scale=base*(l.scale||1),iw=fullW*scale,ih=fullH*scale;
    const x=cx-iw/2+iw*left,y=cy-ih/2+ih*top,w=iw*(1-left-right),h=ih*(1-top-bottom);
    return{x,y,w,h,cx,cy,b,fullW:iw,fullH:ih,crop};
  }"""
if old not in s: raise SystemExit('activeLayerScreenRect image block not found')
s=s.replace(old,new,1)

old="""else if(dragState.mode==='crop'&&l.type==='image'){const c={...dragState.crop},fx=dx/Math.max(40,q.w),fy=dy/Math.max(40,q.h),corner=dragState.corner;if(corner.includes('l'))c.left=Math.max(0,Math.min(.45,(dragState.crop.left||0)+fx));if(corner.includes('r'))c.right=Math.max(0,Math.min(.45,(dragState.crop.right||0)-fx));if(corner.includes('t'))c.top=Math.max(0,Math.min(.45,(dragState.crop.top||0)+fy));if(corner.includes('b'))c.bottom=Math.max(0,Math.min(.45,(dragState.crop.bottom||0)-fy));if(c.left+c.right<.9&&c.top+c.bottom<.9)l.crop=c;}"""
new="""else if(dragState.mode==='crop'&&l.type==='image'){const c={...dragState.crop},fx=dx/Math.max(40,q.fullW||q.w),fy=dy/Math.max(40,q.fullH||q.h),corner=dragState.corner;if(corner.includes('l'))c.left=Math.max(0,Math.min(.45,(dragState.crop.left||0)+fx));if(corner.includes('r'))c.right=Math.max(0,Math.min(.45,(dragState.crop.right||0)-fx));if(corner.includes('t'))c.top=Math.max(0,Math.min(.45,(dragState.crop.top||0)+fy));if(corner.includes('b'))c.bottom=Math.max(0,Math.min(.45,(dragState.crop.bottom||0)-fy));if(c.left+c.right<.9&&c.top+c.bottom<.9)l.crop=c;}"""
if old not in s: raise SystemExit('crop pointer math block not found')
s=s.replace(old,new,1)

old="""new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});if(product.id==='tshirt'){const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);}rebuildGarmentPreview();},undefined,e=>console.error(e));}"""
new="""new GLTFLoader().load(product.model,g=>{garment=g.scene;scene.add(garment);fitGarment();garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.color)m.color.set('#f5f5f5');m.needsUpdate=true;});});if(product.id==='tshirt'){
    garment.traverse(o=>{if(!o.isMesh)return;const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{for(const key of['map','emissiveMap','alphaMap'])if(m[key])m[key]=null;if(m.color)m.color.set('#ffffff');m.needsUpdate=true;});});
    const source=findPrimaryMesh(garment);if(source)splitTshirtGeometry(source);
  }rebuildGarmentPreview();},undefined,e=>console.error(e));}"""
if old not in s: raise SystemExit('loadGarment block not found')
s=s.replace(old,new,1)

p.write_text(s)
