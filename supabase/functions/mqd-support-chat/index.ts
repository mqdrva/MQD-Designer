import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import {createSupportHandler} from '../_shared/mqd-support-chat.js';
const env=(name)=>Deno.env.get(name)||'';
Deno.serve(createSupportHandler({env,createDb:()=>createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default,{auth:{persistSession:false}})}));
