import {SHOP_PRINT_METHODS,shopPrintZones,requestEstimate,validPhone,validateGarmentLogo} from './contract.js';
const two=['everyday-tshirt','everyday-long-sleeve','everyday-hoodie','everyday-polo'];
const three=['tshirt','long-sleeve-tshirt','fleece-hoodie','short-sleeve-polo'];
const colors=['White','Black','Navy','Royal','Red','Sport Grey','Charcoal','Forest Green','Forest','Purple','Gold','Light Blue','Sand'];
const sizes=['XS','S','M','L','XL','2XL','3XL','4XL','5XL','6XL'];
const text=(v,max,label,required=false)=>{if(typeof v!=='string'||v.length>max||required&&!v.trim())throw new Error('Enter valid '+label+'.');return v.trim();};
const cents=v=>{if(!Number.isSafeInteger(v)||v<0||v>10000000)throw new Error('Enter valid prices.');return v;};
const choices=(v,allow,label)=>{if(!Array.isArray(v)||!v.length||v.length>allow.length||v.some(x=>!allow.includes(x))||new Set(v).size!==v.length)throw new Error('Choose valid '+label+'.');return v;};
export function validateSetup(packet,{allowMissingContact=false}={}){
 if(packet?.schema!=='mqd-business-setup-v1'||!['2d','3d'].includes(packet.plan))throw new Error('Choose a valid setup and plan.');
 const raw=packet.shop,p=raw?.pricing;if(!p)throw new Error('Shop prices are missing.');
 const email=text(packet.owner?.requestEmail??'',254,'business email',!allowMissingContact).toLowerCase();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid business email.');
 const phone=text(packet.owner?.phone??'',40,'business phone',!allowMissingContact);if(phone&&!validPhone(phone))throw new Error('Enter a valid business phone.');
 const slug=text(raw.slug,48,'shop link',true);if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||['pilot','admin','setup','support','help'].includes(slug))throw new Error('Choose another shop link name.');
 const logo=text(raw.logo,700000,'logo');if(logo!=='/assets/brand-logo.png'){
  if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(logo))throw new Error('Upload a supported logo image.');
  const bytes=Uint8Array.from(atob(logo.split(',')[1]),c=>c.charCodeAt(0));if(bytes.length>500*1024||!(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71||bytes[0]===255&&bytes[1]===216||String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'))throw new Error('Upload a supported logo under 500 KB.');
 }
 const organizationType=raw.organizationType||'print-shop';if(!['print-shop','brand','team'].includes(organizationType))throw new Error('Choose Print shop, Brand or Team.');
 const engines=organizationType==='team'?(raw.engines||['2d','3d']):(packet.plan==='3d'?['2d','3d']:['2d']);
 if(!Array.isArray(engines)||!engines.length||engines.length>2||new Set(engines).size!==engines.length||engines.some(e=>!['2d','3d'].includes(e)))throw new Error('Choose 2D, 3D, or both designers.');
 const garmentLogo=raw.garmentLogo||'';
 if(garmentLogo){const max=organizationType==='team'?15*1024*1024:500*1024,limit=organizationType==='team'?'15 MB':'500 KB';
  if(typeof garmentLogo!=='string'||garmentLogo.length>Math.ceil(max/3)*4+50||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(garmentLogo))throw new Error('Upload a garment logo up to '+limit+'.');
  const encoded=garmentLogo.split(',')[1],length=encoded.length*3/4-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0),head=Uint8Array.from(atob(encoded.slice(0,40)),c=>c.charCodeAt(0));
  if(length>max||!length||!(head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71||head[0]===255&&head[1]===216||String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP'))throw new Error('Upload a supported garment logo up to '+limit+'.');
 }
 const baseCents={},premiumCents={},garments={};
 for(const [source,dest,allow] of [[p.baseCents,baseCents,two],[packet.plan==='3d'?p.premiumCents:{},premiumCents,three]]){
  if(!source||typeof source!=='object'||Array.isArray(source)||Object.keys(source).some(id=>!allow.includes(id)))throw new Error('Choose supported garments.');
  for(const [id,price] of Object.entries(source)){
   dest[id]=cents(price);const g=raw.garments?.[id];if(!g)throw new Error('Enter garment details.');
   garments[id]={brand:text(g.brand??'',100,'garment brand'),style:text(g.style??'',100,'garment style'),sizes:choices(g.sizes,organizationType==='team'?sizes.filter(s=>s!=='6XL'):sizes,'sizes'),colors:choices(g.colors,colors,'colors'),additionalColorsRequested:text(g.additionalColorsRequested||'',100,'additional colors'),printZones:g.printZones};
   garments[id].logoPreset=validateGarmentLogo(g.logoPreset,{garmentLogo,garments},id);
   const zones=shopPrintZones({garments},id);garments[id].printZones=Object.fromEntries(Object.entries(zones).map(([key,v])=>[key,{width:v.width,height:v.height}]));
  }
 }
 if(engines.includes('2d')!==!!Object.keys(baseCents).length||engines.includes('3d')!==!!Object.keys(premiumCents).length)throw new Error('Enable a garment for each chosen designer.');
 const methods={},rules={};if(!raw.printMethods||Object.keys(raw.printMethods).length>6)throw new Error('Choose printing methods.');
 for(const id of Object.keys(raw.printMethods)){
  if(!Object.hasOwn(SHOP_PRINT_METHODS,id))throw new Error('Choose supported printing methods.');methods[id]=SHOP_PRINT_METHODS[id];
  const rule=p.printRules?.['2d']?.[id];if(['screen','sublimation'].includes(id)){rules[id]={mode:'quote'};continue;}
  if(rule?.mode!=='calculated'||!Number.isInteger(rule.minimumQuantity)||rule.minimumQuantity<1||rule.minimumQuantity>500||!Array.isArray(rule.tiers)||!rule.tiers.length||rule.tiers.length>20)throw new Error('Configure automatic printing rates.');
  rules[id]={mode:'calculated',minimumQuantity:rule.minimumQuantity,setupCents:cents(rule.setupCents),tiers:rule.tiers.map(t=>({fromQuantity:t.fromQuantity,frontCents:cents(t.frontCents),backCents:cents(t.backCents),sleevesCents:cents(t.sleevesCents)}))};
 }
 if(!Object.keys(methods).length)throw new Error('Choose a printing method.');
 const shop={organizationType,fulfillmentMode:organizationType==='team'?'mymerchnow':'business',garmentLogo,slug,name:text(raw.name,100,'business name',true),logo,tagline:text(raw.tagline,180,'welcome message'),requirements:text(raw.requirements||'',1500,'shop requirements'),garments,engines,printMethods:methods,printMethods3d:packet.plan==='3d'?{...(Object.hasOwn(raw.printMethods3d||{},'all-over')?{'all-over':'All-over print'}:{}),...methods}:{},pilot:false,pricing:{version:'setup-1',currency:'usd',baseCents,premiumCents,sizeCents:cents(p.sizeCents),methodCents:{},methodBackCents:{},sleeveCents:0,printRules:{'2d':rules,'3d':structuredClone(rules)}}};
 const id=Object.keys(baseCents)[0],g=garments[id];if(id)for(const method of Object.keys(methods))requestEstimate(shop,{engine:'2d',productId:id,color:g.colors[0],printMethod:method,locations:['front'],orderOptions:[...Array.from({length:5},()=>({size:g.sizes[0],quantity:99})),{size:g.sizes[0],quantity:5}]});
 return {schema:'mqd-business-setup-v1',status:'pending-review',plan:packet.plan,owner:{requestEmail:email,phone},shop};
}
