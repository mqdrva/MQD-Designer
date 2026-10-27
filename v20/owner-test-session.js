// Test payments retain the normal owner/MFA checks on the server.
// Read the current session immediately before upload, never a startup token.
export async function ownerTestAccessToken(client,now=Date.now()){
  let {data,error}=await client.auth.getSession();
  if(error||!data?.session)throw new Error('Sign into the MQD owner workspace again before testing checkout. Your design is safe.');
  if(!data.session.expires_at||data.session.expires_at*1000<=now+60000){
    const refreshed=await client.auth.refreshSession();data=refreshed.data;error=refreshed.error;
  }
  if(error||!data?.session?.access_token||!data.session.expires_at||data.session.expires_at*1000<=now+60000)throw new Error('Your owner session expired. Sign into the MQD owner workspace again; your design is safe.');
  const assurance=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error||assurance.data?.currentLevel!=='aal2')throw new Error('Verify your authenticator in the MQD owner workspace before testing checkout. Your design is safe.');
  return data.session.access_token;
}
