const MAX_FILE=8*1024*1024;
export function quotaFor(account){
  const {plan,images}=account||{};
  if(!['basic','plus'].includes(plan)||!Number.isFinite(images?.available)||!Number.isFinite(images?.subscription)||images.subscription<=0)return null;
  const units=plan==='basic'?5:1,reserve=plan==='basic'?10:2;
  return {units,available:images.available,subscription:images.subscription,canGenerate:images.available>=units+reserve};
}
const validFile=f=>f instanceof File&&f.size>0&&f.size<=MAX_FILE&&['image/png','image/jpeg','image/webp'].includes(f.type);
export function createTryOnPilot({pilotHash,expiresAt,providerKey,db,fetcher=fetch,hash,privateTestDailyOverride=false,production=false}){
  const allowed=new Set(['https://mymerchnow.app','https://www.mymerchnow.app','http://127.0.0.1:8786','http://localhost:8786']);
  const originAllowed=o=>allowed.has(o)||/^https:\/\/mqd-designer-vercel(?:-[a-z0-9-]+)?\.vercel\.app$/.test(o);
  return async req=>{
    const origin=req.headers.get('origin')||'';
    const headers={'Cache-Control':'no-store','Vary':'Origin',...(originAllowed(origin)?{'Access-Control-Allow-Origin':origin}:{})};
    const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json'}});
    if(!originAllowed(origin))return json({error:'Open this preview from MyMerchNow.'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-mqd-preview-code, authorization','Access-Control-Max-Age':'600'}});
    if(req.method!=='POST')return json({error:'Method not allowed.'},405);
    const ticket=req.headers.get('x-mqd-preview-code')||'';
    if(!production&&(Date.now()>=Date.parse(expiresAt)||ticket.length<32||await hash(ticket)!==pilotHash))return json({error:'This private preview link is invalid or expired.'},401);
    if(!providerKey)return json({error:'Try-on is awaiting service configuration.'},503);
    let reserved=false,creditPeriod=null;
    try{
      let action,form;
      if((req.headers.get('content-type')||'').includes('application/json'))action=(await req.json()).action;
      else{form=await req.formData();action=form.get('action');}
      if(!['status','generate'].includes(action))return json({error:'Invalid preview request.'},400);
      if(action==='generate'&&(!validFile(form?.get('person'))||!validFile(form?.get('garment'))))return json({error:'Choose a PNG, JPG or WebP photo and shirt image, each under 8 MB.'},400);
      let customer;
      if(production||action==='generate'){
        const token=(req.headers.get('authorization')||'').match(/^Bearer (.+)$/i)?.[1];
        if(!token)return json({error:'Sign in to your MyMerchNow account to use your one daily try-on.'},401);
        const {data,error}=await db.auth.getUser(token);
        if(error||!data?.user?.id||data.user.is_anonymous)return json({error:'Sign in to your MyMerchNow account to use your one daily try-on.'},401);
        customer=data.user.id;
      }
      const accountResponse=await fetcher('https://image-api.photoroom.com/v2/account',{headers:{'x-api-key':providerKey},signal:AbortSignal.timeout(15000)});
      if(!accountResponse.ok)return json({error:'The existing image allowance could not be verified. No try-on was started.'},503);
      const quota=quotaFor(await accountResponse.json());
      if(!quota?.canGenerate)return json({error:'Try-on is paused to protect your existing image allowance. No additional credits will be purchased.'},503);
      const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(production){
        const daily=await db.from('mqd_tryon_customer_daily').select('customer_id').eq('customer_id',customer).eq('usage_day',day).maybeSingle();
        if(daily.error)return json({error:'Your daily allowance could not be verified.'},503);
        if(action==='status')return json({ready:!daily.data,remaining:daily.data?0:1});
        if(daily.data)return json({error:'You have used your one try-on today. Try again after midnight Eastern time.'},429);
      }
      if(action==='status'){
        const {data,error}=await db.from('mqd_tryon_pilot_usage').select('used,busy_until').eq('pilot_id',pilotHash).maybeSingle();
        if(error)return json({error:'The private test limit could not be verified.'},503);
        return json({ready:(data?.used||0)<2,remaining:Math.max(0,2-(data?.used||0)),available:quota.available,unitsPerTryOn:quota.units});
      }
      const period=day.slice(0,7)+(quota.units===5?'-basic':'-plus');
      const {data:canRun,error:reserveError}=production
        ?await db.rpc('mqd_reserve_tryon_credits',{p_period:period,p_available:Math.floor(quota.available),p_units:quota.units})
        :await db.rpc('mqd_reserve_tryon_pilot',{p_pilot_id:pilotHash});
      if(reserveError)return json({error:'The private test limit could not be verified. No try-on was started.'},503);
      if(canRun!==true)return json({error:production?'Try-on is busy or its monthly allowance has been reached. Please try again later.':'A preview is already running, or the two-test allowance has been used.'},429);
      if(production)creditPeriod=period;else reserved=true;
      // Recheck the actual balance after reserving the serialized generation slot.
      const balanceResponse=await fetcher('https://image-api.photoroom.com/v2/account',{headers:{'x-api-key':providerKey},signal:AbortSignal.timeout(15000)});
      if(!balanceResponse.ok||!quotaFor(await balanceResponse.json())?.canGenerate)return json({error:'Try-on is paused to protect the existing allowance. No preview was generated.'},503);
      // Explicit private review exception: still requires sign-in, the expiring
      // capability, prepaid balance and the separate two-attempt pilot cap.
      // Ordinary customer requests retain the daily limit by default.
      if(production||!privateTestDailyOverride){
        const daily=await db.rpc('mqd_reserve_customer_tryon',{p_customer_id:customer});
        if(daily.error)return json({error:'Your daily allowance could not be verified. No try-on was started.'},503);
        if(daily.data!==true)return json({error:'You have used your one try-on today. Try again after midnight Eastern time.'},429);
      }
      const upstream=new FormData();
      upstream.append('imageFile',form.get('garment'),'garment.png');
      upstream.append('virtualModel.model.custom.imageFile',form.get('person'),'person-photo.png');
      upstream.append('virtualModel.scene.custom.imageFile',form.get('person'),'photo-scene.png');
      upstream.append('virtualModel.mode','ai.auto');upstream.append('virtualModel.pose','standing');
      upstream.append('virtualModel.prompt','Replace only the existing upper-body clothing with the supplied garment. Preserve the uploaded person photo as closely as possible: same face, identity, expression, hair, skin, body shape, exact pose, hands, legs, background, lighting, camera angle, crop and framing. Do not beautify, retouch the person, change the scene, expand the image or invent body parts outside the original crop. Preserve the garment color, artwork, logos and lettering exactly. Only the clothing should change.');
      upstream.append('removeBackground','false');upstream.append('referenceBox','originalImage');upstream.append('format','png');
      const result=await fetcher('https://image-api.photoroom.com/v2/edit',{method:'POST',headers:{'x-api-key':providerKey},body:upstream,signal:AbortSignal.timeout(100000)});
      if(!result.ok)return json({error:result.status===402?'The existing image allowance is unavailable. No new credits were purchased.':'Try-on could not generate this image. Please use a clear photo showing your shirt and waist.'},result.status===402?503:502);
      if(!(result.headers.get('content-type')||'').startsWith('image/'))return json({error:'The preview service returned an invalid image.'},502);
      const image=await result.arrayBuffer();if(!image.byteLength||image.byteLength>20*1024*1024)return json({error:'The preview could not be downloaded.'},502);
      return new Response(image,{headers:{...headers,'Content-Type':'image/png','Content-Disposition':'inline; filename=mymerchnow-try-on.png'}});
    }catch{return json({error:'Try-on could not finish. No automatic retry was made.'},502);}
    finally{
      if(creditPeriod)try{await db.rpc('mqd_release_tryon_credits',{p_period:creditPeriod});}catch{}
      if(reserved)try{await db.rpc('mqd_release_tryon_pilot',{p_pilot_id:pilotHash});}catch{ /* The lease expires; reservations remain conservative. */ }
    }
  };
}
