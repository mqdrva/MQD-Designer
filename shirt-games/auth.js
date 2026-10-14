import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm';
const client=createClient('https://gsxuhpffgdffsqksrkrf.supabase.co','sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4');
const account=document.getElementById('gameAccount');
const update=session=>{const permanent=session?.user&&!session.user.is_anonymous;account.textContent=permanent?'Signed in · '+(session.user.user_metadata?.full_name||session.user.email||'Player'):'Sign in to create a game';document.getElementById('gameSignIn').hidden=!!permanent;};
export const authReady=client.auth.getSession().then(({data})=>{update(data.session);const back=sessionStorage.getItem('mqd-game-oauth-return');if(back&&!location.hash){location.hash=back;sessionStorage.removeItem('mqd-game-oauth-return')}return data.session});
client.auth.onAuthStateChange((_event,session)=>update(session));
export async function accountToken(){await authReady;const {data}=await client.auth.getSession();return data.session?.access_token||'';}
document.getElementById('gameSignIn').onclick=async()=>{sessionStorage.setItem('mqd-game-oauth-return',location.hash);const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/shirt-games/'}});if(error)document.getElementById('message').textContent=error.message;};
