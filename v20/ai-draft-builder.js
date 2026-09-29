import {sanitizePlan,productForPlan,AI_FONTS} from './ai-design-contract.js';

export function buildDraftPayload(plan,assets,current){
  const safe=sanitizePlan(plan);
  const product=productForPlan(safe.productId);
  const kinds=new Set(safe.zones.flatMap(zone=>zone.elements.map(el=>el.kind)));
  const missing=['logo','artwork'].filter(kind=>kinds.has(kind)&&!assets[kind]?.src);
  if(missing.length)throw new Error(`Upload ${missing.map(kind=>kind==='logo'?'your logo':'the background image from ChatGPT').join(' and ')} before applying this draft. Your current design has not changed.`);
  const existingZones=current?.product?.id===safe.productId?current.design?.zones||{}:{};
  const design={zones:{}};
  for(const row of safe.zones){
    const preserved=(existingZones[row.zone]?.layers||[]).filter(layer=>!layer.aiManaged);
    if(preserved.length+row.elements.length>6)throw new Error(`${row.zone} would exceed six layers. Remove an unneeded layer before applying; your current design has not changed.`);
    const layers=row.elements.map((el,index)=>{
      const base={id:`ai-${row.zone.replaceAll(' ','-')}-${index}`,x:el.x,y:el.y,scale:el.scale,rotation:el.rotation,visible:true,aiManaged:true,aiZone:row.zone};
      if(el.kind==='text')return {...base,type:'text',label:'AI Text',text:el.text,color:el.color,font:AI_FONTS.includes(el.font)?el.font:'Inter',strokeColor:el.strokeColor,strokeWidth:el.strokeWidth,letterSpacing:el.letterSpacing,bold:el.bold,italic:el.italic,align:el.align};
      const asset=assets[el.kind];
      // The editor's image scale uses cover-fit, which can crop wide logos.
      // Interpret AI logo scale relative to contain-fit in the import payload only.
      let scale=base.scale;
      if(el.kind==='logo'){
        const frame=current?.product?.id===safe.productId?current.templates?.[row.zone]:null;
        if(!frame?.width||!frame?.height||!asset.width||!asset.height)throw new Error('Select this draft’s garment and upload your logo again before applying. Its image dimensions are required for safe sizing.');
        const fit=Math.min(frame.width/asset.width,frame.height/asset.height);
        const cover=Math.max(frame.width/asset.width,frame.height/asset.height);
        scale=Math.max(.01,Math.min(.8,base.scale)*fit/cover);
      }
      return {...base,scale,type:'image',label:el.kind==='logo'?'AI Logo':'AI Background',filename:asset.filename,src:asset.src,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},aiAssetKind:el.kind};
    });
    layers.sort((a,b)=>(a.aiAssetKind==='artwork'?0:1)-(b.aiAssetKind==='artwork'?0:1));
    design.zones[row.zone]={background:row.background,layers:[...layers,...preserved]};
  }
  return {schema:'mqd-design-v1',product:{id:product.id},activeZone:safe.zones.find(z=>z.elements.length)?.zone||product.zones[0],design};
}
