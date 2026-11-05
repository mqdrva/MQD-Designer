import {MAX_REQUEST_BYTES,requestEstimate,garmentLogo,garmentLogoPath,assertFixedLogoPackage} from '../mqd-print-shop-pilot/contract.js';
import {GARMENT_MAPPING} from '../_shared/shirt-games/mapping.js';
import {maxZoneLayers} from '../_shared/mqd-layer-capacity.js';

const raster=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Use the existing saved ZIP format and keep every original byte. Do not render
// or recompress artwork on the service, and never import arbitrary remote assets.
export async function validateShopDesignPackage(bytes,shop,JSZip){
 if(bytes.length<22||bytes.length>MAX_REQUEST_BYTES)throw new Error('Save a design ZIP under 8 MB. Keep larger originals intact and contact the shop.');
 const zip=await JSZip.loadAsync(bytes),entries=Object.values(zip.files).filter(f=>!f.dir);
 if(entries.length>60||entries.some(f=>f.name.includes('..')||!/^([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(json|txt|png|jpg|jpeg|webp)$/i.test(f.name))||entries.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>32*1024*1024)throw new Error('Unsupported saved design package.');
 const json=async name=>{const f=zip.file(name);if(!f||f._data?.uncompressedSize>(name==='design.json'?24*1024*1024:20000))throw new Error('Saved design details are missing or too large.');return JSON.parse(await f.async('string'));};
 const saved=await json('design.json'),order=await json('order-request.json');
 if(saved.schema!=='mqd-shop-design-v1'||saved.shop!==shop.slug||!shop.engines.includes(saved.engine)||order.engine!==saved.engine)throw new Error('This design belongs to another shop or designer.');
 requestEstimate(shop,order);
 if(saved.engine==='2d'){
  const d=saved.draft;
  if(!d?.artwork||d.product!==order.productId||d.printMethod!==order.printMethod||d.color!==order.color)throw new Error('Saved garment does not match the request.');
  for(const [view,ref] of Object.entries(saved.files||{})){
   if(!['front','back','left','right'].includes(view)||!['image/png','image/jpeg','image/webp'].includes(ref.type)||!ref.path.startsWith('originals/')||!zip.file(ref.path)||!d.artwork[view])throw new Error('Original artwork is missing.');
  }
  if(Object.keys(d.artwork).some(v=>!['front','back','left','right'].includes(v)))throw new Error('Unsupported print zone.');
  if(Object.values(d.photos||{}).some(Boolean))throw new Error('Save without private garment photos.');
 }else{
  const d=saved.design,m=GARMENT_MAPPING[d?.product?.id];
  if(!m||d.schema!=='mqd-design-v1'||d.product.id!==order.productId||d.product.model!==m.model||!same(d.templates,m.templates)||!d.design?.zones||Object.keys(d.design.zones).some(z=>!m.zones.includes(z)))throw new Error('Keep the supported garment and print-zone mapping.');
  if(d.design.teamMaster||d.design.template||d.design.teamBackground)throw new Error('Use an original Print Shop design.');
  for(const [name,zone] of Object.entries(d.design.zones)){
   if(!Array.isArray(zone.layers)||zone.layers.length>maxZoneLayers(d.product.id,name))throw new Error('Unsupported design layers.');
   for(const l of zone.layers)if(!['image','text'].includes(l.type)||l.libraryAssetId||l.type==='image'&&!raster.test(l.src||''))throw new Error('Use original uploaded artwork and text.');
  }
 }
 const preset=garmentLogo(shop,order.productId);
 if(preset.mode!=='none'){
  const placement=zip.file('brand/logo-placement.json'),asset=zip.file(garmentLogoPath(shop));
  if(!placement||!asset||placement._data?.uncompressedSize>3000)throw new Error('The original shop logo and placement are missing.');
  const manifest=JSON.parse(await placement.async('string'));
  if(!same(manifest,{product:order.productId,preset,asset:garmentLogoPath(shop)}))throw new Error('Keep the saved shop logo placement.');
  assertFixedLogoPackage(shop,order,saved,manifest);
  const actual=await asset.async('uint8array'),expected=Uint8Array.from(atob(shop.garmentLogo.split(',')[1]),c=>c.charCodeAt(0));
  if(actual.length!==expected.length||actual.some((v,i)=>v!==expected[i]))throw new Error('Keep the original shop logo artwork.');
 }
 return {engine:saved.engine,productId:order.productId};
}
