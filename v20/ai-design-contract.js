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
  const kind=['text','logo','artwork'].includes(raw?.kind)?raw.kind:'logo';
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
    contextId:/^[a-f0-9]{32}$/.test(raw?.contextId||'')?raw.contextId:null,
    zones:product.zones.map(zone=>byZone.get(zone)||{zone,background:'#FFFFFF',elements:[]})
  };
}
export function productForPlan(id){return PRODUCT_MAP.get(id)||null;}

function encodeBytes(bytes){
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function checksum(bytes){
  let hash=2166136261;
  for(const byte of bytes)hash=Math.imul(hash^byte,16777619)>>>0;
  return hash.toString(36);
}
export function encodePlan(plan){
  const safe=sanitizePlan(plan,{fallbackProductId:plan?.productId});
  const product=PRODUCT_MAP.get(safe.productId);
  const zones=safe.zones.filter(zone=>zone.background!=='#FFFFFF'||zone.elements.length).map(zone=>[
    product.zones.indexOf(zone.zone),zone.background.slice(1),zone.elements.map(el=>[
      el.kind==='text'?1:el.kind==='artwork'?2:0,el.text,el.x,el.y,el.scale,el.rotation,
      el.color.slice(1),el.strokeColor.slice(1),el.strokeWidth,
      AI_FONTS.indexOf(el.font),el.bold?1:0,el.italic?1:0,
      ['left','center','right'].indexOf(el.align)
    ])
  ]);
  const bytes=new TextEncoder().encode(JSON.stringify([3,AI_PRODUCTS.indexOf(product),zones,safe.contextId]));
  return encodeBytes(bytes)+'.'+checksum(bytes);
}
export function decodePlan(value){
  try{
    const [encoded,expected,extra]=String(value||'').split('.');
    if(extra!==undefined||!encoded||encoded.length>12000)return null;
    const padded=encoded.replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(padded+'='.repeat((4-padded.length%4)%4));
    const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
    if(expected!==undefined&&checksum(bytes)!==expected)return null;
    const raw=JSON.parse(new TextDecoder().decode(bytes));
    if(Array.isArray(raw)){
      if(expected===undefined||!((raw[0]===2&&raw.length===3)||(raw[0]===3&&raw.length===4))||!Number.isInteger(raw[1]))return null;
      if(raw[0]===3&&raw[3]!==null&&!/^[a-f0-9]{32}$/.test(raw[3]))return null;
      const product=AI_PRODUCTS[raw[1]];
      if(!product||!Array.isArray(raw[2])||raw[2].length>product.zones.length)return null;
      const seen=new Set();
      const zones=[];
      for(const row of raw[2]){
        if(!Array.isArray(row)||row.length!==3||!Number.isInteger(row[0])||!product.zones[row[0]]||seen.has(row[0])||!Array.isArray(row[2])||row[2].length>6)return null;
        seen.add(row[0]);
        const elements=[];
        for(const el of row[2]){
          if(!Array.isArray(el)||el.length!==13||!(raw[0]===3?[0,1,2]:[0,1]).includes(el[0]))return null;
          elements.push({
            kind:el[0]===1?'text':el[0]===2?'artwork':'logo',text:el[1],x:el[2],y:el[3],scale:el[4],rotation:el[5],
            color:'#'+el[6],strokeColor:'#'+el[7],strokeWidth:el[8],font:AI_FONTS[el[9]],
            bold:!!el[10],italic:!!el[11],align:['left','center','right'][el[12]]
          });
        }
        zones.push({zone:product.zones[row[0]],background:'#'+row[1],elements});
      }
      return sanitizePlan({productId:product.id,contextId:raw[0]===3?raw[3]:null,summary:'ChatGPT design draft',zones});
    }
    if(!raw||raw.version!==AI_DESIGN_VERSION||!PRODUCT_MAP.has(raw.productId)||!Array.isArray(raw.zones))return null;
    return sanitizePlan(raw);
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
