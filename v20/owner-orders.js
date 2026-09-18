import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

const $=id=>document.getElementById(id);
const SUPABASE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ORDERS_URL=SUPABASE_URL+'/functions/v1/mqd-owner-orders';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const STATUS_LABELS={new:'New',paid:'Paid','in-production':'In Production',shipped:'Shipped',completed:'Completed',cancelled:'Cancelled',test:'Test'};
let activeStatus='all',activeSearch='',currentDetail=null,searchTimer=0;

async function request(body){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  const token=data.session?.access_token;if(!token)throw new Error('Sign in is required.');
  const response=await fetch(ORDERS_URL,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Request failed (${response.status})`);return result;
}
function text(el,value='—'){if(el)el.textContent=value==null||value===''?'—':String(value);}
function money(value,currency='USD'){const n=Number(value);if(!Number.isFinite(n))return '—';try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD'}).format(n);}catch{return '$'+n.toFixed(2);}}
function dateTime(value){if(!value)return '—';const d=new Date(value);return Number.isNaN(d.getTime())?'—':d.toLocaleString();}
function safePart(value){return String(value||'file').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,100)||'file';}
function statusBadge(status){const span=document.createElement('span');span.className='status-badge '+String(status||'new');span.textContent=STATUS_LABELS[status]||status||'New';return span;}function testBadge(){const span=document.createElement('span');span.className='test-badge';span.textContent='TEST';return span;}
function optionsText(item){const options=Array.isArray(item?.order_options)?item.order_options:[];if(!options.length)return `Qty ${Number(item?.quantity)||1}`;return options.map(o=>`${o?.size?o.size+' × ':''}${Number(o?.quantity)||1}`).join(', ');}
function itemQuantity(item){const options=Array.isArray(item?.order_options)?item.order_options:[];return options.length?options.reduce((n,o)=>n+(Number(o?.quantity)||0),0):(Number(item?.quantity)||1);}
function orderTotal(order){if(order.amount_paid!=null)return Number(order.amount_paid)||0;return (order.items||[]).reduce((sum,item)=>sum+(Number(item.unit_price)||0)*itemQuantity(item),0);}
function formatAddress(address){if(!address||typeof address!=='object')return '—';return [address.line1,address.line2,[address.city,address.state,address.postal_code].filter(Boolean).join(', '),address.country].filter(Boolean).join('\n')||'—';}
function showAuth(message='',error=false){$('authCard').classList.remove('hidden');$('ordersApp').classList.add('hidden');$('signOut').classList.add('hidden');text($('authStatus'),message||'');$('authStatus').classList.toggle('error',error);}
function setOrdersMessage(message='',error=false){text($('ordersMessage'),message||'');$('ordersMessage').classList.toggle('error',error);}

function renderCounts(counts={}){
  text($('countAll'),counts.all??0);text($('countNew'),counts.new??0);text($('countPaid'),counts.paid??0);text($('countProduction'),counts['in-production']??0);text($('countShipped'),counts.shipped??0);text($('countCompleted'),counts.completed??0);text($('countTest'),counts.test??0);
}
function renderOrders(rows=[]){
  const body=$('ordersBody');body.innerHTML='';$('ordersEmpty').classList.toggle('hidden',rows.length>0);
  for(const order of rows){
    const tr=document.createElement('tr');
    const orderCell=document.createElement('td');const ref=document.createElement('div');ref.className='order-link';ref.textContent=order.order_number;const product=document.createElement('div');product.className='muted';product.textContent=order.product_name||'Custom garment';orderCell.append(ref,product);if(order.is_test===true)orderCell.appendChild(testBadge());
    const customerCell=document.createElement('td');const customer=document.createElement('div');customer.textContent=order.customer_name||order.shipping_name||'Customer';const email=document.createElement('div');email.className='muted';email.textContent=order.customer_email||'';customerCell.append(customer,email);
    const garmentCell=document.createElement('td');const item=order.items?.[0];const garment=document.createElement('div');garment.textContent=item?.product_name||order.product_name||'Custom garment';const sizes=document.createElement('div');sizes.className='qty-list';for(const option of item?.order_options||[]){const chip=document.createElement('span');chip.className='size-chip';chip.textContent=`${option.size||'Qty'} × ${Number(option.quantity)||1}`;sizes.appendChild(chip);}if(!sizes.childElementCount){const chip=document.createElement('span');chip.className='size-chip';chip.textContent=optionsText(item);sizes.appendChild(chip);}garmentCell.append(garment,sizes);
    const qtyCell=document.createElement('td');qtyCell.textContent=String((order.items||[]).reduce((n,x)=>n+itemQuantity(x),0)||1);
    const amountCell=document.createElement('td');amountCell.textContent=money(orderTotal(order),order.currency||'USD');
    const statusCell=document.createElement('td');if(order.is_test===true)statusCell.appendChild(testBadge());statusCell.appendChild(statusBadge(order.ui_status));
    const dateCell=document.createElement('td');dateCell.textContent=new Date(order.created_at).toLocaleDateString();
    const actionCell=document.createElement('td');const button=document.createElement('button');button.className='view-btn';button.type='button';button.textContent='View';button.onclick=()=>openOrder(order.id);actionCell.appendChild(button);
    tr.append(orderCell,customerCell,garmentCell,qtyCell,amountCell,statusCell,dateCell,actionCell);body.appendChild(tr);
  }
}
async function loadOrders(){
  setOrdersMessage('Loading orders…');
  try{const result=await request({action:'list',status:activeStatus,search:activeSearch});renderCounts(result.counts||{});renderOrders(result.orders||[]);setOrdersMessage(result.orders?.length?`${result.orders.length} order${result.orders.length===1?'':'s'} shown.`:'');}
  catch(error){console.error(error);renderOrders([]);setOrdersMessage(error.message,true);if(/access|required|sign in/i.test(error.message))showAuth(error.message,true);}
}
async function startAdmin(){
  try{await request({action:'list',status:'all',search:''});$('authCard').classList.add('hidden');$('ordersApp').classList.remove('hidden');$('signOut').classList.remove('hidden');await loadOrders();}
  catch(error){showAuth(error.message,true);}
}

function downloadBlob(filename,blob){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function downloadJSON(filename,value){downloadBlob(filename,new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));}
async function fetchBlob(url){const response=await fetch(url);if(!response.ok)throw new Error(`Download failed (${response.status})`);return await response.blob();}
function zoneMetadata(detail){const zones=detail?.order?.design_json?.design?.zones||{};return Object.fromEntries(Object.entries(zones).map(([zone,state])=>[zone,{backgroundHex:detail.order.background_colors?.[zone]||state?.background||'#FFFFFF',layers:(state?.layers||[]).map(layer=>{const copy={...layer};delete copy.src;delete copy.image;return copy;})}]));}

function renderItems(items=[]){
  const host=$('itemList');host.innerHTML='';for(const item of items){const row=document.createElement('div');row.className='item-row';const left=document.createElement('div');const title=document.createElement('strong');title.textContent=item.product_name||'Custom garment';const meta=document.createElement('div');meta.className='item-meta';meta.textContent=`${optionsText(item)} · ${money(item.unit_price)} each`;left.append(title,meta);const right=document.createElement('strong');right.textContent=`Qty ${itemQuantity(item)}`;row.append(left,right);host.appendChild(row);}if(!items.length)host.innerHTML='<div class="empty">No item record found.</div>';
}
function renderColors(colors={}){const host=$('colorGrid');host.innerHTML='';for(const [zone,hex] of Object.entries(colors||{})){const chip=document.createElement('div');chip.className='color-chip';const swatch=document.createElement('span');swatch.className='swatch';swatch.style.background=String(hex||'#fff');const label=document.createElement('span');label.textContent=`${zone}: ${hex}`;chip.append(swatch,label);host.appendChild(chip);}if(!host.childElementCount)host.textContent='No HEX colors saved.';}
function metadataButton(label,filename,data){const button=document.createElement('button');button.type='button';button.className='file-button';button.textContent=label;button.onclick=()=>downloadJSON(filename,data);return button;}
function renderAssets(detail){
  const host=$('assetGroups');host.innerHTML='';const assets=detail.assets||[],zoneFiles=assets.filter(a=>a.layer_type==='zone'),artwork=assets.filter(a=>a.layer_type==='image'),textAssets=assets.filter(a=>a.layer_type==='text');
  $('zoneFallback').classList.toggle('hidden',zoneFiles.length>0);
  const addGroup=(title,rows)=>{if(!rows.length)return;const group=document.createElement('section');group.className='asset-group';const h=document.createElement('h4');h.textContent=title;const list=document.createElement('div');list.className='asset-list';for(const asset of rows){const row=document.createElement('div');row.className='asset-row';const label=document.createElement('span');label.textContent=`${asset.zone_name}${asset.original_filename?' · '+asset.original_filename:''}`;row.appendChild(label);if(asset.download_url){const a=document.createElement('a');a.href=asset.download_url;a.target='_blank';a.rel='noopener';a.textContent='Download';row.appendChild(a);}else{row.appendChild(metadataButton('Download JSON',`${safePart(asset.zone_name)}-${safePart(asset.layer_id||asset.layer_type)}.json`,asset.metadata||asset));}list.appendChild(row);}group.append(h,list);host.appendChild(group);};
  addGroup('Captured zone files',zoneFiles);addGroup('Original artwork',artwork);addGroup('Text / layer metadata',textAssets);
  if(detail.order?.mockup_url){const group=document.createElement('section');group.className='asset-group';const h=document.createElement('h4');h.textContent='Mockup';const row=document.createElement('div');row.className='asset-row';const label=document.createElement('span');label.textContent='Customer 3D mockup PNG';const a=document.createElement('a');a.href=detail.order.mockup_url;a.target='_blank';a.rel='noopener';a.textContent='Download';row.append(label,a);group.append(h,row);host.prepend(group);}
}
function renderDetail(detail){
  currentDetail=detail;const order=detail.order||{};$('detailLoading').classList.add('hidden');$('detailContent').classList.remove('hidden');$('detailContent').classList.remove('loading');$('orderOverlay').classList.remove('loading');document.querySelector('.drawer')?.classList.remove('loading');text($('detailTitle'),order.order_number||'Order');text($('detailSubtitle'),`${order.is_test===true?'TEST ORDER · ':''}${STATUS_LABELS[order.ui_status]||order.ui_status||'New'} · ${order.product_name||'Custom garment'}`);
  const img=$('mockupImage'),missing=$('mockupMissing');if(order.mockup_url){img.src=order.mockup_url;img.classList.remove('hidden');missing.classList.add('hidden');}else{img.removeAttribute('src');img.classList.add('hidden');missing.classList.remove('hidden');}
  const locked=order.is_test===true;
  const status=$('detailStatus'),carrier=$('detailCarrier'),tracking=$('detailTracking'),save=$('saveOrderUpdate');
  status.value=['new','paid','in-production','shipped','completed'].includes(order.ui_status)?order.ui_status:'new';carrier.value=order.shipping_carrier||'';tracking.value=order.tracking_number||'';
  for(const control of [status,carrier,tracking,save]){control.disabled=locked;control.removeAttribute('readonly');control.setAttribute('aria-disabled',locked?'true':'false');control.style.pointerEvents=locked?'none':'auto';control.style.opacity=locked?'.55':'1';}
  if(!locked){carrier.tabIndex=0;tracking.tabIndex=0;status.tabIndex=0;save.tabIndex=0;}
  $('testOrderNotice').classList.toggle('hidden',!locked);
  text($('customerName'),order.customer_name||order.shipping_name);text($('customerEmail'),order.customer_email);text($('customerPhone'),order.customer_phone);text($('shippingName'),order.shipping_name||order.customer_name);text($('shippingAddress'),formatAddress(order.shipping_address));$('shippingAddress').style.whiteSpace='pre-line';text($('orderReference'),order.order_number);text($('orderPaid'),order.paid_at?`${money(order.amount_paid,order.currency||'USD')} · ${dateTime(order.paid_at)}`:'Not marked paid');text($('orderCreated'),dateTime(order.created_at));renderItems(detail.items||[]);renderColors(order.background_colors||{});renderAssets(detail);
}
async function openOrder(id){
  $('orderOverlay').classList.remove('hidden');$('detailLoading').classList.remove('hidden');$('detailContent').classList.add('hidden');text($('detailLoading'),'Loading order…');
  try{const detail=await request({action:'detail',id});renderDetail(detail);}catch(error){text($('detailLoading'),error.message);$('detailLoading').classList.add('error');}
}
function closeDetail(){$('orderOverlay').classList.add('hidden');currentDetail=null;$('updateMessage').textContent='';}

async function saveOrderUpdate(){
  if(!currentDetail)return;if(currentDetail.order?.is_test===true){$('updateMessage').textContent='Sandbox test orders are locked and cannot be sent to production or shipping.';$('updateMessage').className='message error';return;}const button=$('saveOrderUpdate'),old=button.textContent;button.disabled=true;button.textContent='Saving…';$('updateMessage').textContent='';
  try{await request({action:'update',id:currentDetail.order.id,status:$('detailStatus').value,carrier:$('detailCarrier').value,trackingNumber:$('detailTracking').value});$('updateMessage').textContent='Saved ✓';$('updateMessage').className='message success';const refreshed=await request({action:'detail',id:currentDetail.order.id});renderDetail(refreshed);await loadOrders();}
  catch(error){$('updateMessage').textContent=error.message;$('updateMessage').className='message error';}
  finally{button.disabled=false;button.textContent=old;}
}
async function downloadProductionZip(){
  if(!currentDetail||!window.JSZip)return;const button=$('downloadProductionZip'),old=button.textContent;button.disabled=true;button.textContent='Building ZIP…';
  try{
    const detail=currentDetail,order=detail.order,zip=new JSZip(),root=zip.folder(`${safePart(order.order_number)}-production`);root.file('design.json',JSON.stringify(order.design_json||{},null,2));root.file('background-colors.json',JSON.stringify(order.background_colors||{},null,2));root.file('order-summary.json',JSON.stringify({orderNumber:order.order_number,status:order.ui_status,customer:{name:order.customer_name,email:order.customer_email,phone:order.customer_phone},shipping:{name:order.shipping_name,address:order.shipping_address,carrier:order.shipping_carrier,trackingNumber:order.tracking_number},items:detail.items||[],createdAt:order.created_at,paidAt:order.paid_at},null,2));
    const zones=zoneMetadata(detail);for(const [zone,data] of Object.entries(zones))root.file(`zones/${safePart(zone)}.json`,JSON.stringify(data,null,2));
    if(order.mockup_url)root.file('mockup.png',new Uint8Array(await (await fetchBlob(order.mockup_url)).arrayBuffer()));
    for(const asset of detail.assets||[]){if(asset.download_url){const ext=(asset.original_filename||asset.storage_path||'file').split('.').pop()||'bin',name=asset.original_filename||`${safePart(asset.layer_type)}.${safePart(ext)}`,folder=asset.layer_type==='zone'?'zones':asset.layer_type==='image'?`original-assets/${safePart(asset.zone_name)}`:`assets/${safePart(asset.zone_name)}`;root.file(`${folder}/${safePart(name)}`,new Uint8Array(await (await fetchBlob(asset.download_url)).arrayBuffer()));}else if(asset.metadata){root.file(`metadata/${safePart(asset.zone_name)}/${safePart(asset.layer_id||asset.layer_type)}.json`,JSON.stringify(asset.metadata,null,2));}}
    const blob=await zip.generateAsync({type:'blob'});downloadBlob(`${safePart(order.order_number)}-production.zip`,blob);
  }catch(error){alert('Production ZIP could not be created: '+error.message);}finally{button.disabled=false;button.textContent=old;}
}

$('googleSignIn').onclick=async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://mymerchnow.app/owner-orders.html'}});if(error)showAuth(error.message,true);};
$('signOut').onclick=async()=>{await supabase.auth.signOut();showAuth('Signed out.');};
$('refreshOrders').onclick=loadOrders;$('closeDetail').onclick=closeDetail;$('orderOverlay').onclick=e=>{if(e.target===$('orderOverlay'))closeDetail();};$('saveOrderUpdate').onclick=saveOrderUpdate;$('downloadProductionZip').onclick=downloadProductionZip;
$('downloadDesign').onclick=()=>currentDetail&&downloadJSON(`${safePart(currentDetail.order.order_number)}-design.json`,currentDetail.order.design_json||{});$('downloadColors').onclick=()=>currentDetail&&downloadJSON(`${safePart(currentDetail.order.order_number)}-background-colors.json`,currentDetail.order.background_colors||{});$('downloadOrderSummary').onclick=()=>currentDetail&&downloadJSON(`${safePart(currentDetail.order.order_number)}-summary.json`,{order:currentDetail.order,items:currentDetail.items,savedDesign:currentDetail.savedDesign});
$('statusFilter').onchange=e=>{activeStatus=e.target.value;document.querySelectorAll('.stat-card').forEach(card=>card.classList.toggle('active',card.dataset.status===activeStatus));loadOrders();};
$('orderSearch').oninput=e=>{activeSearch=e.target.value.trim();clearTimeout(searchTimer);searchTimer=setTimeout(loadOrders,280);};
document.querySelectorAll('.stat-card').forEach(card=>card.onclick=()=>{activeStatus=card.dataset.status;$('statusFilter').value=activeStatus;document.querySelectorAll('.stat-card').forEach(x=>x.classList.toggle('active',x===card));loadOrders();});

supabase.auth.getSession().then(({data})=>data.session?startAdmin():showAuth());supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)startAdmin();if(event==='SIGNED_OUT')showAuth('Signed out.');});
