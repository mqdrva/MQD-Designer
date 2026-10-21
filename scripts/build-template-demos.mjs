import fs from 'node:fs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {GARMENT_MAPPING} from '../v20/garment-mapping-catalog.js';
const dir='assets/template-demos';fs.mkdirSync(dir,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('docs/template-backgrounds.json','utf8'));
const definitions=manifest.slots;
if(definitions.length!==15)throw new Error('The existing collection must contain all fifteen supplied background options.');
function png(name,w,h,draw){const canvas=createCanvas(w,h);draw(canvas.getContext('2d'),w,h);fs.writeFileSync(dir+'/'+name,canvas.toBuffer('image/png'));return canvas;}
// Transparent logo slots keep starter garments free of sample branding.
png('blank-logo-slot.png',600,300,()=>{});
const social=createCanvas(900,240),socialContext=social.getContext('2d');
for(const [i,network] of ['instagram','facebook','google'].entries()){const icon=await loadImage(`${dir}/social-${network}.png`);socialContext.drawImage(icon,60+i*280,10,220,220);}
fs.writeFileSync(`${dir}/social-row.png`,social.toBuffer('image/png'));
png('demo-flag.png',360,210,(c,w,h)=>{c.fillStyle='#fff';c.fillRect(0,0,w,h);for(let i=0;i<7;i++){c.fillStyle='#c52539';c.fillRect(0,i*30,w,15);}c.fillStyle='#244670';c.fillRect(0,0,145,115);c.fillStyle='white';for(let y=0;y<4;y++)for(let x=0;x<5;x++)c.fillRect(12+x*26,12+y*25,8,8);});
const versions=[];
for(let i=0;i<definitions.length;i++){
 const {name,category,base,filename,textColor}=definitions[i],id='00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),versionId='10000000-0000-4000-8000-'+String(i+1).padStart(12,'0');

 const template=structuredClone(GARMENT_MAPPING.tshirt),zones={};const rules=[];
 const image=(id,label,src,x,y,scale,extra={})=>({id,type:'image',label,filename:src.split('/').at(-1),src,x,y,scale,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true,...extra});
 const services={
  'Pressure Washing':['PRESSURE WASHING','SOFT WASHING','& MORE!'],
  'Lawn Care':['LAWN MOWING','TRIMMING','& MORE!'],
  HVAC:['HEATING','COOLING','& MORE!'],
  'Pool Care':['POOL CLEANING','WATER CARE','& MORE!'],
  'General Business':['YOUR BUSINESS SERVICES','QUALITY SERVICE','& MORE!']
 }[category];
 const detail=(id,label,text,y,scale)=>({id,type:'text',label,text,x:0,y,scale,rotation:0,visible:true,color:textColor,font:'Impact',strokeColor:base,strokeWidth:2,bold:false,italic:false,align:'center'});
 for(const side of ['Front','Back']){
  const background=image(side+'-background','Background',`/assets/template-backgrounds/${filename}`,0,0,1,{flipX:side==='Back'&&definitions[i].mirrorPattern!==false});
  const logo=image(side+'-logo','Your logo',`/${dir}/blank-logo-slot.png`,0,side==='Front'?-30:-48,side==='Front'?.25:.16);
  const layers=[background,logo];
  rules.push({zone:side,layerId:background.id,role:'locked',label:side+' background'},{zone:side,layerId:logo.id,role:'logo',label:'Your logo'});
  if(side==='Back'){
   const social=image('Back-social','Instagram • Facebook • Google',`/${dir}/social-row.png`,0,-25,.055);
   const phone=detail('Back-phone','Phone number','888-888-8888',-13,.72);
   const line1=detail('Back-services','Services line 1',services[0],1,.62);
   const line2=detail('Back-services-2','Services line 2',services[1],12,.60);
   const line3=detail('Back-services-3','Services line 3',services[2],23,.58);
   layers.push(social,phone,line1,line2,line3);
   rules.push({zone:side,layerId:social.id,role:'artwork',label:'Social icons'},... [phone,line1,line2,line3].map(l=>({zone:side,layerId:l.id,role:'text',label:l.label})));
  }
  zones[side]={background:base,layers};
 }
 // Match the existing body artwork on both sleeves. Hem anchoring keeps the
 // grass/water detail visible on the wider sleeve panel without editing assets.
 for(const side of ['Left Sleeve','Right Sleeve']){
  const background=image(side.replace(' ','-')+'-background','Sleeve background',`/assets/template-backgrounds/${filename}`,0,manifest.sleeveBackground.y,1,{flipX:side==='Right Sleeve'&&definitions[i].mirrorPattern!==false});
  zones[side]={background:base,layers:[background]};
  rules.push({zone:side,layerId:background.id,role:'locked',label:side+' background'});
 }
 zones['Left Sleeve'].layers.push(image('sleeve-flag','Sleeve flag',`/${dir}/demo-flag.png`,0,0,.20));
 rules.push({zone:'Left Sleeve',layerId:'sleeve-flag',role:'locked',label:'Sleeve flag'});
 zones.Collar={background:base,layers:[]};
 const payload={schema:'mqd-design-v1',engine:{calibration:'v26-surface-uv-collar-strip'},product:{id:'tshirt',name:'All-Over Print T-Shirt',category:'T-Shirts',model:template.model},templates:template.templates,activeZone:'Front',design:{zones}};
 versions.push({id:versionId,template_id:id,name:'UNPUBLISHED · '+name,categories:[category],range:'Premium · All-over print',draftStatus:definitions[i].note,backgroundSource:filename,payload,rules,previews:{Front:`/${dir}/${i+1}-front.png`,Back:`/${dir}/${i+1}-back.png`,'Left Sleeve':`/${dir}/${i+1}-left-sleeve.png`,'Right Sleeve':`/${dir}/${i+1}-right-sleeve.png`}});
}
fs.writeFileSync('v20/template-demo.js','// Fifteen unpublished review fixtures with approved background originals. Never inserted into the public catalog.\nexport const demoVersions='+JSON.stringify(versions,null,2)+';\n');

await import('./render-template-demos.mjs');
