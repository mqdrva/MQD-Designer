import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {GameError,photo} from './engine.mjs';
const binary=fileURLToPath(new URL('../.runtime/face-cutout',import.meta.url));
export async function localFaceCutout(input){
 const checked=photo({...input,consent:true,cropApproved:true});
 if(process.platform!=='darwin')throw new GameError('Local automatic cutouts require the configured Mac helper. Upload an already transparent face PNG instead.',503);
 return new Promise((resolve,reject)=>{
  const child=spawn(binary,[],{stdio:['pipe','pipe','pipe']});let output=[],errors=[],size=0,done=false;
  const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timeout);error?reject(error):resolve(value)};
  const timeout=setTimeout(()=>{child.kill();finish(new GameError('Face cutout took too long. Try a smaller, clearer selfie.',422))},45000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>3*1024*1024){child.kill();finish(new GameError('Face cutout is too large.',422))}else output.push(chunk)});
  child.stderr.on('data',chunk=>{if(errors.length<8)errors.push(chunk)});
  child.on('error',()=>finish(new GameError('Local face cutout tools are unavailable. Upload a transparent face PNG instead.',503)));
  child.stdin.on('error',()=>{});
  child.on('close',code=>{if(code!==0)return finish(new GameError(Buffer.concat(errors).toString().trim()||'Face cutout could not finish. Try a clear photo of one face.',422));try{const result=JSON.parse(Buffer.concat(output).toString());finish(null,photo({...result,consent:true,cropApproved:true,cutout:true}))}catch{finish(new GameError('Face cutout could not be read. Try another photo.',422))}});
  child.stdin.end(JSON.stringify({url:checked.url}));
 });
}
