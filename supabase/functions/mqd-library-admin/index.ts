import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

type Zone={name:string;width:number;height:number};
type Product={id:string;name:string;zones:Zone[]};

const PRODUCTS:Product[]=[
  {id:'tshirt',name:'All-Over Print T-Shirt',zones:[['Front',3763,4992],['Back',3750,5011],['Left Sleeve',2841,1702],['Right Sleeve',2841,1702],['Collar',3276,435]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'long-sleeve-tshirt',name:'Long Sleeve T-Shirt',zones:[['Front',3763,4992],['Back',3750,5011],['Left Sleeve',2690,4120],['Right Sleeve',2690,4120],['Collar',3276,435]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'short-sleeve-polo',name:'Short Sleeve Polo',zones:[['Front',3730,4980],['Back',3730,5080],['Left Sleeve',2930,1740],['Right Sleeve',2930,1740],['Collar',3180,1130]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'long-sleeve-polo',name:'Long Sleeve Polo',zones:[['Front',3730,4980],['Back',3730,5080],['Left Sleeve',2690,4120],['Right Sleeve',2690,4120],['Collar',3180,1130]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'fleece-hoodie',name:'Fleece Hoodie',zones:[['Front',3865,3884],['Back',3865,4006],['Left Sleeve',3276,6124],['Right Sleeve',3276,6124],['Hood',4684,2073]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'lightweight-jacket',name:'Lightweight Jacket',zones:[['Front',4220,4740],['Back',3865,4006],['Left Sleeve',3276,6124],['Right Sleeve',3276,6124],['Hood',4684,2073]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'mask',name:'Mask',zones:[{name:'Entire Mask',width:3100,height:3110}]},
  {id:'hood-mask-shirt',name:'Long Sleeve Shirt With Hood And Built-In Mask',zones:[['Front',3763,4992],['Back',3750,5011],['Left Sleeve',2690,4120],['Right Sleeve',2690,4120],['Hood',4684,2073],['Built-In Mask',3100,3110]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'shorts',name:'Shorts',zones:[['Front',2145,3480],['Back',2455,3650]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'sweat-pants',name:'Sweat Pants',zones:[['Front',3670,5960],['Back',3670,5960]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'hooded-long-sleeve',name:'Long Sleeve Shirt With Hood',zones:[['Front',3763,4992],['Back',3750,5011],['Left Sleeve',2690,4120],['Right Sleeve',2690,4120],['Hood',4684,2073]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))},
  {id:'hat',name:'Hat',zones:[['Front Panel',1151,1050],['Top of Bill',1169,941]].map(([name,width,height])=>({name:String(name),width:Number(width),height:Number(height)}))}
];

const allowedOrigins=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','https://mqd-designer-vercel.vercel.app']);
function allowedOrigin(origin:string){return allowedOrigins.has(origin)||/^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(origin);}
function cors(req:Request){const origin=req.headers.get('origin')||'';return{'Access-Control-Allow-Origin':allowedOrigin(origin)?origin:'https://mymerchnow.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors(req),'Content-Type':'application/json','Cache-Control':'private, no-store'}});}
function serviceKey(){return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||Deno.env.get('SUPABASE_SECRET_KEY')||'';}
function slugify(value:string){return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)||'artwork';}
function extensionFor(mime:string){return mime==='image/png'?'png':mime==='image/jpeg'?'jpg':mime==='image/webp'?'webp':'';}
function placementY(preset:string,assetWidth:number,assetHeight:number,zone:Zone){
  if(preset!=='top'&&preset!=='bottom')return 0;
  const imageAspect=assetWidth/assetHeight,zoneAspect=zone.width/zone.height;
  const overflow=Math.max(0,zoneAspect/imageAspect-1)*100;
  return Math.max(-900,Math.min(900,preset==='top'?overflow:-overflow));
}
async function objectExists(supabase:any,path:string){
  const slash=path.lastIndexOf('/'),folder=slash<0?'':path.slice(0,slash),name=slash<0?path:path.slice(slash+1);
  const {data,error}=await supabase.storage.from('mqd-library-assets').list(folder,{limit:10,search:name});
  return !error&&!!data?.some((row:any)=>row.name===name);
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors(req)});
  if(req.method!=='POST')return json(req,{error:'Method not allowed'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',key=serviceKey();
    if(!url||!key)return json(req,{error:'Backend service credentials are not configured'},500);
    const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(!token)return json(req,{error:'Sign in is required'},401);
    const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userError}=await supabase.auth.getUser(token);
    if(userError||!user)return json(req,{error:'Your sign-in session is invalid or expired'},401);
    if(user.app_metadata?.role!=='admin')return json(req,{error:'Artwork library owner access is required'},403);
    const body=await req.json().catch(()=>({})),action=String(body?.action||'');

    if(action==='products')return json(req,{products:PRODUCTS});
    if(action==='list'){
      const {data,error}=await supabase.from('mqd_library_assets').select('id,name,slug,category,placement_mode,placement_preset,reverse_back,stack_order,sort_order,active,master_path,render_path,pixel_width,pixel_height,created_at').order('sort_order').order('name');
      if(error)return json(req,{error:error.message},500);
      const active=(data||[]).filter((row:any)=>row.active),{data:signed}=active.length?await supabase.storage.from('mqd-library-assets').createSignedUrls(active.map((row:any)=>row.render_path),600):{data:[]};
      const urls=new Map((signed||[]).map((row:any)=>[row.path,row.signedUrl]));
      return json(req,{assets:(data||[]).map((row:any)=>({...row,render_url:urls.get(row.render_path)||null}))});
    }
    if(action==='create-upload'){
      const name=String(body?.name||'').trim().slice(0,120),mime=String(body?.mime||''),size=Number(body?.size)||0,ext=extensionFor(mime);
      if(!name||!ext)return json(req,{error:'A PNG, JPEG, or WebP file is required'},400);
      if(size<1||size>50*1024*1024)return json(req,{error:'Each master must be 50 MB or smaller'},400);
      const id=crypto.randomUUID(),masterPath=`masters/${id}.${ext}`,renderPath=`renders/${id}.webp`;
      const {data:master,error:masterError}=await supabase.storage.from('mqd-library-assets').createSignedUploadUrl(masterPath);
      if(masterError)return json(req,{error:masterError.message},500);
      const {data:render,error:renderError}=await supabase.storage.from('mqd-library-assets').createSignedUploadUrl(renderPath);
      if(renderError)return json(req,{error:renderError.message},500);
      return json(req,{id,masterPath,renderPath,master,render});
    }
    if(action==='finalize'){
      const id=String(body?.id||''),name=String(body?.name||'').trim().slice(0,120),category=String(body?.category||''),placementMode=String(body?.placementMode||''),preset=String(body?.preset||''),masterPath=String(body?.masterPath||''),renderPath=String(body?.renderPath||''),pixelWidth=Math.round(Number(body?.pixelWidth)||0),pixelHeight=Math.round(Number(body?.pixelHeight)||0),reverseBack=!!body?.reverseBack;
      const selected=new Set((Array.isArray(body?.productIds)?body.productIds:PRODUCTS.map(p=>p.id)).map(String));
      if(!id||!name||!['background','icon'].includes(category)||!['locked','editable'].includes(placementMode)||!['full','top','bottom','free'].includes(preset)||pixelWidth<1||pixelHeight<1)return json(req,{error:'The artwork settings are incomplete'},400);
      if(masterPath!==`masters/${id}.${masterPath.split('.').pop()}`||renderPath!==`renders/${id}.webp`)return json(req,{error:'Invalid upload paths'},400);
      if(!await objectExists(supabase,masterPath)||!await objectExists(supabase,renderPath))return json(req,{error:'Both the master and display image must finish uploading first'},400);
      let slug=slugify(String(body?.slug||name)),suffix=1;
      while(true){const {data}=await supabase.from('mqd_library_assets').select('id').eq('slug',slug).maybeSingle();if(!data)break;slug=`${slugify(name)}-${++suffix}`;}
      const stackOrder=preset==='full'?0:preset==='top'||preset==='bottom'?10:20,sortOrder=Math.max(0,Math.min(100000,Math.round(Number(body?.sortOrder)||0)));
      const {error:assetError}=await supabase.from('mqd_library_assets').insert({id,name,slug,category,placement_mode:placementMode,placement_preset:preset,master_path:masterPath,render_path:renderPath,pixel_width:pixelWidth,pixel_height:pixelHeight,reverse_back:reverseBack,stack_order:stackOrder,sort_order:sortOrder,active:false});
      if(assetError)return json(req,{error:assetError.message},500);
      const scale=preset==='free'?Math.max(.05,Math.min(4,Number(body?.defaultScale)||.35)):1;
      const placements=PRODUCTS.filter(product=>selected.has(product.id)).flatMap(product=>product.zones.map(zone=>({asset_id:id,product_id:product.id,zone_name:zone.name,x:0,y:placementY(preset,pixelWidth,pixelHeight,zone),scale,rotation:0,flip_x:reverseBack&&zone.name==='Back',flip_y:false,crop:{left:0,top:0,right:0,bottom:0}})));
      if(!placements.length){await supabase.from('mqd_library_assets').delete().eq('id',id);return json(req,{error:'Select at least one garment'},400);}
      const {error:placementError}=await supabase.from('mqd_library_asset_placements').insert(placements);
      if(placementError){await supabase.from('mqd_library_assets').delete().eq('id',id);return json(req,{error:placementError.message},500);}
      const {error:activateError}=await supabase.from('mqd_library_assets').update({active:true,updated_at:new Date().toISOString()}).eq('id',id);
      if(activateError)return json(req,{error:activateError.message},500);
      return json(req,{ok:true,id,slug,placementCount:placements.length});
    }
    if(action==='set-active'){
      const id=String(body?.id||''),active=!!body?.active;
      const {error}=await supabase.from('mqd_library_assets').update({active,updated_at:new Date().toISOString()}).eq('id',id);
      if(error)return json(req,{error:error.message},500);
      return json(req,{ok:true});
    }
    return json(req,{error:'Unsupported action'},400);
  }catch(error){console.error(error);return json(req,{error:error instanceof Error?error.message:String(error)},500);}
});
