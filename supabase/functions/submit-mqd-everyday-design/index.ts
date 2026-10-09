import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { everydayHandler } from "../_shared/mqd-everyday-submit.js";

Deno.serve(everydayHandler({ createClient, env: (name: string) => Deno.env.get(name) || '' }));
