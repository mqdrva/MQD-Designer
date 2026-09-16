import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shippingCentsForQuantity as browserShipping} from '../v20/checkout-pricing.js';
import {shippingCentsForQuantity as serverShipping} from '../supabase/functions/_shared/mqd-shipping.js';

for(const [quantity,expected] of [[1,1000],[9,1000],[10,1500],[19,1500],[20,2000],[99,2000]]){
  assert.equal(browserShipping(quantity),expected,`browser shipping must be ${expected} cents for ${quantity} items`);
  assert.equal(browserShipping(quantity),serverShipping(quantity),`browser and server shipping must match for ${quantity} items`);
}

const customer=fs.readFileSync(new URL('../v20/customer.js',import.meta.url),'utf8');
assert(customer.includes("qty.max='99'"),'cart quantity input must match the server limit');
assert(!customer.includes('Math.min(999'),'cart quantity normalization must not exceed the server limit');
assert(customer.includes('Shipping (${shippingTier})'),'cart confirmation must show the shipping tier');
assert(customer.includes('Total before tax:'),'cart confirmation must show merchandise plus shipping');
assert(customer.includes('Stripe completes account approval'),'pending Stripe review must have a customer-friendly message');
assert(customer.includes('Your cart and saved designs are safe'),'checkout failures must reassure customers that work is retained');
assert(!customer.includes("alert('Checkout is not available yet: '"),'technical checkout errors must not be shown directly to customers');

console.log('PASS: cart shipping display matches the server tiers and checkout failures preserve a customer-safe message.');
