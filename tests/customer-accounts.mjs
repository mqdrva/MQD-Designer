import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const customer=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');

for(const id of ['accountButton','authOverlay','googleSignInButton','emailSignInButton','guestSignInButton','authEmail','customerOverlay','designsList','ordersList'])assert(html.includes(`id="${id}"`),`${id} must exist`);
for(const feature of ['signInWithOAuth','signInWithOtp','signInAnonymously','customer_designs','customer-artwork','Buy Again','duplicateCloudDesign','mqd_orders'])assert(customer.includes(feature),`${feature} must stay connected`);
assert(customer.includes('authSaveRedirectUrl(window.location,currentDesignRecoveryId())'),'auth returns to the original designer with its backup ID');
assert(customer.includes('Authorization:`Bearer ${token}`'),'checkout submission must send the signed-in customer JWT');
assert(customer.includes('if(!isPermanentUser()){')&&customer.includes('authDesignRecovery.prepare(payload)'),'unsigned saves must make a durable backup before requesting sign-in');
assert(customer.includes("if(!requireAccount('Sign in or continue as a guest before adding"),'the signed-in cart handler must require a session or guest continuation');
assert(editor.includes('window.MQDDesigner={')&&editor.includes('exportDesign:designJSON')&&editor.includes('loadDesign:loadDesignPayload'),'customer library must use the canonical editor serializer and loader');
assert(!customer.includes('service_role'),'the browser bundle must never contain the service role key');

console.log('PASS: customer auth, cloud designs, private artwork, account library, duplication, orders and reorder are connected.');
