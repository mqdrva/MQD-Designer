import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const customer=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
const editor=fs.readFileSync(new URL('../v20/editor.js',import.meta.url),'utf8');

for(const id of ['accountButton','authOverlay','resendConfirmationButton','customerOverlay','designsList','ordersList'])assert(html.includes(`id="${id}"`),`${id} must exist`);
for(const feature of ['signInWithPassword','auth.signUp','auth.resend','customer_designs','customer-artwork','Buy Again','duplicateCloudDesign','mqd_orders'])assert(customer.includes(feature),`${feature} must stay connected`);
assert(customer.includes('function authRedirectUrl(){return window.location.origin+window.location.pathname;}'),'auth email links must return customers to the site they signed in from');
assert(customer.includes('Authorization:`Bearer ${token}`'),'checkout submission must send the signed-in customer JWT');
assert(customer.includes("if(!requireAccount('Create or sign into your account to save"),'saving must require an account');
assert(customer.includes("if(!requireAccount('Create or sign into your account before adding"),'cart must require an account');
assert(editor.includes('window.MQDDesigner={')&&editor.includes('exportDesign:designJSON')&&editor.includes('loadDesign:loadDesignPayload'),'customer library must use the canonical editor serializer and loader');
assert(!customer.includes('service_role'),'the browser bundle must never contain the service role key');

console.log('PASS: customer auth, cloud designs, private artwork, account library, duplication, orders and reorder are connected.');
