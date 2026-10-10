const SUPABASE_URL = 'https://gsxuhpffgdffsqksrkrf.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_T8BLz1mvCQGfs1-8Fa574A_imKn7qx4';
let clientPromise;
export function everydayClient() {
  return clientPromise ||= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm').then(({ createClient }) => createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })).catch(error => { clientPromise = null; throw error; });
}
export async function everydayGoogleSignIn(client, saveDraft, storage = sessionStorage, origin = location.origin, preview = location.pathname === '/everyday-preview.html') {
  await saveDraft();
  storage.setItem('mqd-everyday-auth-return', preview ? 'preview' : 'everyday');
  const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/' } });
  if (error) { storage.removeItem('mqd-everyday-auth-return'); throw error; }
}
export function takeEverydayReturn(storage) {
  const value = storage.getItem('mqd-everyday-auth-return'); storage.removeItem('mqd-everyday-auth-return');
  return value === 'everyday' ? '/everyday.html' : value === 'preview' ? '/everyday-preview.html?mqdStripeTest=1' : null;
}
export async function customerOrders(client, user) {
  if (!user?.id || user.is_anonymous) throw new Error('Sign in to view your orders.');
  const { data, error } = await client.from('mqd_orders').select('order_number,product_name,status,stripe_payment_status,created_at').eq('user_id', user.id).eq('is_test', false).order('created_at', { ascending: false }).limit(50);
  if (error) throw error; return data || [];
}
export function connectEverydayAccount({ saveDraft, status }, dependencies = {}) {
  const $ = id => document.getElementById(id), button = $('everydayAccount'), dialog = $('everydayAccountDialog');
  if (!button || !dialog) return;
  let session = null, loading = true, requestVersion = 0;
  const loadClient = dependencies.loadClient || everydayClient;
  function display() {
    button.textContent = session?.user && !session.user.is_anonymous ? 'My Account' : 'Sign in';
    $('everydayAccountEmail').textContent = session?.user?.email || 'One account for Everyday and Premium.';
    $('everydayGoogleSignIn').hidden = !!session?.user && !session.user.is_anonymous;
    $('everydaySignOut').hidden = !session;
    $('everydayAccountMessage').textContent = loading ? 'Loading your account…' : session?.user && !session.user.is_anonymous ? 'Orders placed while signed in appear here. Device drafts stay saved in this browser.' : 'Continue with Google to create an account or sign in. Your design will be saved before you leave.';
  }
  button.onclick = async () => {
    dialog.showModal(); display(); const current = ++requestVersion; $('everydayOrders').replaceChildren();
    try {
      const client = await loadClient(), { data, error } = await client.auth.getSession(); if (error) throw error;
      session = data.session; loading = false; display();
      if (!session?.user || session.user.is_anonymous) return;
      const orders = await customerOrders(client, session.user); if (current !== requestVersion) return;
      if (!orders.length) $('everydayAccountMessage').textContent = 'No orders yet. Orders placed while signed in will appear here. Earlier guest orders remain guest orders.';
      for (const order of orders) {
        const item = document.createElement('li'); item.textContent = `${order.order_number} · ${order.product_name} · ${order.stripe_payment_status || order.status} · ${new Date(order.created_at).toLocaleDateString()}`; $('everydayOrders').append(item);
      }
    } catch { $('everydayAccountMessage').textContent = 'Account access could not load. Please try again.'; }
  };
  $('everydayAccountClose').onclick = () => { requestVersion++; dialog.close(); };
  $('everydayGoogleSignIn').onclick = async () => {
    $('everydayGoogleSignIn').disabled = true;
    try { await everydayGoogleSignIn(await loadClient(), saveDraft); }
    catch (error) { status(error.message); $('everydayAccountMessage').textContent = `Could not sign in: ${error.message}`; }
    finally { $('everydayGoogleSignIn').disabled = false; }
  };
  $('everydaySignOut').onclick = async () => {
    requestVersion++; try { const { error } = await (await loadClient()).auth.signOut(); if (error) throw error; session = null; $('everydayOrders').replaceChildren(); display(); status('Signed out. Your device draft is still saved.'); }
    catch { $('everydayAccountMessage').textContent = 'Could not sign out. Please try again.'; }
  };
  void loadClient().then(async client => {
    const { data, error } = await client.auth.getSession(); if (error) throw error; session = data.session; loading = false; display();
    client.auth.onAuthStateChange((_event, value) => { session = value; loading = false; requestVersion++; $('everydayOrders').replaceChildren(); display(); });
  }).catch(() => { loading = false; display(); });
}
