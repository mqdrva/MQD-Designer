import assert from 'node:assert/strict';
import {quantityFromOrderItem,shippingCentsForQuantity} from '../supabase/functions/_shared/mqd-shipping.js';

assert.equal(shippingCentsForQuantity(1),1000,'1 item must cost $10 to ship');
assert.equal(shippingCentsForQuantity(9),1000,'9 items must cost $10 to ship');
assert.equal(shippingCentsForQuantity(10),1500,'10 items must cost $15 to ship');
assert.equal(shippingCentsForQuantity(19),1500,'19 items must cost $15 to ship');
assert.equal(shippingCentsForQuantity(20),2000,'20 items must cost $20 to ship');
assert.equal(shippingCentsForQuantity(99),2000,'20+ items must cost $20 to ship');
assert.equal(quantityFromOrderItem({quantity:4}),4,'legacy quantity must be supported');
assert.equal(quantityFromOrderItem({quantity:99,order_options:[{size:'S',quantity:4},{size:'M',quantity:6}]}),10,'size quantities must be summed');
assert.throws(()=>shippingCentsForQuantity(0),/invalid/,'empty carts must be rejected');
assert.throws(()=>quantityFromOrderItem({quantity:100}),/between 1 and 99/,'per-row limits must remain enforced');

console.log('PASS: server shipping tiers are $10 for 1-9, $15 for 10-19, and $20 for 20+ items.');
