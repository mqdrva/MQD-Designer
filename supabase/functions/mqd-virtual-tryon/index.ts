import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { createTryOnPilot } from "../_shared/mqd-tryon-pilot.js";
const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||Deno.env.get("SUPABASE_SECRET_KEY");
let key=legacy||"";if(!key)try{key=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||"";}catch{}
const db=createClient(Deno.env.get("SUPABASE_URL")||"",key,{auth:{persistSession:false,autoRefreshToken:false}});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(createTryOnPilot({
 production:true,
 providerKey:(Deno.env.get("MQD_PHOTOROOM_API_KEY")||"").trim(),db,hash
}));
