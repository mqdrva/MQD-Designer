import JSZip from 'jszip';
import fs from 'node:fs/promises';
import {PILOT_SHOP} from '../v20/print-shop-contract.js';
import {GARMENT_MAPPING} from '../supabase/functions/_shared/shirt-games/mapping.js';
import {createShopDesignHandler} from '../supabase/functions/mqd-print-shop-designs/service.js';
export const key='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
export const businessId='10000000-0000-4000-8000-000000000001';
export const userId='20000000-0000-4000-8000-000000000001';
export const shop={...structuredClone(PILOT_SHOP),slug:'sharing-test',name:'Synthetic Shop',organizationType:'print-shop'};
export const image='data:image/png;base64,'+(await fs.readFile(new URL('../assets/brand-logo.png',import.meta.url))).toString('base64');
export async function packageFor(engine='2d'){
 const zip=new JSZip(),productId=engine==='2d'?'everyday-tshirt':'tshirt';
 let saved={schema:'mqd-shop-design-v1',engine,shop:shop.slug};
 if(engine==='2d')saved={...saved,draft:{schemaVersion:1,product:productId,color:'Red',size:'L',quantity:1,printMethod:'transfer',photos:{},artwork:{front:{name:'logo.png',placement:{x:2,y:3,width:3,height:3},texts:[{id:'text-1',text:'ORIGINAL',font:'Anton',color:'#123456',outline:1,outlineColor:'#ffffff',align:'center',placement:{x:2,y:7,width:4,height:1}}]}}},files:{front:{path:'originals/front-logo.png',name:'logo.png',type:'image/png'}}};
 else {const m=GARMENT_MAPPING.tshirt;saved={...saved,design:{schema:'mqd-design-v1',product:{id:productId,model:m.model},templates:m.templates,activeZone:'Back',design:{zones:Object.fromEntries(m.zones.map(z=>[z,{background:z==='Front'?'#2456A6':'#ffffff',layers:z==='Front'?[{id:'layer-1',type:'image',label:'Original logo',filename:'logo.png',src:image,x:21,y:-17,scale:.32,rotation:4,opacity:1,visible:true}]:z==='Back'?[{id:'layer-2',type:'text',label:'Original wording',text:'ORIGINAL',font:'Anton',color:'#123456',x:0,y:-10,scale:.5,rotation:0,opacity:1,visible:true}]:[]}]))}}};}
 const order={engine,productId,printMethod:engine==='2d'?'transfer':'all-over',color:engine==='2d'?'Red':'White',locations:['front'],orderOptions:[{size:'L',quantity:1}]};
 zip.file('design.json',JSON.stringify(saved));zip.file('order-request.json',JSON.stringify(order));zip.file('originals/front-logo.png',image.split(',')[1],{base64:true});
 return {bytes:await zip.generateAsync({type:'uint8array'}),saved,order};
}
export function fixture(){
 const businesses=new Map([[businessId,{id:businessId,preferred_slug:shop.slug,owner_email:'owner@example.com',email_verified_at:new Date().toISOString(),approved_at:new Date().toISOString(),status:'pilot_active',pilot_expires_at:new Date(Date.now()+86400000).toISOString(),shop_config:structuredClone(shop)}]]),designs=new Map(),files=new Map();
 const db={auth:{getUser:async jwt=>({data:{user:jwt==='owner'?{id:userId,email:'owner@example.com',email_confirmed_at:'confirmed',app_metadata:{}}:jwt==='wrong'?{id:crypto.randomUUID(),email:'other@example.com',email_confirmed_at:'confirmed',app_metadata:{}}:jwt==='admin'?{id:userId,email:'owner@example.com',email_confirmed_at:'confirmed',app_metadata:{role:'admin'}}:null}}),getClaims:async()=>({data:{claims:{aal:'aal1'}}})},
 storage:{from:bucket=>{if(bucket!=='print-shop-designs')throw new Error('Unrelated bucket');return {upload:async(path,data)=>{if(files.has(path))return {error:'exists'};files.set(path,new Uint8Array(data));return {};},download:async path=>files.has(path)?{data:new Blob([files.get(path)])}:{error:'missing'},remove:async paths=>{paths.forEach(p=>files.delete(p));return {};}};}},
 from:table=>{if(!['mqd_print_shop_designs','mqd_print_shop_businesses','mqd_print_shop_subscription_accounts'].includes(table))throw new Error('Unrelated table '+table);const rows=table==='mqd_print_shop_designs'?designs:table==='mqd_print_shop_businesses'?businesses:new Map();let filters=[],change=null,insert=null,one=false,columns='*',limit=Infinity;
 const finish=()=>{if(insert){if(rows.has(insert.id))return {data:null,error:'duplicate'};rows.set(insert.id,structuredClone(insert));return {data:structuredClone(insert)};}let matched=[...rows.values()].filter(r=>filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v)).slice(0,limit);if(change)matched.forEach(r=>Object.assign(r,structuredClone(change)));const data=matched.map(r=>columns==='*'?structuredClone(r):Object.fromEntries(columns.split(',').map(k=>[k,structuredClone(r[k])])));return {data:one?(data[0]||null):data};};
 const q={select:c=>{columns=c;return q;},eq:(k,v)=>{filters.push([k,v]);return q;},in:(k,v)=>{filters.push([k,v]);return q;},order:()=>q,limit:n=>{limit=n;return q;},update:v=>{change=v;return q;},insert:v=>{insert=v;return q;},maybeSingle:()=>{one=true;return Promise.resolve(finish());},then:(a,b)=>Promise.resolve(finish()).then(a,b)};return q;}};
 const handler=createShopDesignHandler({db,JSZip,secret:'test-only-private-key'});
 const call=async(body,{jwt='owner',file,origin='http://127.0.0.1:8765'}={})=>{const headers={apikey:key,Origin:origin,...(jwt?{Authorization:'Bearer '+jwt}:{})};let payload;if(file){payload=new FormData();payload.append('payload',JSON.stringify(body));payload.append('package',new Blob([file],{type:'application/zip'}),'design.zip');}else{headers['Content-Type']='application/json';payload=JSON.stringify(body);}return handler(new Request('https://example.test/functions/v1/mqd-print-shop-designs',{method:'POST',headers,body:payload}));};
 return {db,businesses,designs,files,handler,call};
}
