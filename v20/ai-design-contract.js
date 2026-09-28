export const AI_DESIGN_VERSION='mqd-ai-plan-v1';

export const AI_PRODUCTS=[
  {id:'tshirt',name:'Short Sleeve T-Shirt',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar']},
  {id:'long-sleeve-tshirt',name:'Long Sleeve T-Shirt',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar']},
  {id:'short-sleeve-polo',name:'Short Sleeve Polo',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar']},
  {id:'long-sleeve-polo',name:'Long Sleeve Polo',zones:['Front','Back','Left Sleeve','Right Sleeve','Collar']},
  {id:'fleece-hoodie',name:'Fleece Hoodie',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood']},
  {id:'lightweight-jacket',name:'Lightweight Jacket',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood']},
  {id:'mask',name:'Mask',zones:['Entire Mask']},
  {id:'hood-mask-shirt',name:'Long Sleeve Shirt With Hood And Built-In Mask',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood','Built-In Mask']},
  {id:'shorts',name:'Shorts',zones:['Front','Back']},
  {id:'sweat-pants',name:'Sweat Pants',zones:['Front','Back']},
  {id:'hooded-long-sleeve',name:'Long Sleeve Shirt With Hood',zones:['Front','Back','Left Sleeve','Right Sleeve','Hood']},
  {id:'hat',name:'Hat',zones:['Front Panel','Top of Bill']}
];

export const AI_FONTS=['Inter','Montserrat','Poppins','Oswald','Bebas Neue','Anton','Archivo Black','Black Ops One','Righteous','Russo One','League Spartan'];

const PRODUCT_MAP=new Map(AI_PRODUCTS.map(p=>[p.id,p]));
const FONT_SET=new Set(AI_FONTS);

function clamp(n,min,max,fallback=0){
  n=Number(n);
  return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
}
export function normalizeHex(value,fallback='#FFFFFF'){
  const v=String(value||'').trim().toUpperCase();
  const hex=v.startsWith('#')?v:'#'+v;
  return /^#[0-9A-F]{6}$/.test(hex)?hex:fallback;
}
function cleanText(value,max=80){
  return String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
function safeElement(raw,index){
  const kind=raw?.kind==='text'?'text':'logo';
  return{
    kind,
    text:kind==='text'?cleanText(raw?.text||'Text',80):null,
    x:clamp(raw?.x,-100,100,0),
    y:clamp(raw?.y,-100,100,0),
    scale:clamp(raw?.scale,.05,2.2,kind==='logo'?.55:.7),
    rotation:clamp(raw?.rotation,-180,180,0),
    color:normalizeHex(raw?.color,'#111111'),
    strokeColor:normalizeHex(raw?.strokeColor,'#FFFFFF'),
    strokeWidth:clamp(raw?.strokeWidth,0,20,0),
    font:FONT_SET.has(raw?.font)?raw.font:'Inter',
    bold:raw?.bold!==false,
    italic:raw?.italic===true,
    align:['left','center','right'].includes(raw?.align)?raw.align:'center',
    order:index
  };
}
export function sanitizePlan(raw,{fallbackProductId='tshirt'}={}){
  const product=PRODUCT_MAP.get(raw?.productId)||PRODUCT_MAP.get(fallbackProductId)||AI_PRODUCTS[0];
  const incoming=Array.isArray(raw?.zones)?raw.zones:[];
  const byZone=new Map();
  for(const row of incoming){
    if(!product.zones.includes(row?.zone)||byZone.has(row.zone))continue;
    const elements=Array.isArray(row?.elements)?row.elements.slice(0,6).map(safeElement):[];
    byZone.set(row.zone,{zone:row.zone,background:normalizeHex(row?.background,'#FFFFFF'),elements});
  }
  return{
    version:AI_DESIGN_VERSION,
    productId:product.id,
    summary:cleanText(raw?.summary||'AI design draft',280),
    zones:product.zones.map(zone=>byZone.get(zone)||{zone,background:'#FFFFFF',elements:[]})
  };
}
export function productForPlan(id){return PRODUCT_MAP.get(id)||null;}

export function encodePlan(plan){
  const safe=sanitizePlan(plan,{fallbackProductId:plan?.productId});
  const json=JSON.stringify(safe);
  const bytes=new TextEncoder().encode(json);
  let binary='';
  for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodePlan(value){
  try{
    const padded=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(padded+'='.repeat((4-padded.length%4)%4));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    return sanitizePlan(JSON.parse(new TextDecoder().decode(bytes)));
  }catch{return null;}
}
export function encodePrompt(prompt){
  const bytes=new TextEncoder().encode(cleanText(prompt,1000));
  let binary='';
  for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodePrompt(value){
  try{
    const padded=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(padded+'='.repeat((4-padded.length%4)%4));
    return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))).slice(0,1000);
  }catch{return'';}
}
