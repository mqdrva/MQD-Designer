// Verify the token before trusting its assurance level; getUser is also required
// by callers so an obsolete JWT role cannot retain admin authorization.
export async function hasAdminMfa(supabase,token){
  try{
    const {data,error}=await supabase.auth.getClaims(token);
    return !error&&data?.claims?.aal==='aal2';
  }catch{return false;}
}
