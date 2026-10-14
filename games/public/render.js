const cache=new Map();async function image(src){if(!cache.has(src)){cache.set(src,new Promise((yes,no)=>{const im=new Image();im.onload=()=>yes(im);im.onerror=no;if(/^https?:/.test(src))im.crossOrigin='anonymous';im.src=src}))}return cache.get(src)}
const model={tshirt:'tshirt','long-sleeve-tshirt':'long-sleeve','fleece-hoodie':'hoodie'};
let generation=0;
function fit(ctx,img,x,y,w,h){const r=Math.min(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*r)/2,y+(h-img.height*r)/2,img.width*r,img.height*r)}
function lines(ctx,text,x,y,w,size=26){ctx.font=`800 ${size}px system-ui`;ctx.textAlign='center';const words=text.split(/\s+/),out=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>w&&line){out.push(line);line=word}else line=next}if(line)out.push(line);out.forEach((v,i)=>ctx.fillText(v,x,y+(i-(out.length-1)/2)*size*1.15,w))}
async function art(ctx,c,x,y,w,h){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.fillStyle=c.ink||'#d58665';if(c.kind==='photo')fit(ctx,await image(c.photo.url),x+5,y+5,w-10,h-10);else if(c.kind==='text')lines(ctx,c.text,x+w/2,y+h/2,w-12,22);else {const scale=Math.min(w,h)*.75;ctx.translate(x+w/2-scale/2,y+h/2-scale/2);ctx.scale(scale/100,scale/100);if(c.kind==='sun'){ctx.beginPath();ctx.arc(50,48,32,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff8ea';ctx.lineWidth=4;for(const yy of [48,60,72]){ctx.beginPath();ctx.moveTo(yy===72?28:yy===60?20:16,yy);ctx.lineTo(yy===72?72:yy===60?80:84,yy);ctx.stroke()}}else ctx.fill(new Path2D(c.kind==='star'?'m50 8 12 28 31 3-23 21 7 31-27-16-27 16 7-31L7 39l31-3Z':'M7 65Q28 69 42 44T72 24Q55 52 78 57Q89 60 96 51Q89 80 61 73Q41 68 46 52Q24 81 7 65Z'));}ctx.restore()}
// Face centers have clear feature space; only outer edges overlap.
export function faceRepeatLayout(photos,side='front'){
 const tiles=[];let n=side==='front'?0:3;
 for(let row=-1;row<7;row++)for(let col=-1;col<7;col++){
  const index=n++,photo=photos[index%photos.length];if(!photo)continue;
  const w=[142,154,166][(row+col+12)%3],h=Math.min(258,w*photo.height/photo.width);
  tiles.push({photo,x:col*145+(row%2?72:0)+70,y:row*185+95,w,h,angle:[-.12,.09,-.04,.13][index%4]});
 }
 return tiles;
}
function featurePolygon(t){const points=[[-.34,-.17],[.34,-.17],[.34,.39],[-.34,.39]];return points.map(([x,y])=>({x:t.x+x*t.w*Math.cos(t.angle)-y*t.h*Math.sin(t.angle),y:t.y+x*t.w*Math.sin(t.angle)+y*t.h*Math.cos(t.angle)}))}
const trimmedFaces=new Map();
async function trimFace(photo){
 if(!photo.cutout)return {...photo,bitmap:await image(photo.url)};
 if(trimmedFaces.has(photo.url))return trimmedFaces.get(photo.url);
 const img=await image(photo.url),c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;let left=c.width,right=-1,top=c.height,bottom=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>12){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right<left)return {...photo,bitmap:img};const out=document.createElement('canvas');out.width=right-left+1;out.height=bottom-top+1;out.getContext('2d').drawImage(c,left,top,out.width,out.height,0,0,out.width,out.height);const face={...photo,width:out.width,height:out.height,bitmap:out};trimmedFaces.set(photo.url,face);return face;
}
async function faceRepeat(ctx,photos,side){
 photos=await Promise.all(photos.map(trimFace));const protectedFeatures=[];
 for(const t of faceRepeatLayout(photos,side)){
  ctx.save();ctx.beginPath();ctx.rect(-1000,-1000,3000,3000);
  // Preserve every already-painted face's eyes and mouth when later hair overlaps.
  for(const polygon of protectedFeatures){ctx.moveTo(polygon[0].x,polygon[0].y);for(const p of polygon.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath()}
  ctx.clip('evenodd');ctx.translate(t.x,t.y);ctx.rotate(t.angle);fit(ctx,t.photo.bitmap,-t.w/2,-t.h/2,t.w,t.h);ctx.restore();
  protectedFeatures.push(featurePolygon(t));
 }
}
export async function renderArtwork(canvas,game,{side='front',color=game.color,resultIndex=0,resultText=null,draft=null}={}){
 const ctx=canvas.getContext('2d');ctx.save();ctx.scale(canvas.width/800,canvas.height/900);ctx.fillStyle=color;ctx.fillRect(0,0,800,900);
 const participants=game.participants;const revealed=game.status==='revealed';
 const usable=participants.filter(p=>p.contribution&&!p.removed);
 if(revealed&&game.type==='faces'){
  const photos=usable.map(p=>p.contribution.photo).filter(Boolean);if(photos.length)await faceRepeat(ctx,photos,side);
 }else if(revealed&&game.type==='birthday'){
  ctx.fillStyle=color==='#171717'?'#f4c4a3':'#563c36';lines(ctx,game.birthdayName.toUpperCase(),400,250,360,48);lines(ctx,game.tone==='roast'?'LATE, BUT LEGENDARY':'CELEBRATE YOU',400,305,350,22);
  const cols=2,rows=Math.ceil(usable.length/cols);for(let i=0;i<usable.length;i++){const c=usable[i].contribution;await art(ctx,c,240+(i%cols)*160,350+Math.floor(i/cols)*Math.min(150,350/rows),150,Math.min(140,340/rows));}
 }else if(revealed&&game.type==='picked'){
  const result=game.results[resultIndex];const saying=resultText??game.sayings[result?.saying]??'Choose your own title';ctx.fillStyle=['#ffffff','#e8d7be','#efb5c6','#a4a4a4'].includes(color)?'#252525':'#fff6e9';lines(ctx,saying,400,390,325,34);
 }else{
  const count=participants.length,rows=Math.ceil(count/2),w=155,h=420/rows;
  for(let i=0;i<count;i++){const x=240+(i%2)*165,y=250+Math.floor(i/2)*h;let c=revealed?participants[i].contribution:null;if(!revealed&&i===game.self)c=draft;
   if(c&&(c.side==='both'||c.side===side))await art(ctx,c,x,y,w,h-12);
   else if(!revealed){ctx.fillStyle='#e4e0db';ctx.fillRect(x,y,w,h-12);ctx.fillStyle='#625c55';lines(ctx,'Reserved— surprise inside',x+w/2,y+(h-12)/2,w-15,15);}
  }
 }
 ctx.restore();return canvas;
}
export async function renderGame(canvas,game,{side='front',product='tshirt',color=game.color,resultIndex=0,resultText=null,draft=null}={}){
 const version=++generation,work=document.createElement('canvas');work.width=800;work.height=900;
 await renderArtwork(work,game,{side,color,resultIndex,resultText,draft});const ctx=work.getContext('2d');
 const garment=await image(`/models/${model[product]}-${side}.png`);ctx.globalCompositeOperation='destination-in';ctx.drawImage(garment,0,0,800,900);ctx.globalCompositeOperation='multiply';ctx.drawImage(garment,0,0,800,900);ctx.globalCompositeOperation='source-over';if(version!==generation)return;const out=canvas.getContext('2d');out.clearRect(0,0,800,900);out.drawImage(work,0,0);
}
