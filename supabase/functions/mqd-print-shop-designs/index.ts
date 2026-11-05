import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import JSZip from 'npm:jszip@3.10.1';
import {createShopDesignHandler} from './service.js';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(Deno.env.get('SUPABASE_URL')!,secret);
Deno.serve(createShopDesignHandler({db,JSZip,secret}));
