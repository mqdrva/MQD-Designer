// Large inline JSON also overwhelms the REST gateway's JSON argument parser.
// Its documented raw-bytea RPC mode passes the exact JSON bytes to PostgreSQL,
// where one bounded parse delegates to the existing atomic save procedures.
export async function saveTeamMasterRequest(db,params,productId=null,transport){
 const rpc=productId?'mqd_save_owner_garment_master':'mqd_save_team_master',args=productId?{...params,p_product:productId}:params;
 const chars=Object.values(params.p_draft.payload.design.zones).reduce((n,z)=>n+z.layers.reduce((m,l)=>m+(typeof l.src==='string'?l.src.length:0),0),0);
 if(chars<8*1024*1024)return db.rpc(rpc,args);
 const t=transport||{url:Deno.env.get('SUPABASE_URL'),key:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')};
 const body=JSON.stringify({...params,p_product:productId}).replace(/[^\x00-\x7f]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 const response=await(t.fetcher||fetch)(t.url+'/rest/v1/rpc/mqd_save_team_master_bytes',{method:'POST',headers:{apikey:t.key,Authorization:'Bearer '+t.key,'Content-Type':'application/octet-stream',Accept:'application/json'},body});
 const result=await response.json().catch(()=>null);
 return response.ok?{data:result,error:null}:{data:null,error:{code:result?.code||'master_gateway_error',status:response.status,message:result?.message||'Master storage unavailable.'}};
}
