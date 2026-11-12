import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../v20/print-shop.js', import.meta.url), 'utf8');
const sendFunction = source.slice(source.indexOf('async function send(event)'), source.indexOf('async function digest(bytes)'));

for (const teamService of [false, true]) {
  for (const failure of ['server', 'connection']) {
    const messages = [];
    const controls = [{ disabled: false, closest: () => null }, { disabled: true, closest: () => null }];
    const fields = {
      shopForm: { reportValidity: () => true },
      shopSend: { textContent: teamService ? 'Continue to checkout' : 'Send order request' },
      shopName: { value: 'Synthetic Customer' },
      shopEmail: { value: 'customer@example.com' },
      shopPhone: { value: '2025550101' },
      shopNotes: { value: 'Please quote a polyester option.' },
      shopWebsite: { value: '' },
      shopStarted: { value: String(Date.now() - 5000) },
      teamDelivery: { value: 'individual' },
    };
    const originalButtonText = fields.shopSend.textContent;
    const context = vm.createContext({
      teamService,
      designSharing: null,
      materialControls: null,
      reviewOnly: false,
      setupPreview: false,
      sending: false,
      ownerPaymentTest: false,
      checkoutFeedback: null,
      checkoutProgress: () => ({ start() {}, fail() {} }),
      $: id => fields[id],
      document: { querySelectorAll: () => controls },
      window: {},
      sessionStorage: { getItem: () => 'synthetic-guest-token' },
      getDraft: () => ({ artwork: {} }),
      engine: '2d',
      VIEWS: ['front','back','left','right'],
      shop: { name: 'Synthetic Shop' },
      slug: 'synthetic-shop',
      say: message => messages.push(message),
      refresh() {},
      validPhone: () => true,
      digest: async () => 'synthetic-digest',
      cachedAttempt: null,
      summary: () => ({ productId: 'everyday-tshirt' }),
      buildPackage: async () => ({ blob: new Blob(['synthetic-package']), summary: {} }),
      MAX_REQUEST_BYTES: 8 * 1024 * 1024,
      API: 'https://example.test/request',
      teamEndpoint: () => 'https://example.test/checkout',
      teamHeaders: () => ({}),
      FormData, Blob, TextEncoder, crypto, Date, JSON, Error, TypeError,
      fetch: async (_url, options) => {
        const payload = JSON.parse(options.body.get('payload'));
        assert.equal(payload.customer.notes, 'Please quote a polyester option.');
        assert.equal(fields.shopSend.textContent, teamService ? 'Preparing checkout…' : 'Preparing request…');
        assert.equal(controls[0].disabled, true);
        assert.equal(controls[1].disabled, true);
        if (failure === 'connection') throw new TypeError('synthetic network interruption');
        return { ok: false, status: 503, json: async () => ({}) };
      },
    });
    vm.runInContext(sendFunction, context);
    await vm.runInContext('send({preventDefault(){}})', context);
    assert.equal(fields.shopSend.textContent, originalButtonText);
    assert.deepEqual(controls.map(control => control.disabled), [false, true]);
    assert.equal(context.sending, false);
    if (teamService) {
      assert.match(messages.at(-1), /Checkout/);
    } else {
      assert(messages.every(message => !/checkout/i.test(message)));
      assert.match(messages.at(-1), /request/i);
      assert.match(messages.at(-1), /Retry or save your ZIP and contact the shop/);
    }
  }
}
console.log('PASS request feedback and retry controls for shop requests and Team checkout, including material preference notes.');
