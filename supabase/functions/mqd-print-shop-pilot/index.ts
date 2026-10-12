import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {hasShopAccess} from './access.js';
import JSZip from 'npm:jszip@3.10.1';
import { PILOT_SHOP, MAX_REQUEST_BYTES, requestEstimate, money, validPhone } from './contract.js';

const PUBLIC_KEY = 'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
const ALLOWED = new Set(['https://mymerchnow.app','https://mqd-designer-vercel-git-codex-print-shop-paid-launch-mqd1.vercel.app','https://mqd-designer-vercel-git-codex-print-shop-launch-preview-mqd1.vercel.app','http://localhost:8765','http://127.0.0.1:8765']);
const RECIPIENTS: Record<string,string> = { pilot:'mqdrva@gmail.com' };
const json = (body:unknown,status=200,headers:Record<string,string>={}) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
async function hash(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function activeShop(db:any,slug:string){
 if(slug==='pilot')return {shop:PILOT_SHOP,recipient:RECIPIENTS.pilot};
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug||''))return null;
 const {data,error}=await db.from('mqd_print_shop_businesses').select('id,shop_config,owner_email,status,pilot_expires_at,billing_status,approved_at,email_verified_at').eq('preferred_slug',slug).in('status',['pilot_active','active']).maybeSingle();
 if(error||!data)return null;
 let account=null;
 if(data.status==='active'){const result=await db.from('mqd_print_shop_subscription_accounts').select('status,period_end').eq('business_id',data.id).maybeSingle();if(result.error)return null;account=result.data;}
 if(!hasShopAccess(data,account))return null;
 return {shop:data.shop_config,recipient:data.owner_email};
}
async function secret(db:any,name:string){const {data,error}=await db.rpc('mqd_get_vault_secret',{secret_name:name});return error?'':String(data||'');}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'',cors:Record<string,string>={'Vary':'Origin'};
 if(ALLOWED.has(origin)){cors['Access-Control-Allow-Origin']=origin;cors['Access-Control-Allow-Headers']='apikey,content-type';cors['Access-Control-Allow-Methods']='GET,POST,OPTIONS';}
 if(origin&&!ALLOWED.has(origin))return json({error:'This origin is unavailable.'},403,cors);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 // Guest access uses the published application key; it never grants access to request records.
 if(req.headers.get('apikey')!==PUBLIC_KEY)return json({error:'Application key required.'},401,cors);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 if(req.method==='GET') {
   const slug=new URL(req.url).searchParams.get('shop');
   const record=await activeShop(db,slug||'');return record?json({shop:record.shop},200,cors):json({error:'Shop not found or inactive.'},404,cors);
 }
 if(req.method!=='POST')return json({error:'Method not allowed.'},405,cors);
 try {
   if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))return json({error:'Use the order request form.'},400,cors);
   if(Number(req.headers.get('content-length')||0)>MAX_REQUEST_BYTES+100000)return json({error:'Request package exceeds 8 MB.'},413,cors);
   const reader=req.body?.getReader();if(!reader)throw new Error('Request body missing.');
   const chunks:Uint8Array[]=[];let length=0;
   while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>MAX_REQUEST_BYTES+100000){await reader.cancel();return json({error:'Request package exceeds 8 MB.'},413,cors);}chunks.push(value);}
   const body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
   const form=await new Request(req.url,{method:'POST',headers:{'Content-Type':req.headers.get('content-type')!},body}).formData();
   const raw=form.get('payload');if(typeof raw!=='string'||raw.length>20000)throw new Error('Request details are invalid.');
   const payload=JSON.parse(raw),file=form.get('package');
   const record=await activeShop(db,payload.shop);if(!record)throw new Error('Shop unavailable or inactive.');const shop=record.shop;
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId||''))throw new Error('Request identifier invalid.');
   const started=Number(payload.startedAt);if(payload.website||!Number.isFinite(started)||Date.now()-started<2000||Date.now()-started>86400000)throw new Error('Refresh the page and complete the request form.');
   const customer=payload.customer;
   if(!customer||typeof customer.name!=='string'||!customer.name.trim()||customer.name.length>100||typeof customer.email!=='string'||customer.email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(customer.email)||/[\r\n]/.test(customer.email)||typeof customer.phone!=='string'||customer.phone.length>40||typeof customer.notes!=='string'||customer.notes.length>1500)throw new Error('Enter valid contact details.');
   if(!validPhone(customer.phone))throw new Error('Enter a valid phone number with 7 to 15 digits.');
   if(!(file instanceof File)||file.size<22||file.size>MAX_REQUEST_BYTES)throw new Error('Attach a valid design package under 8 MB.');
   const bytes=new Uint8Array(await file.arrayBuffer());
   if(bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)throw new Error('The design package must be a ZIP.');
   const s=payload.summary,estimate=requestEstimate(shop,s);
   const zip=await JSZip.loadAsync(bytes),entries=Object.values(zip.files).filter((entry:any)=>!entry.dir) as any[];
   if(entries.length>60||entries.some(entry=>entry.name.includes('..')||entry.name.startsWith('/')||!/^([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(json|txt|png|jpg|jpeg|webp)$/i.test(entry.name))||entries.reduce((n,entry)=>n+(entry._data?.uncompressedSize||0),0)>32*1024*1024)throw new Error('Design package contains unsupported files or is too large.');
   const designFile=zip.file('design.json'),orderFile=zip.file('order-request.json');
   if(!designFile||!orderFile||(designFile as any)._data.uncompressedSize>24*1024*1024||(orderFile as any)._data.uncompressedSize>20000)throw new Error('Design package details are missing.');
   const design=JSON.parse(await designFile.async('string')),packOrder=JSON.parse(await orderFile.async('string'));
   if(design.schema!=='mqd-shop-design-v1'||design.engine!==s.engine||design.shop!==payload.shop||packOrder.productId!==s.productId||packOrder.printMethod!==s.printMethod||(s.engine==='2d'&&design.draft?.printMethod!==s.printMethod)||JSON.stringify(packOrder.orderOptions)!==JSON.stringify(s.orderOptions)||(s.engine==='2d'?design.draft?.product:design.design?.product?.id)!==s.productId)throw new Error('Design package does not match the order request.');
   const key=Deno.env.get('MQD_RESEND_API_KEY')||await secret(db,'mqd_resend_api_key');
   const from=Deno.env.get('MQD_EMAIL_FROM')||await secret(db,'mqd_email_from')||'MYMERCHNOW Print Shops <notifications@mymerchnow.app>';
   if(!key)return json({error:'Pilot email delivery is not configured. Save your design package and contact the shop.'},503,cors);
   const contentHash=await hash(new TextEncoder().encode(JSON.stringify({shop:payload.shop,customer,summary:s,packageHash:await hash(bytes)})));
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
   const ipHash=await hash(new TextEncoder().encode((Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'')+ip));
   const {data,error}=await db.rpc('mqd_claim_print_shop_request',{p_id:payload.requestId,p_shop:payload.shop,p_ip:ipHash,p_hash:contentHash});
   if(error)return json({error:error.message.includes('limit')?'Request limit reached. Please contact the shop directly.':'Request could not be reserved. Retry the same request.'},error.message.includes('limit')?429:409,cors);
   const row=data?.[0];if(!row)throw new Error('Request could not be reserved.');
   if(row.status==='sent')return json({reference:row.reference,status:'sent'},200,cors);
   let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   const text=[`${shop.name} — UNPAID ORDER REQUEST`,row.reference,'',`Customer: ${customer.name}`,`Email: ${customer.email}`,`Phone: ${customer.phone||'Not provided'}`,`Designer: ${s.engine}`,`Garment: ${shop.garments?.[s.productId]?.brand||''} ${shop.garments?.[s.productId]?.style||s.productId}`,`Color: ${String(s.color||'See design package').slice(0,80)}`,`Print method: ${shop.printMethods[s.printMethod] || s.printMethod}`,`Sizes: ${s.orderOptions.map((r:any)=>`${r.size} x ${r.quantity}`).join(', ')}`,estimate.quoteRequired ? `Estimated total: Shop quote required${s.printMethod==='sublimation'?' — confirm garment and fabric suitability':''}` : `Estimated total: ${money(estimate.totalCents)} (estimate; excludes tax/shipping)`,`Notes: ${customer.notes||'None'}`,'','Attached ZIP contains mockups, original artwork, and editable design details. Review print readiness and quote/payment directly with the customer. No customer email confirmation or payment was sent.'].join('\n');
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`shop-${row.id}`},body:JSON.stringify({from,to:[record.recipient],reply_to:customer.email,subject:`[Print-shop pilot] ${row.reference} — unpaid order request`,text,attachments:[{filename:`${row.reference}-design.zip`,content:btoa(binary)}]})});
   const result=await response.json();
   if(!response.ok){await db.from('mqd_print_shop_requests').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',row.id);return json({error:'The email service could not accept your request. Your design is still here. Retry or save the ZIP.'},502,cors);}
   await db.from('mqd_print_shop_requests').update({status:'sent',provider_id:String(result.id||''),updated_at:new Date().toISOString()}).eq('id',row.id);
   return json({reference:row.reference,status:'sent'},200,cors);
 }catch(error){console.error('Print shop request failed',error instanceof Error?error.message:'Invalid request');return json({error:error instanceof Error?error.message:'Request could not be processed.'},400,cors);}
});
