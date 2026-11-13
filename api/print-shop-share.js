import {readFile} from 'node:fs/promises';
const ORIGIN='https://mymerchnow.app';
const API='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-pilot';
const KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cache=new Map();
async function publicShop(slug){
 const cached=cache.get(slug);if(cached?.until>Date.now())return cached.shop;
 const response=await fetch(API+'?shop='+encodeURIComponent(slug),{headers:{apikey:KEY},signal:AbortSignal.timeout(4000)});
 if(!response.ok)return null;
 const {shop}=await response.json();if(!shop||typeof shop.name!=='string')return null;
 const safe={name:shop.name.slice(0,120),tagline:String(shop.tagline||'Design your shirt. Send your request to the shop.').slice(0,300),logo:shop.logo,engines:shop.engines};
 if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(slug,{until:Date.now()+30000,shop:safe});return safe;
}
export function shopLogoBytes(value){
 if(typeof value!=='string')return null;
 const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);if(!match||match[2].length>700000)return null;
 const bytes=Buffer.from(match[2],'base64');if(!bytes.length||bytes.length>500*1024)return null;
 const valid=match[1]==='png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):match[1]==='jpeg'?bytes[0]===255&&bytes[1]===216:bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 return valid?{bytes,type:'image/'+match[1]}:null;
}
export function brandedShopHTML(html,shop,slug,engine){
 const title=shop.name+' · Shirt designer',url=ORIGIN+'/shops/'+slug+(engine==='3d'?'/3d':'');
 const image=shopLogoBytes(shop.logo)?ORIGIN+'/api/print-shop-share?shop='+encodeURIComponent(slug)+'&image=1':ORIGIN+'/assets/brand-logo.png';
 // The public shop is already loaded for social metadata. Brand the initial
 // visible HTML too, before client modules fetch designer settings.
 const logo=shopLogoBytes(shop.logo)?shop.logo:'/assets/brand-logo.png';
 html=html.replace(/<img\b[^>]*id="shopLogo"[^>]*>/i,()=>'<img id="shopLogo" src="'+escape(logo)+'" alt="'+escape(shop.name)+'">')
  .replace(/(<strong\b[^>]*id="shopBrand"[^>]*>)[\s\S]*?(<\/strong>)/i,(_m,a,b)=>a+escape(shop.name)+b)
  .replace(/(<div class="shop-intro">\s*<strong>)[\s\S]*?(<\/strong>)/i,(_m,a,b)=>a+'Shop order requests · final quote confirmed by the business'+b)
  .replace(/(<p\b[^>]*id="shopDescription"[^>]*>)[\s\S]*?(<\/p>)/i,(_m,a,b)=>a+escape(shop.tagline)+b)
  .replace(/(<a\b[^>]*id="shopSwitch"[^>]*href=")[^"]*("[^>]*>)[\s\S]*?(<\/a>)/i,(_m,a,b,c)=>a+'/shops/'+slug+(engine==='2d'?'/3d':'')+b+(engine==='2d'?'Try 3D designer':'Use 2D designer')+c);
 // Replace generic metadata in the initial response; crawlers need no JavaScript.
 html=html.replace(/<meta\b[^>]*(?:property|name)=["'](?:og:|twitter:)[^>]*>\s*/gi,'').replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escape(title)+'</title>');
 const tags={'og:type':'website','og:site_name':shop.name,'og:title':title,'og:description':shop.tagline,'og:url':url,'og:image':image,'og:image:alt':shopLogoBytes(shop.logo)?shop.name+' logo':'MyMerchNow logo','twitter:card':'summary','twitter:title':title,'twitter:description':shop.tagline,'twitter:image':image};
 return html.replace('</head>',Object.entries(tags).map(([key,value])=>'<meta '+(key.startsWith('og:')?'property':'name')+'="'+key+'" content="'+escape(value)+'">').join('\n')+'\n</head>');
}
export function createShopShareHandler({loadShop=publicShop,template=engine=>readFile(new URL(engine==='3d'?'../shop-3d.html':'../shop-2d.html',import.meta.url),'utf8')}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
  const url=new URL(req.url,ORIGIN),path=url.pathname.match(/^\/shops\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/(3d))?\/?$/),slug=path?.[1]||url.searchParams.get('shop'),engine=path?.[2]||url.searchParams.get('engine')||'2d';
  if(!slug||slug.length>48||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!['2d','3d'].includes(engine)){res.statusCode=404;return res.end('Shop unavailable.');}
  try{
   const shop=await loadShop(slug);if(!shop||!shop.engines?.includes(engine)){res.statusCode=404;return res.end('Shop unavailable.');}
   if(url.searchParams.get('image')==='1'){
    const logo=shopLogoBytes(shop.logo);if(!logo){res.statusCode=404;return res.end('Shop logo unavailable.');}
    res.setHeader('Content-Type',logo.type);res.setHeader('Cache-Control','public, max-age=60');return res.end(req.method==='HEAD'?undefined:logo.bytes);
   }
   res.setHeader('Content-Type','text/html; charset=utf-8');const html=brandedShopHTML(await template(engine),shop,slug,engine);return res.end(req.method==='HEAD'?undefined:html);
  }catch{res.statusCode=503;res.setHeader('Retry-After','30');return res.end('The shop designer is temporarily unavailable. Please retry shortly.');}
 };
}
export default createShopShareHandler();
