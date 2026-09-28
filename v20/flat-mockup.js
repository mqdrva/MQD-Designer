// Independent flat preview: never changes design state, production masks or 3D UVs.
export function drawFlatTshirt(canvas,side,zoneCanvas){
  const c=canvas.getContext('2d'),back=side==='Back';
  c.clearRect(0,0,canvas.width,canvas.height);
  c.fillStyle='#f7f7f7';c.fillRect(0,0,canvas.width,canvas.height);
  c.save();c.scale(canvas.width/800,canvas.height/900);
  c.translate(0,90);c.scale(1,.8);
  const panel=(path,zone,box,angle=0)=>{
    c.save();c.beginPath();path(c);c.clip();
    c.translate(box[0],box[1]);c.rotate(angle);
    c.drawImage(zoneCanvas(zone),0,0,box[2],box[3]);c.restore();
    c.save();c.beginPath();path(c);c.strokeStyle='#00000030';c.lineWidth=1.5;c.stroke();c.restore();
  };
  const left=c=>{c.moveTo(267,184);c.lineTo(162,227);c.lineTo(77,385);c.lineTo(189,443);c.lineTo(247,339);c.bezierCurveTo(261,302,269,251,267,184);c.closePath();};
  const right=c=>{c.moveTo(533,184);c.lineTo(638,227);c.lineTo(723,385);c.lineTo(611,443);c.lineTo(553,339);c.bezierCurveTo(539,302,531,251,533,184);c.closePath();};
  // Wearer's right appears on the viewer's left in the front view.
  panel(left,back?'Left Sleeve':'Right Sleeve',[185,138,170,310],.48);
  panel(right,back?'Right Sleeve':'Left Sleeve',[450,214,170,310],-.48);
  const body=c=>{
    c.moveTo(325,163);c.lineTo(267,184);
    c.bezierCurveTo(269,251,261,302,247,339);
    c.lineTo(239,752);c.quadraticCurveTo(400,770,561,752);
    c.lineTo(553,339);c.bezierCurveTo(539,302,531,251,533,184);
    c.lineTo(475,163);c.bezierCurveTo(466,back?202:263,334,back?202:263,325,163);c.closePath();
  };
  panel(body,side,[239,163,322,600]);
  const collar=c=>{
    c.moveTo(325,163);c.bezierCurveTo(334,back?202:263,466,back?202:263,475,163);
    c.lineTo(461,160);c.bezierCurveTo(452,back?180:238,348,back?180:238,339,160);c.closePath();
  };
  panel(collar,'Collar',[325,160,150,back?32:82]);
  c.strokeStyle='#00000025';c.lineWidth=1;
  c.beginPath();c.moveTo(241,738);c.quadraticCurveTo(400,756,559,738);c.stroke();
  c.restore();
}

const TOPS=new Set(['long-sleeve-tshirt','short-sleeve-polo','long-sleeve-polo','fleece-hoodie','lightweight-jacket','hood-mask-shirt','hooded-long-sleeve']);
export function flatViews(id){return id==='mask'?['Front']:id==='hat'?['Front','Top of Bill']:['Front','Back'];}
export function supportsFlatMockup(id){return id==='tshirt'||TOPS.has(id)||['shorts','sweat-pants','mask','hat'].includes(id);}

export function drawFlatGarment(canvas,id,side,zoneCanvas){
  if(id==='tshirt')return drawFlatTshirt(canvas,side,zoneCanvas);
  const c=canvas.getContext('2d'),back=side==='Back';
  c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#f7f7f7';c.fillRect(0,0,canvas.width,canvas.height);
  c.save();c.scale(canvas.width/800,canvas.height/900);
  const poly=points=>ctx=>{points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();};
  const stroke=path=>{c.save();c.beginPath();path(c);c.strokeStyle='#00000035';c.lineWidth=1.5;c.stroke();c.restore();};
  const panel=(path,zone,box,angle=0)=>{
    c.save();c.beginPath();path(c);c.clip();c.translate(box[0],box[1]);c.rotate(angle);
    c.drawImage(zoneCanvas(zone),0,0,box[2],box[3]);c.restore();stroke(path);
  };
  const sleeve=(points,zone,angle)=>{
    const cos=Math.cos(angle),sin=Math.sin(angle);
    const local=points.map(([x,y])=>[x*cos+y*sin,-x*sin+y*cos]);
    const xs=local.map(p=>p[0]),ys=local.map(p=>p[1]);
    const x=Math.min(...xs)-1,y=Math.min(...ys)-1,w=Math.max(...xs)-x+1,h=Math.max(...ys)-y+1;
    panel(poly(points),zone,[x*cos-y*sin,x*sin+y*cos,w,h],angle);
  };
  if(TOPS.has(id)){
    c.translate(0,90);c.scale(1,.8);
    const polo=id.includes('polo'),short=id==='short-sleeve-polo';
    const hood=['fleece-hoodie','lightweight-jacket','hood-mask-shirt','hooded-long-sleeve'].includes(id);
    const bulky=id==='fleece-hoodie'||id==='lightweight-jacket';
    const hem=bulky?735:715;
    const hoodPath=ctx=>{ctx.moveTo(307,251);ctx.bezierCurveTo(276,188,296,102,355,95);ctx.quadraticCurveTo(400,78,445,95);ctx.bezierCurveTo(504,102,524,188,493,251);ctx.quadraticCurveTo(400,303,307,251);ctx.closePath();};
    if(hood&&!back){
      panel(hoodPath,'Hood',[291,82,218,206]);
      // The opening is empty space; only the surrounding hood carries artwork.
      c.beginPath();c.moveTo(332,218);c.bezierCurveTo(317,171,329,116,400,109);c.bezierCurveTo(471,116,483,171,468,218);c.quadraticCurveTo(400,262,332,218);c.closePath();c.fillStyle='#f7f7f7';c.fill();
    }
    const sleeveLeft=short?[[270,231],[165,267],[82,405],[188,462],[270,380]]:[[270,231],[171,273],[61,691],[146,723],[270,380]];
    const sleeveRight=short?[[530,231],[635,267],[718,405],[612,462],[530,380]]:[[530,231],[629,273],[739,691],[654,723],[530,380]];
    // Fit the full sleeve artwork into a rotated sleeve frame, then clip its edges.
    sleeve(sleeveLeft,back?'Left Sleeve':'Right Sleeve',short?.48:.25);
    sleeve(sleeveRight,back?'Right Sleeve':'Left Sleeve',short?-.48:-.25);
    const body=ctx=>{
      ctx.moveTo(330,210);ctx.lineTo(270,231);ctx.quadraticCurveTo(270,304,250,361);
      ctx.lineTo(bulky?240:250,hem);ctx.quadraticCurveTo(400,hem+12,bulky?560:550,hem);
      ctx.lineTo(550,361);ctx.quadraticCurveTo(530,304,530,231);ctx.lineTo(470,210);
      ctx.bezierCurveTo(460,back?241:283,340,back?241:283,330,210);ctx.closePath();
    };
    panel(body,side,[bulky?240:250,210,bulky?320:300,hem-204]);
    if(polo){
      const collar=back?ctx=>{ctx.moveTo(330,210);ctx.quadraticCurveTo(400,241,470,210);ctx.lineTo(478,235);ctx.quadraticCurveTo(400,263,322,235);ctx.closePath();}:poly([[330,210],[400,252],[470,210],[494,257],[443,290],[400,252],[357,290],[306,257]]);
      panel(collar,'Collar',[306,210,188,80]);
      if(!back)stroke(ctx=>{ctx.moveTo(391,266);ctx.lineTo(391,342);ctx.lineTo(409,342);ctx.lineTo(409,266);});
    }else if(!hood){
      panel(ctx=>{ctx.moveTo(330,210);ctx.bezierCurveTo(340,back?241:283,460,back?241:283,470,210);ctx.lineTo(457,209);ctx.bezierCurveTo(449,back?224:260,351,back?224:260,343,209);ctx.closePath();},'Collar',[330,209,140,back?27:59]);
    }
    if(id==='lightweight-jacket'&&!back){
      stroke(ctx=>{ctx.moveTo(398,261);ctx.lineTo(398,hem);ctx.moveTo(402,261);ctx.lineTo(402,hem);});
      stroke(ctx=>{ctx.moveTo(285,553);ctx.lineTo(271,630);ctx.moveTo(515,553);ctx.lineTo(529,630);});
    }
    if(hood&&back)panel(hoodPath,'Hood',[291,82,218,206]);
    if(id==='hood-mask-shirt'&&!back){
      panel(ctx=>{ctx.moveTo(335,204);ctx.quadraticCurveTo(400,181,465,204);ctx.lineTo(455,272);ctx.quadraticCurveTo(400,305,345,272);ctx.closePath();},'Built-In Mask',[335,191,130,110]);
    }
    stroke(ctx=>{ctx.moveTo(bulky?242:252,hem-12);ctx.quadraticCurveTo(400,hem,bulky?558:548,hem-12);});
  }else if(id==='shorts'||id==='sweat-pants'){
    const pants=id==='sweat-pants',top=pants?120:240,bottom=pants?785:665,crotch=pants?403:458;
    const shape=ctx=>{ctx.moveTo(246,top);ctx.quadraticCurveTo(400,top+18,554,top);ctx.lineTo(pants?584:600,bottom);ctx.lineTo(pants?436:428,bottom);ctx.lineTo(400,crotch);ctx.lineTo(pants?364:372,bottom);ctx.lineTo(pants?216:200,bottom);ctx.closePath();};
    panel(shape,side,[pants?216:200,top,pants?368:400,bottom-top]);
    stroke(ctx=>{ctx.moveTo(245,top+28);ctx.quadraticCurveTo(400,top+46,555,top+28);ctx.moveTo(400,top+32);ctx.lineTo(400,crotch);});
    if(!back)stroke(ctx=>{ctx.moveTo(388,top+32);ctx.lineTo(380,top+108);ctx.moveTo(412,top+32);ctx.lineTo(420,top+108);});
    stroke(ctx=>{ctx.moveTo(pants?217:202,bottom-17);ctx.lineTo(pants?364:373,bottom-17);ctx.moveTo(pants?436:427,bottom-17);ctx.lineTo(pants?583:598,bottom-17);});
  }else if(id==='mask'){
    c.strokeStyle='#b0b0b0';c.lineWidth=9;
    for(const x of [182,618]){c.beginPath();c.ellipse(x,450,72,100,0,0,Math.PI*2);c.stroke();}
    panel(ctx=>{ctx.moveTo(212,363);ctx.quadraticCurveTo(400,279,588,363);ctx.lineTo(584,521);ctx.quadraticCurveTo(400,627,216,521);ctx.closePath();},'Entire Mask',[208,310,384,280]);
    stroke(ctx=>{ctx.moveTo(229,387);ctx.quadraticCurveTo(400,327,571,387);ctx.moveTo(231,502);ctx.quadraticCurveTo(400,586,569,502);});
  }else if(id==='hat'){
    const bill=ctx=>{ctx.moveTo(243,441);ctx.quadraticCurveTo(400,389,557,441);ctx.bezierCurveTo(622,501,657,595,602,625);ctx.quadraticCurveTo(400,710,198,625);ctx.bezierCurveTo(143,595,178,501,243,441);ctx.closePath();};
    if(side==='Top of Bill')panel(bill,'Top of Bill',[160,400,480,280]);
    else{
      panel(ctx=>{ctx.moveTo(235,487);ctx.bezierCurveTo(226,355,256,244,400,244);ctx.bezierCurveTo(544,244,574,355,565,487);ctx.quadraticCurveTo(400,529,235,487);ctx.closePath();},'Front Panel',[231,244,338,274]);
      panel(ctx=>{ctx.moveTo(235,480);ctx.quadraticCurveTo(400,512,565,480);ctx.quadraticCurveTo(650,559,578,581);ctx.quadraticCurveTo(400,630,222,581);ctx.quadraticCurveTo(150,559,235,480);ctx.closePath();},'Top of Bill',[191,480,418,125]);
      stroke(ctx=>{ctx.moveTo(400,245);ctx.lineTo(400,490);});
    }
  }
  c.restore();
}

export function installFlatMockup({getProduct,drawZone}){
  const pane=document.getElementById('previewPane');
  const buttons=pane.querySelectorAll('.seg button');
  const three=buttons[0],flat=buttons[1];
  const wrap=document.createElement('div');wrap.className='flat-mockup';wrap.hidden=true;
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=900;
  canvas.setAttribute('role','img');
  const switcher=document.createElement('div');switcher.className='flat-mockup-sides';
  let side='Front',enabled=false,frame=0,lastProduct='';
  const sideButtons=['Front','Back'].map(label=>{
    const b=document.createElement('button');b.type='button';b.textContent=label;
    b.onclick=()=>{side=label;render();};switcher.append(b);return b;
  });
  wrap.append(canvas,switcher);pane.append(wrap);
  function render(){
    if(!enabled)return;
    canvas.setAttribute('aria-label',getProduct().name+' '+side.toLowerCase()+' flat mockup');
    sideButtons.forEach(b=>{b.classList.toggle('active',b.textContent===side);b.setAttribute('aria-pressed',String(b.textContent===side));});
    const textures=new Map();
    drawFlatGarment(canvas,getProduct().id,side,zone=>{
      if(!textures.has(zone))textures.set(zone,drawZone(zone));return textures.get(zone);
    });
  }
  function select(value){
    enabled=value&&supportsFlatMockup(getProduct().id);wrap.hidden=!enabled;
    pane.classList.toggle('show-flat-mockup',enabled);
    three.classList.toggle('active',!enabled);flat.classList.toggle('active',enabled);
    three.setAttribute('aria-pressed',String(!enabled));flat.setAttribute('aria-pressed',String(enabled));
    document.getElementById('saveScreenshot').title='Save the current preview as a PNG';
    document.getElementById('shareScreenshot').title='Share the current preview';
    render();
  }
  three.addEventListener('click',()=>select(false));flat.addEventListener('click',()=>select(true));
  function update(){
    const id=getProduct().id,supported=supportsFlatMockup(id);flat.disabled=!supported;
    if(lastProduct!==id){
      lastProduct=id;side='Front';const views=flatViews(id);
      sideButtons.forEach((b,i)=>{b.hidden=!views[i];b.textContent=views[i]||'';b.onclick=()=>{side=views[i];render();};});
      switcher.hidden=views.length===1;
    }
    flat.title=supported?'View your flat garment mockup':'Flat mockups for this garment are coming soon';
    if(!supported&&enabled)select(false);
    if(enabled&&!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
  }
  update();
  return {update,isActive:()=>enabled,capture:()=>new Promise(resolve=>{render();canvas.toBlob(resolve,'image/png');})};
}
