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

export function installFlatMockup({getProduct,drawZone}){
  const pane=document.getElementById('previewPane');
  const buttons=pane.querySelectorAll('.seg button');
  const three=buttons[0],flat=buttons[1];
  const wrap=document.createElement('div');wrap.className='flat-mockup';wrap.hidden=true;
  const canvas=document.createElement('canvas');canvas.width=800;canvas.height=900;
  canvas.setAttribute('role','img');
  const switcher=document.createElement('div');switcher.className='flat-mockup-sides';
  let side='Front',enabled=false,frame=0;
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
    drawFlatTshirt(canvas,side,zone=>{
      if(!textures.has(zone))textures.set(zone,drawZone(zone));return textures.get(zone);
    });
  }
  function select(value){
    enabled=value&&getProduct().id==='tshirt';wrap.hidden=!enabled;
    pane.classList.toggle('show-flat-mockup',enabled);
    three.classList.toggle('active',!enabled);flat.classList.toggle('active',enabled);
    three.setAttribute('aria-pressed',String(!enabled));flat.setAttribute('aria-pressed',String(enabled));
    document.getElementById('saveScreenshot').title='Save the current preview as a PNG';
    document.getElementById('shareScreenshot').title='Share the current preview';
    render();
  }
  three.addEventListener('click',()=>select(false));flat.addEventListener('click',()=>select(true));
  function update(){
    const supported=getProduct().id==='tshirt';flat.disabled=!supported;
    flat.title=supported?'View your flat garment mockup':'Flat mockups for this garment are coming soon';
    if(!supported&&enabled)select(false);
    if(enabled&&!frame)frame=requestAnimationFrame(()=>{frame=0;render();});
  }
  update();
  return {update,isActive:()=>enabled,capture:()=>new Promise(resolve=>{render();canvas.toBlob(resolve,'image/png');})};
}
