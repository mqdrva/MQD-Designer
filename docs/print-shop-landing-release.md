# Print Shop Services landing update

New visitors to `/print-shop-setup.html` and `/print-shops.html` see the same benefit-led offer, working sample designer, $49/$99 monthly plans and a short pilot inquiry. The real designer engines run with `marketingDemo=1`, sample configuration and request submission disabled. Full setup is available at `/print-shop-setup.html?configure=1`; existing `accountShop`, `setupId` and private `#manage` links still open full setup. Setup previews return to full setup. Existing customer checkout and live shop entitlements are unchanged.

Pilot inquiries collect name, email and shop name, with phone optional. They are stored separately in `mqd_print_shop_interest`, with no browser/ordinary-user access. MYMERCHNOW receives one notification at mqdrva@gmail.com with the contact details and PILOT reference. The inquiry does not appear as a pending configured business in the shop administrator list; that happens after full setup. No automatic response goes to an unverified applicant email. Success is shown only after a durable save, and notification failure is shown separately. A retry reuses the request ID and provider idempotency key. The next-step form prefills contact details in the same browser session; they expire after one day and never overwrite owner-account settings.

## Release order (awaiting owner publication approval)

1. Apply `supabase/migrations/20261118210000_print_shop_interest.sql` to the existing MyMerchNow Supabase project.
2. Deploy `mqd-print-shop-setup`, including its new `interest.js` dependency. Existing Resend configuration is reused.
3. Publish the frontend changes together. Branch deployment is disabled in vercel.json so source review does not publish a website.
4. Verify a clearly marked pilot inquiry end to end, the durable row and its notification, then full-setup continuation. Do not start a pilot or subscribe a business as a test.
5. Check the 3D demo on a WebGL-capable device. The review browser has WebGL disabled; its fallback was verified, but successful 3D rendering was not.

## Validation completed locally

`node tests/print-shop-interest.mjs`
`node tests/print-shop-landing.mjs`
`node tests/print-shop-settings-persistence.mjs`
`node tests/print-shop-setup-simplification.mjs`
`node tests/print-shop-onboarding.mjs`

Browser review: desktop landing and real 2D controls, mobile at a 390px frame (375px content viewport, no horizontal overflow), pilot form navigation, full-setup routing, and WebGL-disabled 3D fallback. The new migration and live notification delivery remain unverified until release. No live lead, email, billing change, migration or production deployment was performed during review.
