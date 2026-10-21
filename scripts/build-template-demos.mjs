import fs from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {GARMENT_MAPPING} from '../v20/garment-mapping-catalog.js';
const dir='assets/template-demos';fs.mkdirSync(dir,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('docs/template-backgrounds.json','utf8'));
const definitions=manifest.slots;
if(definitions.length!==5)throw new Error('The existing collection must contain exactly five starter drafts.');
function png(name,w,h,draw){const canvas=createCanvas(w,h);draw(canvas.getContext('2d'),w,h);fs.writeFileSync(dir+'/'+name,canvas.toBuffer('image/png'));return canvas;}
png('sample-logo.png',600,300,(c,w,h)=>{c.fillStyle='white';c.fillRect(0,0,w,h);c.strokeStyle='#222';c.lineWidth=10;c.strokeRect(7,7,w-14,h-14);c.fillStyle='#222';c.font='bold 58px Arial';c.textAlign='center';c.fillText('YOUR LOGO',w/2,170);});
png('demo-flag.png',360,210,(c,w,h)=>{c.fillStyle='#fff';c.fillRect(0,0,w,h);for(let i=0;i<7;i++){c.fillStyle='#c52539';c.fillRect(0,i*30,w,15);}c.fillStyle='#244670';c.fillRect(0,0,145,115);c.fillStyle='white';for(let y=0;y<4;y++)for(let x=0;x<5;x++)c.fillRect(12+x*26,12+y*25,8,8);});
const versions=[];
for(let i=0;i<definitions.length;i++){
 const {name,category,base,filename,textColor}=definitions[i],id='00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),versionId='10000000-0000-4000-8000-'+String(i+1).padStart(12,'0');

 const template=structuredClone(GARMENT_MAPPING.tshirt),zones={};const rules=[];
 const image=(id,label,src,x,y,scale,extra={})=>({id,type:'image',label,filename:src.split('/').at(-1),src,x,y,scale,rotation:0,flipX:false,flipY:false,crop:{left:0,top:0,right:0,bottom:0},visible:true,...extra});
 for(const side of ['Front','Back']){
  const background=image(side+'-background','Background',`/assets/template-backgrounds/${filename}`,0,0,1,{flipX:side==='Back'});
  const logo=image(side+'-logo','Sample logo',`/${dir}/sample-logo.png`,0,-20,side==='Front'?.25:.38);
  const text={id:side+'-phone',type:'text',label:'Phone number',text:'(555) 010-2026',x:0,y:side==='Front'?14:12,scale:.47,rotation:0,visible:true,color:textColor,font:'Inter',strokeColor:'#000000',strokeWidth:0,bold:true,italic:false,align:'center'};
  const service={...text,id:side+'-services',label:'Services',text:'YOUR SERVICES HERE',y:28,scale:.35};
  zones[side]={background:base,layers:[background,logo,text,service]};
  rules.push({zone:side,layerId:background.id,role:'locked',label:side+' background'},{zone:side,layerId:logo.id,role:'logo',label:'Your logo'},{zone:side,layerId:text.id,role:'text',label:'Phone number'},{zone:side,layerId:service.id,role:'text',label:'Services'});
 }
 zones['Left Sleeve']={background:base,layers:[image('sleeve-flag','Sleeve flag',`/${dir}/demo-flag.png`,0,0,.35)]};rules.push({zone:'Left Sleeve',layerId:'sleeve-flag',role:'locked',label:'Sleeve flag'});zones['Right Sleeve']={background:base,layers:[]};zones.Collar={background:base,layers:[]};
 const payload={schema:'mqd-design-v1',engine:{calibration:'v26-surface-uv-collar-strip'},product:{id:'tshirt',name:'All-Over Print T-Shirt',category:'T-Shirts',model:template.model},templates:template.templates,activeZone:'Front',design:{zones}};
 versions.push({id:versionId,template_id:id,name:'UNPUBLISHED · '+name,categories:category==='Pressure Washing'?[category,'General Business']:[category],range:'Premium · All-over print',draftStatus:definitions[i].note,backgroundSource:filename,payload,rules,previews:{Front:`/${dir}/${i+1}-front.png`,Back:`/${dir}/${i+1}-back.png`}});
}
fs.writeFileSync('v20/template-demo.js','// Five unpublished review fixtures with approved background originals. Never inserted into the public catalog.\nexport const demoVersions='+JSON.stringify(versions,null,2)+';\n');

await import('./render-template-demos.mjs');
