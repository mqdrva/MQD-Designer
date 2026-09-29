import {validateArtworkFile} from '../v20/ai-transfer-contract.js';

export const config={runtime:'edge'};
const MAX_BYTES=20*1024*1024;
const fail=(status,error)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});

// Only signed ChatGPT file hosts are accepted. No user URLs, cookies, redirect
// following, server credentials, or durable public uploads are involved.
export default async function handler(request){
  if(request.method!=='POST')return fail(405,'Use POST.');
  let file;
  try{
    const text=await request.text();
    if(text.length>18000)return fail(413,'Invalid file reference.');
    file=validateArtworkFile(JSON.parse(text));
  }catch{return fail(400,'A valid ChatGPT image file is required.');}
  let upstream;
  try{upstream=await fetch(file.download_url,{redirect:'error',credentials:'omit',signal:AbortSignal.timeout(20000)});}
  catch{return fail(502,'The background transfer failed. Reopen the design link to retry; do not regenerate the image.');}
  if(!upstream.ok||!upstream.body)return fail(410,'The ChatGPT image link expired or is unavailable. Ask ChatGPT to resend the existing image through MyMerchNow; do not regenerate it.');
  if(Number(upstream.headers.get('content-length'))>MAX_BYTES){await upstream.body.cancel();return fail(413,'The background exceeds 20 MB.');}
  const reader=upstream.body.getReader();
  let first;
  try{first=await reader.read();}catch{return fail(502,'The background download was interrupted.');}
  let bytes=first.value||new Uint8Array();
  try{
    while(bytes.length<12&&!first.done){
      first=await reader.read();
      if(first.value){const combined=new Uint8Array(bytes.length+first.value.length);combined.set(bytes);combined.set(first.value,bytes.length);bytes=combined;}
    }
  }catch{await reader.cancel();return fail(502,'The background download was interrupted.');}
  const png=bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const jpg=bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!png&&!jpg&&!webp){await reader.cancel();return fail(415,'ChatGPT must send an actual PNG, JPG, or WebP background image.');}
  let count=bytes.byteLength;
  const body=new ReadableStream({
    start(controller){controller.enqueue(bytes);},
    async pull(controller){
      try{
        const next=await reader.read();
        if(next.done){controller.close();return;}
        count+=next.value.byteLength;
        if(count>MAX_BYTES){await reader.cancel();controller.error(new Error('Image exceeds 20 MB.'));return;}
        controller.enqueue(next.value);
      }catch(error){controller.error(error);}
    },
    cancel(){return reader.cancel();}
  });
  return new Response(body,{headers:{'Content-Type':png?'image/png':jpg?'image/jpeg':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
