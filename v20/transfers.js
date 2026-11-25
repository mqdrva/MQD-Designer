import { installArtworkPinch } from './artwork-pinch.js';
import { cartLineTotals, dtfCents, isTransfer } from './transfers-cart.js';
import { garmentPrice, pricingEpoch } from './promotion-pricing.js';
const products = {
  'dtf-sheet': { title:'DTF gang sheets', description:'12 × 12 in · $10 each or 3 for $25', inches:12 },
  'sublimation-square': { title:'Sublimation square', description:'15 × 15 in · $10 per transfer', inches:15 },
  'sublimation-all-over': { title:'All-over sublimation', description:'Adult S–XL · $25 per front-and-back set', preview:true }
};
const $ = id => document.getElementById(id);
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents / 100);
const api = 'https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/';
const key = 'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const originIsLocal = ['localhost','127.0.0.1'].includes(location.hostname);
const apiBase = originIsLocal ? '/__review/' : api;
const sandbox = new URLSearchParams(location.search).get('mqdStripeTest') === '1';
const cartKey = originIsLocal ? 'mqd-transfer-review-cart' : 'mqd-cart';
const cart = () => { try { const rows = JSON.parse(localStorage.getItem(cartKey) || '[]'); return Array.isArray(rows) ? rows.map(row => ({...row,price:isTransfer(row.productId) ? row.price : garmentPrice(row.productId,row.price)})) : []; } catch { return []; } };
const saveCart = rows => localStorage.setItem(cartKey,JSON.stringify(rows));
const newSheet = () => ({ layers:[] });
const state = Object.fromEntries(Object.keys(products).map(id => [id,{ sheets: id === 'sublimation-all-over' ? [newSheet(),newSheet()] : [newSheet()], current:0, selected:null }]));
let sku = 'dtf-sheet', busy = false, decoding = false, drag, enabled = false, submissionToken = null;
const current = () => state[sku];
const layers = () => current().sheets[current().current].layers;
const info = () => products[sku];
const selected = () => layers().find(layer => layer.id === current().selected);
const extent = () => info().inches || 100;
const fullCrop = {left:0,top:0,right:0,bottom:0};
const cropBox = ({left,top,right,bottom}=fullCrop) => ({x:left,y:top,width:1-left-right,height:1-top-bottom});
const maxLayers = (sheet, design = current()) => sheet.length >= 24 || design.sheets.reduce((count, entry) => count + entry.layers.length,0) >= 64;
const node = (tag,text) => {const out=document.createElement(tag);if(text)out.textContent=text;return out;};
const button = (text,action) => { const b=node('button',text);b.type='button';b.addEventListener('click',action);return b; };
const report = message => { $('status').textContent = message; };
function guestToken() {
  const tokenKey='mqd-guest-order-token';
  let token=localStorage.getItem(tokenKey);
  if(!token){token=crypto.randomUUID();localStorage.setItem(tokenKey,token);}
  return token;
}
async function headers() {
  if (originIsLocal) return {};
  const result={apikey:key};
  try {
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm');
    const client=createClient(api.replace('/functions/v1/',''),key);
    const {data}=await client.auth.getSession();
    if(data.session?.access_token) result.Authorization='Bearer '+data.session.access_token;
  } catch {}
  return result;
}
function invalidate(){ submissionToken=null; }
function renderProducts(){
  $('products').replaceChildren(...Object.entries(products).map(([id,p])=>{
    const b=button('',()=>{if(busy||decoding)return;sku=id;invalidate();report('');render();});
    b.className='product';
    b.setAttribute('aria-pressed',String(id===sku));
    b.append(node('strong',p.title),node('small',p.description));
    if(p.preview)b.append(node('small','Design preview only'));
    return b;
  }));
}
const workspace = $('workspace');
const transform = $('transform');
const handles = [...transform.querySelectorAll('.resize-handle')];
const percent = value => value / extent() * 100 + '%';

function position(element, layer) {
  Object.assign(element.style, { left:percent(layer.x), top:percent(layer.y), width:percent(layer.width), height:percent(layer.height) });
}
function paint(container, list, interactive = false) {
  container.replaceChildren(...list.map(layer => {
    const div=node('div');
    div.className='layer';
    if(interactive)div.dataset.layer=layer.id;
    position(div,layer);
    const img=node('img');
    img.src=layer.url;
    img.alt='';
    img.draggable=false;
    if(layer.crop){
      const {x,y,width,height}=cropBox(layer.crop);
      Object.assign(img.style,{left:(-x/width*100)+'%',top:(-y/height*100)+'%',width:(100/width)+'%',height:(100/height)+'%'});
    }
    div.append(img);
    return div;
  }));
}
function renderTransform(layer) {
  transform.hidden=!layer;
  workspace.classList.toggle('has-artwork',layers().length > 0);
  if(!layer)return;
  position($('transformFrame'),layer);
  transform.classList.toggle('small-layer',Math.min(layer.width*workspace.clientWidth,layer.height*workspace.clientHeight)/extent()<62);
  for(const handle of handles) {
    const x=layer.x+(Number(handle.dataset.x)>0?layer.width:0);
    const y=layer.y+(Number(handle.dataset.y)>0?layer.height:0);
    handle.style.left='clamp(21px, '+percent(x)+', calc(100% - 21px))';
    handle.style.top='clamp(21px, '+percent(y)+', calc(100% - 21px))';
  }
}
function renderLayerList(layer) {
  const list=$('layers');
  const topFirst=[...layers()].reverse();
  const locked=busy||decoding;
  const index=layers().indexOf(layer);
  const choices=[...list.querySelectorAll('button')];
  if(choices.length!==topFirst.length||choices.some((choice,i)=>choice.dataset.id!==topFirst[i].id)) {
    list.replaceChildren(...topFirst.map(item=>{
      const choice=button('',()=>{
        if(busy||decoding)return;
        current().selected=item.id;
        renderLayers();
      });
      choice.className='layer-choice';
      choice.dataset.id=item.id;
      const image=node('img');
      image.src=item.url;
      image.alt='';
      choice.append(image,node('span',item.label||item.file.name));
      const row=node('li');
      row.append(choice);
      return row;
    }));
  }
  for(const choice of list.querySelectorAll('button')) {
    choice.disabled=locked;
    choice.setAttribute('aria-pressed',String(choice.dataset.id===layer?.id));
  }
  $('emptyLayers').hidden=topFirst.length>0;
  $('layerActions').hidden=!layer;
  $('forward').disabled=locked||index===layers().length-1;
  $('backward').disabled=locked||index<=0;
  $('delete').disabled=locked||!layer;
  $('duplicate').disabled=locked||!layer||maxLayers(layers());
  $('openCrop').disabled=locked||!layer;
}
function renderLayers(refreshList = true) {
  $('printArtwork').classList.toggle('shirt-print',Boolean(info().preview));
  paint($('printArtwork'),layers(),true);
  $('shirtSides').hidden=!info().preview;
  if(info().preview) {
    paint($('frontShirt'),current().sheets[0].layers);
    paint($('backShirt'),current().sheets[1].layers);
  }
  $('shirtPreview').hidden=sku!=='sublimation-square';
  if(sku==='sublimation-square') {
    const placement=node('div');
    placement.className='placement';
    $('shirt').replaceChildren(placement);
    paint(placement,layers());
  }
  const layer=selected();
  renderTransform(layer);
  if(refreshList)renderLayerList(layer);
  $('controls').hidden=!layer;
  $('artwork').disabled=busy||decoding;
  if(layer)for(const field of ['x','y','width'])$(field).value=Number(layer[field].toFixed(2));
  const count=current().sheets.length;
  $('quote').textContent=info().preview? '1 front-and-back set · '+$('size').value+' · $25.00'
    : count+' '+(count===1?'individual sheet':'individual sheets')+' · '+money(sku==='dtf-sheet'?dtfCents(count):1000*count);
  $('add').disabled=busy||decoding||info().preview||!enabled||current().sheets.some(s=>!s.layers.length);
}
function render(){
  drag=null;
  renderProducts();
  $('editorTitle').textContent=info().title;
  $('sizeField').hidden=!info().preview;
  $('workspace').classList.toggle('garment',Boolean(info().preview));
  $('editorHelp').textContent=sku==='dtf-sheet'?'The $25 three-pack contains three separate cut sheets. Add and edit each sheet separately.':info().preview?'Design both sides. Ordering opens after production dimensions and bleed have been verified.':'Create a separate $10 transfer for each placement, including front and back.';
  $('bounds').textContent=info().preview?'Illustrative shirt outline, including sleeves. Controls use percentages.':extent()+' × '+extent()+' in print boundary. Position and width are in inches.';
  $('sheets').replaceChildren(...current().sheets.map((_,index)=>{
    const b=button(info().preview?['Front','Back'][index]:'Sheet '+(index+1),()=>{if(busy||decoding)return;current().current=index;current().selected=layers().at(-1)?.id;render();});
    b.setAttribute('aria-pressed',String(current().current===index));return b;
  }));
  if(!info().preview){
    const add=button(sku==='dtf-sheet'?'Add Sheet':'Add transfer',()=>{if(busy||decoding)return;invalidate();current().sheets.push(newSheet());current().current=current().sheets.length-1;current().selected=null;render();});
    add.disabled=current().sheets.length>=20||busy;$('sheets').append(add);
  }
  $('removeSheet').hidden=info().preview||current().sheets.length===1;
  renderLayers();
}
function move(layer, x, y) {
  const clamp=(value,gap)=>Math.max(Math.min(0,gap),Math.min(Math.max(0,gap),value));
  layer.x=clamp(x,extent()-layer.width);
  layer.y=clamp(y,extent()-layer.height);
}
function resizePlacement(original, width, horizontal = 0, vertical = 0) {
  const size=extent();
  const ratio=original.height/original.width;
  const minimum=original.cover?Math.max(size,size/ratio):size/100;
  const anchorX=original.x+original.width*(1-horizontal)/2;
  const anchorY=original.y+original.height*(1-vertical)/2;
  let maximum;
  if(original.cover)maximum=Math.max(minimum,size*4);
  else {
    const spaceX=horizontal===0?size:horizontal>0?size-anchorX:anchorX;
    const spaceY=vertical===0?size:vertical>0?size-anchorY:anchorY;
    maximum=Math.min(spaceX,spaceY/ratio);
  }
  const nextWidth=Math.min(maximum,Math.max(minimum,width));
  const height=nextWidth*ratio;
  const placement={width:nextWidth,height};
  move(placement,anchorX-nextWidth*(1-horizontal)/2,anchorY-height*(1-vertical)/2);
  return placement;
}
function updatePlacement(layer, placement) {
  invalidate();
  Object.assign(layer,placement);
  renderLayers(false);
}
for(const field of ['x','y','width'])$(field).addEventListener('change',event=>{
  if(busy||decoding)return renderLayers();
  const layer=selected();
  if(!layer||!event.target.value.trim())return renderLayers();
  const value=Number(event.target.value);
  if(!Number.isFinite(value))return renderLayers();
  if(field==='width')updatePlacement(layer,resizePlacement(layer,value));
  else {
    move(layer,field==='x'?value:layer.x,field==='y'?value:layer.y);
    updatePlacement(layer,{x:layer.x,y:layer.y});
  }
});
workspace.addEventListener('pointerdown',event=>{
  if(busy||decoding||event.button!==0)return;
  const handle=event.target.closest('.resize-handle');
  const image=event.target.closest('[data-layer]');
  if(!handle&&!image) {
    if(event.pointerType==='touch'&&selected())workspace.setPointerCapture(event.pointerId);
    return;
  }
  const layer=handle?selected():layers().find(item=>item.id===image.dataset.layer);
  if(!layer)return;
  event.preventDefault();
  current().selected=layer.id;
  workspace.setPointerCapture(event.pointerId);
  drag={pointer:event.pointerId,layer,original:{...layer},clientX:event.clientX,clientY:event.clientY,
    horizontal:Number(handle?.dataset.x)||0,vertical:Number(handle?.dataset.y)||0};
  renderLayers();
});
workspace.addEventListener('pointermove',event=>{
  if(!drag||event.pointerId!==drag.pointer||busy||decoding||selected()!==drag.layer)return;
  const {layer,original,clientX,clientY,horizontal,vertical}=drag;
  const dx=(event.clientX-clientX)*extent()/workspace.clientWidth;
  const dy=(event.clientY-clientY)*extent()/workspace.clientHeight;
  if(horizontal) {
    const ratio=original.height/original.width;
    const delta=(dx*horizontal+dy*vertical*ratio)/(1+ratio*ratio);
    updatePlacement(layer,resizePlacement(original,original.width+delta,horizontal,vertical));
  } else {
    move(layer,original.x+dx,original.y+dy);
    updatePlacement(layer,{x:layer.x,y:layer.y});
  }
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])workspace.addEventListener(type,event=>{
  if(drag?.pointer===event.pointerId)drag=null;
});
installArtworkPinch(workspace,{
  selection:()=>{
    const layer=selected();
    return !busy&&!decoding&&layer?{key:layer.id,placement:layer}:null;
  },
  resize:(original,factor)=>resizePlacement(original,original.width*factor),
  apply:(placement,key)=>{
    const layer=selected();
    if(layer?.id===key)updatePlacement(layer,placement);
  },
  cancelDrag:()=>{drag=null;}
});
workspace.addEventListener('keydown',event=>{
  const layer=selected();
  if(!layer||busy||decoding)return;
  if(['+','=','-'].includes(event.key)) {
    event.preventDefault();
    updatePlacement(layer,resizePlacement(layer,layer.width*(event.key==='-'?.9:1.1)));
  } else {
    const step=extent()*(event.shiftKey?.05:.01);
    const direction={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];
    if(!direction)return;
    event.preventDefault();
    move(layer,layer.x+direction[0],layer.y+direction[1]);
    updatePlacement(layer,{x:layer.x,y:layer.y});
  }
});
$('size').addEventListener('change',()=>{invalidate();renderLayers();});
function changeOrder(direction) {
  if(busy||decoding)return;
  const index=layers().indexOf(selected());
  const destination=index+direction;
  if(index<0||destination<0||destination>=layers().length)return;
  invalidate();
  const [layer]=layers().splice(index,1);
  layers().splice(destination,0,layer);
  renderLayers();
}
$('forward').addEventListener('click',()=>changeOrder(1));
$('backward').addEventListener('click',()=>changeOrder(-1));
$('duplicate').addEventListener('click',()=>{
  const layer=selected();
  if(busy||decoding||!layer||maxLayers(layers()))return;
  const number=1+Math.max(0,...layers().filter(item=>item.file===layer.file).map(item=>item.copyNumber||0));
  const copy={...layer,id:crypto.randomUUID(),url:URL.createObjectURL(layer.file),cover:false,copyNumber:number};
  copy.label=layer.file.name+(number===1?' (copy)':' (copy '+number+')');
  if(copy.width>extent()||copy.height>extent())Object.assign(copy,resizePlacement(copy,copy.width));
  move(copy,copy.x+extent()*.04,copy.y+extent()*.04);
  layers().splice(layers().indexOf(layer)+1,0,copy);
  current().selected=copy.id;
  invalidate();
  renderLayers();
});
const cropDialog=$('cropDialog');
const cropInputs=[...cropDialog.querySelectorAll('[data-crop-edge]')];
const oppositeEdge={left:'right',right:'left',top:'bottom',bottom:'top'};
let cropDraft, cropLayer;

function renderCrop() {
  for(const input of cropInputs) {
    const edge=input.dataset.cropEdge;
    input.max=95-Math.round(cropDraft[oppositeEdge[edge]]*100);
    input.value=Math.round(cropDraft[edge]*100);
    input.setAttribute('aria-valuetext',input.value+' percent trimmed');
  }
  $('cropBounds').style.inset=['top','right','bottom','left'].map(edge=>cropDraft[edge]*100+'%').join(' ');
}
$('openCrop').addEventListener('click',()=>{
  if(busy||decoding||!selected())return;
  cropLayer=selected();
  cropDraft={...(cropLayer.crop||fullCrop)};
  $('cropImage').src=cropLayer.url;
  cropDialog.returnValue='';
  renderCrop();
  cropDialog.showModal();
});
for(const input of cropInputs)input.addEventListener('input',()=>{
  cropDraft[input.dataset.cropEdge]=Number(input.value)/100;
  renderCrop();
});
$('resetCrop').addEventListener('click',()=>{cropDraft={...fullCrop};renderCrop();});
cropDialog.addEventListener('close',()=>{
  if(cropDialog.open)return;
  $('cropImage').removeAttribute('src');
  cropLayer=null;
});
cropDialog.querySelector('form').addEventListener('submit',event=>{
  event.preventDefault();
  const layer=cropLayer;
  cropDialog.close();
  if(event.submitter?.value!=='apply'||!layer||selected()!==layer)return;
  const previous=cropBox(layer.crop), next=cropBox(cropDraft);
  const sourceWidth=layer.width/previous.width, sourceHeight=layer.height/previous.height;
  const placement={
    cover:layer.cover,
    x:layer.x+(next.x-previous.x)*sourceWidth,
    y:layer.y+(next.y-previous.y)*sourceHeight,
    width:next.width*sourceWidth,
    height:next.height*sourceHeight
  };
  const crop=Object.values(cropDraft).some(Boolean)?cropDraft:undefined;
  updatePlacement(layer,{...resizePlacement(placement,placement.width),crop});
});
$('delete').addEventListener('click',()=>{
  if(busy||decoding)return;
  const index=layers().indexOf(selected());
  if(index<0)return;
  invalidate();
  URL.revokeObjectURL(layers().splice(index,1)[0].url);
  current().selected=layers().at(Math.min(index,layers().length-1))?.id;
  renderLayers();
});
$('removeSheet').addEventListener('click',()=>{if(busy || decoding || current().sheets.length<2 || info().preview)return;invalidate();for(const l of current().sheets.splice(current().current,1)[0].layers)URL.revokeObjectURL(l.url);current().current=Math.min(current().current,current().sheets.length-1);current().selected=layers().at(-1)?.id;render();});
$('artwork').addEventListener('change',async event=>{
  if(busy||decoding)return;
  const target=layers(), selection=current();
  const files=[...event.target.files];event.target.value='';report('');
  decoding=true;renderLayers();
  for(const file of files){
    if(maxLayers(target,selection)){report('This design has reached the artwork limit.');break;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024**2){report('Use PNG, JPG, or WebP files up to 20 MB.');continue;}
    const url=URL.createObjectURL(file), img=new Image();img.src=url;
    try{
      await img.decode();
      const unit=selection===state['dtf-sheet']?12:selection===state['sublimation-square']?15:100;
      const fill=selection===state['sublimation-all-over']&&!target.length;
      const ratio=img.naturalHeight/img.naturalWidth;
      const width=fill ? Math.max(unit,unit/ratio):Math.min(unit*.68,unit*.68/ratio),height=width*ratio;
      const layer={ id:crypto.randomUUID(), file,url,cover:fill,x:(unit-width)/2,y:(unit-height)/2,width,height };
      target.push(layer);selection.selected=layer.id;invalidate();
    }catch{URL.revokeObjectURL(url);report('One image could not be read.');}
  }
  decoding=false;renderLayers();
});
function renderCart(){
  const rows=cart(), cents=cartLineTotals(rows);
  $('cartRows').replaceChildren(...rows.map((row,index)=>{
    const li=node('li');
    const fields=(row.orderOptions||[]).map(x=>x.size+' × '+x.quantity).join(', ');
    const description=isTransfer(row.productId)?row.totalQuantity+(row.totalQuantity===1?' individual sheet':' individual sheets'):fields||row.totalQuantity+' items';
    li.append(node('strong',row.productName),node('span',description+' · '+money(cents[index])),button('Remove',()=>{if(busy)return;rows.splice(index,1);saveCart(rows);renderCart();}));
    return li;
  }));
  if(!rows.length)$('cartRows').append(node('li','Your cart is empty.'));
  const dtf=rows.filter(row=>row.productId==='dtf-sheet').reduce((sum,row)=>sum+Number(row.totalQuantity),0);
  $('subtotal').textContent='Subtotal '+money(cents.reduce((a,b)=>a+b,0))+(dtf>=3?' · DTF three-sheet savings '+money(dtf*1000-dtfCents(dtf)):'');
  $('cartLink').textContent='Cart ('+rows.reduce((sum,row)=>sum+(Number(row.totalQuantity)||1),0)+')';
  $('checkout').disabled=busy||!rows.length||!enabled;
}
$('add').addEventListener('click',async()=>{
  if($('add').disabled)return;
  const form=new FormData(), sheets=current().sheets.map(sheet=>({layers:sheet.layers.map(({file,x,y,width,height,crop})=>{
    form.append('asset',file);form.append('assetMeta','{}');return {x,y,width,height,crop};
  })}));
  const total=current().sheets.flatMap(sheet=>sheet.layers).reduce((size,layer)=>size+layer.file.size,0);
  if(total>62*1024**2)return report('This batch is too large. Add fewer sheets at a time. The DTF discount still applies across the cart.');
  submissionToken ||= crypto.randomUUID();
  form.append('payload',JSON.stringify({sku,sheets,submissionToken,sandbox}));
  form.append('guestToken',guestToken());
  busy=true;renderLayers();renderCart();report('Uploading your artwork…');
  try{
    const response=await fetch(apiBase+'submit-mqd-transfer',{method:'POST',headers:await headers(),body:form});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Upload failed.');
    const rows=cart();
    if(!rows.some(row=>row.orderNumber===data.orderNumber))rows.push({...data,totalQuantity:data.quantity,orderOptions:[],guest:true});
    saveCart(rows);invalidate();report('Added to cart.');
  }catch(error){report(error.message||'Could not add your artwork.');}
  finally{busy=false;renderLayers();renderCart();}
});
$('checkout').addEventListener('click',async()=>{
  const rows=cart();
  if($('checkout').disabled)return;
  if(rows.some(row=>row.pendingSync||!row.orderNumber||Boolean(row.sandboxTest)!==sandbox)){
    $('cartStatus').textContent='Remove or sync incompatible cart items before continuing.';return;
  }
  const orderNumbers=rows.map(row=>row.orderNumber).sort(),signature=pricingEpoch()+'|'+orderNumbers.join('|');
  const storageKey=originIsLocal?'mqd-transfer-review-checkout':'mqd-checkout-request';
  let previous;try{previous=JSON.parse(localStorage.getItem(storageKey));}catch{}
  const token=previous?.signature===signature?previous.token:crypto.randomUUID();
  localStorage.setItem(storageKey,JSON.stringify({signature,token}));
  busy=true;renderLayers();renderCart();$('cartStatus').textContent='Opening checkout…';
  try{
    const response=await fetch(apiBase+(sandbox?'create-mqd-test-checkout':'create-mqd-guest-checkout'),{method:'POST',headers:{...await headers(),'Content-Type':'application/json'},body:JSON.stringify({orderNumbers,checkoutToken:token,guestToken:guestToken()})});
    const data=await response.json();
    if(!response.ok||!data.url)throw new Error(data.error||'Checkout could not open.');
    location.assign(data.url);
  }catch(error){$('cartStatus').textContent=error.message;}
  finally{busy=false;renderLayers();renderCart();}
});
$('reviewBanner').hidden=!originIsLocal;
render();renderCart();
try {const response=await fetch(apiBase+'submit-mqd-transfer',{headers:originIsLocal?{}:{apikey:key}});enabled=response.ok;}
catch {}
if(!enabled)report('Ordering is currently unavailable. You can still preview your design.');
renderLayers();renderCart();
