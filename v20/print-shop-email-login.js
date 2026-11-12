// This creates only an Auth identity. The saved-design service independently
// requires a confirmed email matching the shop owner; it grants no new shop rights.
export async function requestShopSignIn(client, value, origin) {
 const email=String(value||'').trim();
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter the verified email used for your Print Shop signup.');
 const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:new URL('/print-shop-designs.html',origin).href}});
 if(error)throw new Error(error.status===429?'Please wait a minute before requesting another sign-in link.':'The sign-in email could not be sent. Please retry shortly or use Continue with Google with your registered shop email.');
}
