import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { transferHandler } from "../_shared/mqd-transfer-submit.js";

Deno.serve(transferHandler({ createClient, env: name => Deno.env.get(name) }));
