import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import {requireAdminMfa} from './admin-security.js';
export const DESIGN_API='https://gsxuhpffgdffsqksrkrf.supabase.co/functions/v1/mqd-print-shop-designs';
export const DESIGN_KEY='sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
export const shopDesignAuth=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co',DESIGN_KEY,{auth:{storageKey:'mqd-print-shop-owner-session',persistSession:true,detectSessionInUrl:true,flowType:'pkce'}});
export async function designCall(body,{file,binary=false,owner=false}={}){
 const headers={apikey:DESIGN_KEY};
 if(owner){
  const {data:{user}}=await shopDesignAuth.auth.getUser();
  if(!user)throw new Error('Sign in to your Print Shop designs workspace first.');
  if(user.app_metadata?.role==='admin')await requireAdminMfa(shopDesignAuth);
  const {data:{session}}=await shopDesignAuth.auth.getSession();
  if(!session)throw new Error('Sign in to your Print Shop designs workspace first.');
  headers.Authorization='Bearer '+session.access_token;
 }
 let payload;
 if(file){payload=new FormData();payload.append('payload',JSON.stringify(body));payload.append('package',file,'saved-design.zip');}
 else{headers['Content-Type']='application/json';payload=JSON.stringify(body);}
 const response=await fetch(DESIGN_API,{method:'POST',headers,body:payload});
 if(!response.ok){const result=await response.json().catch(()=>({}));throw new Error(result.error||'The saved design could not load. Please retry.');}
 return binary?response.blob():response.json();
}
export function customerDesignLink(shop,design){
 const url=new URL('/shops/'+encodeURIComponent(shop.slug)+(design.engine==='3d'?'/3d':''),location.origin);
 url.searchParams.set('design',design.id);url.hash='view='+design.token;return url.href;
}
