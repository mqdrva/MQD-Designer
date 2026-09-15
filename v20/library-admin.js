import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';

const $=id=>document.getElementById(id);
const SUPABASE_URL='https://gsxuhpffgdffsqksrkrf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ADMIN_URL=SUPABASE_URL+'/functions/v1/mqd-library-admin';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let products=[];

async function request(body){
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  const token=data.session?.access_token;if(!token)throw new Error('Sign in is required.');
  const response=await fetch(ADMIN_URL,{method:'POST',headers:{Authorization:`Bearer ${token}`,apikey:SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||`Request failed (${response.status})`);return result;
}
function showAuth(message='',error=false){$('authCard').classList.remove('hidden');$('adminApp').classList.add('hidden');$('signOut').classList.add('hidden');$('authStatus').textContent=message;$('authStatus').classList.toggle('error',error);}
function renderProducts(){
  $('productGrid').innerHTML='';
  for(const product of products){const label=document.createElement('label');label.className='product-option';label.innerHTML=`<input type="checkbox" value="${product.id}" checked><span>${product.name}</span>`;$('productGrid').appendChild(label);}
}
function selectedProducts(){return [...$('productGrid').querySelectorAll('input:checked')].map(input=>input.value);}
function syncBehaviorFields(){
  const editable=$('placementMode').value==='editable';
  $('preset').innerHTML=editable?'<option value="free">Free placement</option><option value="full">Fill entire zone</option>':'<option value="full">Fill entire zone</option><option value="top">Lock to top edge</option><option value="bottom">Lock to bottom edge</option>';
  $('scaleField').classList.toggle('hidden',!editable||$('preset').value!=='free');$('reverseBack').disabled=editable;$('reverseBack').closest('.check').style.opacity=editable?'.55':'1';
}
async function imageInfo(file){
  const bitmap=await createImageBitmap(file),max=2048,ratio=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*ratio)),height=Math.max(1,Math.round(bitmap.height*ratio)),canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(bitmap,0,0,width,height);bitmap.close();
  const render=await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create the display image.')),'image/webp',.86));
  return{width,height,render};
}
async function uploadSigned(path,signed,file,contentType){
  const token=signed?.token;if(!path||!token)throw new Error('The secure upload link was not created.');
  const {error}=await supabase.storage.from('mqd-library-assets').uploadToSignedUrl(path,token,file,{contentType});if(error)throw error;
}
function queueRow(file){const row=document.createElement('div');row.className='queue-row';row.innerHTML=`<strong></strong><span>Waiting…</span>`;row.querySelector('strong').textContent=file.name;$('uploadQueue').appendChild(row);return row;}
function setQueue(row,message,state=''){row.className='queue-row'+(state?' '+state:'');row.querySelector('span').textContent=message;}
function cleanName(filename){return filename.replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ').replace(/\b\w/g,char=>char.toUpperCase()).trim().slice(0,120);}
async function processFile(file,settings,row,index){
  setQueue(row,'Preparing display image…');const info=await imageInfo(file);
  setQueue(row,'Creating secure upload…');const upload=await request({action:'create-upload',name:cleanName(file.name),mime:file.type,size:file.size});
  setQueue(row,'Uploading private master…');await uploadSigned(upload.masterPath,upload.master,file,file.type);
  setQueue(row,'Uploading customer preview…');await uploadSigned(upload.renderPath,upload.render,info.render,'image/webp');
  setQueue(row,'Publishing placements…');const result=await request({action:'finalize',id:upload.id,name:cleanName(file.name),category:settings.category,placementMode:settings.placementMode,preset:settings.preset,reverseBack:settings.reverseBack,defaultScale:settings.defaultScale,productIds:settings.productIds,masterPath:upload.masterPath,renderPath:upload.renderPath,pixelWidth:info.width,pixelHeight:info.height,sortOrder:index});
  setQueue(row,`Published to ${result.placementCount} garment zones`,'success');
}
async function loadAssets(){
  $('assetGrid').innerHTML='<div class="empty">Loading artwork…</div>';
  try{const result=await request({action:'list'});$('assetGrid').innerHTML='';if(!result.assets?.length){$('assetGrid').innerHTML='<div class="empty">No artwork has been published yet.</div>';return;}
    for(const asset of result.assets){const card=document.createElement('article');card.className='asset-card';card.innerHTML=`${asset.render_url?`<img alt="">`:'<div class="empty">No preview</div>'}<h3></h3><div class="asset-meta"></div><button class="btn" type="button"></button>`;if(asset.render_url){card.querySelector('img').src=asset.render_url;card.querySelector('img').alt=asset.name;}card.querySelector('h3').textContent=asset.name;card.querySelector('.asset-meta').textContent=`${asset.category} · ${asset.placement_mode} · ${asset.placement_preset}${asset.reverse_back?' · Back reversed':''}`;const button=card.querySelector('button');button.textContent=asset.active?'Turn off':'Turn on';button.onclick=async()=>{button.disabled=true;try{await request({action:'set-active',id:asset.id,active:!asset.active});await loadAssets();}catch(error){alert(error.message);}finally{button.disabled=false;}};$('assetGrid').appendChild(card);}
  }catch(error){$('assetGrid').innerHTML=`<div class="empty"></div>`;$('assetGrid').firstElementChild.textContent=error.message;}
}
async function startAdmin(){
  try{const result=await request({action:'products'});products=result.products||[];renderProducts();$('authCard').classList.add('hidden');$('adminApp').classList.remove('hidden');$('signOut').classList.remove('hidden');await loadAssets();}
  catch(error){showAuth(error.message,true);}
}

$('googleSignIn').onclick=async()=>{const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:'https://mymerchnow.app/library-admin.html'}});if(error)showAuth(error.message,true);};
$('signOut').onclick=async()=>{await supabase.auth.signOut();showAuth('Signed out.');};
$('placementMode').onchange=syncBehaviorFields;$('preset').onchange=syncBehaviorFields;
$('assetFiles').onchange=()=>{$('fileSummary').textContent=$('assetFiles').files?.length?`${$('assetFiles').files.length} file${$('assetFiles').files.length===1?'':'s'} selected`:'No files selected.';};
$('selectAllProducts').onclick=()=>$('productGrid').querySelectorAll('input').forEach(input=>input.checked=true);
$('clearProducts').onclick=()=>$('productGrid').querySelectorAll('input').forEach(input=>input.checked=false);
$('refreshAssets').onclick=loadAssets;
$('uploadForm').onsubmit=async event=>{
  event.preventDefault();const files=[...$('assetFiles').files];if(!files.length)return;if(!selectedProducts().length){alert('Select at least one garment.');return;}
  const settings={category:$('category').value,placementMode:$('placementMode').value,preset:$('preset').value,reverseBack:$('placementMode').value==='locked'&&$('reverseBack').checked,defaultScale:Number($('defaultScale').value)||.35,productIds:selectedProducts()};
  const button=$('publishButton');button.disabled=true;$('uploadQueue').innerHTML='';
  for(const [index,file] of files.entries()){const row=queueRow(file);try{await processFile(file,settings,row,index);}catch(error){console.error(error);setQueue(row,error.message,'error');}}
  button.disabled=false;await loadAssets();
};

syncBehaviorFields();supabase.auth.getSession().then(({data})=>data.session?startAdmin():showAuth());supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)startAdmin();if(event==='SIGNED_OUT')showAuth('Signed out.');});

