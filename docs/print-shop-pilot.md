# Print-shop pilot

Separate guest designers: `/shops/pilot` and `/shops/pilot/3d`. Existing MYMERCHNOW engines are reused by separate entry scripts; the normal customer checkout remains separate.

Each shop config controls `printMethods` for 2D and `printMethods3d` for 3D. Only configured methods appear. The request endpoint rejects methods outside that shop’s configuration. The demo enables all options for testing.

Print options: Standard transfer, DTF, DTG, Screen Printing, HTV (Heat Transfer Vinyl), Sublimation. Standard Transfer, DTF, DTG and HTV use the business’s configured automatic rates. Only Screen Printing and Sublimation require shop quotes. Sublimation requires the shop to confirm garment/fabric suitability. A 3D preview is a visual reference; print-area feasibility must be confirmed for the requested process.

Only one pilot shop is configured. Branding and available methods are returned by the separate pilot endpoint. No automated business onboarding or paid subscription setup is active. Proposed subscription prices are $49/$99. Customer order requests are unpaid. The business reviews the ZIP, quotes and collects payment directly.

Saved ZIP files live on the customer device, preserve print method and sizes, and reopen in the original shop and engine. Request attachments have an 8 MB cap. No design library is retained on the server. The private request ledger stores identifiers, hashes and delivery status only. Email goes to the pilot business owner, with the customer as reply-to.

The separate endpoint is `mqd-print-shop-pilot`. Its `contract.js` must match `v20/print-shop-contract.js`. Public access is application-key checked with restricted origins, request size validation, a honeypot, rate limits and idempotency. Database RLS deliberately denies direct client access to the request ledger.

## Business setup and estimates

Before enabling a branded shop, collect business name, logo, request email, 2D/3D access, garments/colors/sizes, offered methods, garment prices, size surcharges, and a pricing rule for each offered method. Only approved server configuration is published; customer pages cannot edit shop pricing.

`pricing.printRules[engine][method]` uses `mode: "quote"` or `mode: "calculated"`. Calculated 2D rules require `setupCents`, `minimumQuantity`, and sorted `tiers`. Each tier has `fromQuantity`, `frontCents`, `backCents`, and `sleevesCents` (one or both sleeves, per garment). The garment price and size surcharge are added separately; the setup fee applies once to the request. Quantities below the configured minimum are blocked with a clear minimum-quantity message. Missing rates stay quote-only. Existing pilot transfer/DTF/DTG and 3D all-over rates remain sample rates.

Example fixed HTV rule: `{ "mode": "calculated", "setupCents": 1000, "minimumQuantity": 1, "tiers": [{ "fromQuantity": 1, "frontCents": 600, "backCents": 400, "sleevesCents": 300 }, { "fromQuantity": 12, "frontCents": 500, "backCents": 300, "sleevesCents": 200 }] }`. For 12 L shirts with front print and a $20 garment: (2000 + 500) × 12 + 1000 = 31000 cents ($310).

Screen-print rates that vary by ink colors/screens, HTV layering, sublimation fabric limitations and 3D print-area differences require shop review unless the shop can provide a fixed rate that covers the displayed selection. This pilot does not infer ink-color counts from uploaded artwork. Automatic 3D estimates use mapped front/back/sleeve artwork zones and the 3D garment price. Collar/hood artwork is blocked for these methods with instructions to remove those areas or contact the shop.

Business setup submission and private owner editing are implemented for the pilot. Subscription billing remains disabled.

## Setup form pilot

Open `/print-shop-setup.html` (or `/print-shops/setup` on Vercel). Select branding, owner request email, 2D/3D plan, enabled garments and prices, offered methods, quote/automatic pricing, setup fees, minimums, quantity breaks, 3D all-over service, and shop restrictions. Prices start as editable sample values. Download a `mqd-business-setup-v1` JSON file containing public shop settings and private owner contact details separately. Load it again to edit. Backup files remain optional. The main Submit button privately stores the setup for review and emails the owner a confirmation/edit link; this does not create a paid subscription.

Preview buttons use a separate sessionStorage key and show a clearly marked preview with customer requests disabled. Previewing does not submit setup details. Explicit submission uses the separate mqd-print-shop-setup endpoint. The request form remains visible in previews, with an activation notice and disabled Send button, plus a link to the working pilot shop. Logo files are restricted to raster images under 500 KB. Selected garments and printing methods determine the preview options; rate calculations use the same pricing contract as the request service. Return to setup restores the previewed settings; the confirmation must be checked again. Do not publish owner contact metadata as part of the public configuration.

## Garment availability and required phones

Each enabled garment requires a brand, style/code, at least one size and one supported preview color. Businesses type their garment brand directly, with no suggested brand list. Additional colors and the color-request email link appear inside Colors you offer. Availability is confirmed by the business, not inferred from the brand. The saved `shop.garments` entry contains the brand/style, sizes/colors and additional color requests. Live preview selections and quote validation use that entry. Models remain generic shape references; branded stock/fit is not inferred. Additional colors can be listed for review and requested through a mailto link to MYMERCHNOW.

Business phone is mandatory in setup. Customer phone is mandatory in both 2D/3D order request forms, with shared validation for 7–15 digits and common phone punctuation. The request endpoint rejects missing or invalid customer phones before processing attachments or sending emails.

## Shop print dimensions

Setup includes per-garment maximum width/height in inches for front, back and sleeves. Body dimensions accept width 0.5–16 inches and height 0.5–24 inches, sleeve width accepts 0.5–6 inches, and polo left chest accepts 0.5–5 inches. These are input bounds, not a guarantee that a blank or press supports that size. The separate `shop-preview-renderer.js` uses owner-supplied limits for 2D guides and artwork constraints. The original MYMERCHNOW renderer is unchanged.

Polo 2D printing is left chest only: back/sleeve controls are hidden, other polo artwork is removed when changing garments, and requests reject non-front polo print areas. The package records the left-chest placement and shop print limits. 3D packages include owner print dimensions as production-review metadata; 3D panel geometry remains a general visual reference and has not been calibrated to each business’s blank or custom print limits.


## Business onboarding and administrator review

The separate `mqd_print_shop_businesses` table is private, with RLS and no anonymous or ordinary authenticated grants. Owner email and phone are never part of the public shop response. `mqd-print-shop-setup` validates branding, garment availability, print limits and pricing on the server, reserves submissions atomically with rate limits and duplicate protection, then sends owner confirmation and administrator review emails. The test submission SETUP-1F65D896AF54 reached the owner's inbox; both emails were confirmed delivered.

The confirmation URL carries a random private token in its fragment. The page removes it from the address bar and keeps it only in that browser session. The server stores a hash plus an encrypted copy for reliable email retries. Links expire after 30 days. Opening the link confirms email ownership and loads the saved settings. Owner changes become pending settings; they do not replace an active shop until approved. Revision checks reject stale edits.

`/print-shop-admin.html` uses the existing administrator account and authenticator verification, with its own session storage key. Verified businesses may be approved for a seven-day unpaid pilot or suspended. A signed-in administrator review was exercised with an isolated test adapter; the real administrator session still needs a human sign-in for the first approval. Once approved, `/shops/<slug>` and `/shops/<slug>/3d` load only that shop's offered settings, and requests go to its private recipient. Expired, suspended and unapproved links do not accept orders.

The local frontend remains at `127.0.0.1:8765`; links in local test emails work only on this computer. No production frontend release was performed. Database changes and deployments only added/updated the separate print-shop service.

## Release decisions still outstanding

- Monthly prices: $49 for 2D, $99 for 2D + 3D, already selected by the owner. A dedicated MQD SHOP sandbox is now connected. Sandbox-only Checkout, private owner billing management and signed webhook code are implemented and deployed. Hosted $49/$99 payments, successful renewal, failed renewal and portal cancellation were verified. The approved dedicated restricted sandbox key is stored in the encrypted vault. Actual app-generated checkout, signed webhook delivery, private owner status, portal access and cancellation passed with an isolated billing fixture. Live billing remains disabled.
- Pilot policy: seven-day, manually reviewed, no payment. Confirm the eventual paid-service cancellation/support policy before public signup.
- Initial scope: one brand/style per garment category, sizes and colors listed independently, one garment/design per request. Multiple styles, color-dependent stock and mixed-garment requests require further work.
- Production limits: 3D remains a generic preview; custom print dimensions are production-review metadata rather than calibrated model geometry. Artwork still requires the print shop's approval.
- Operational review: measure support and traffic with five pilot shops before raising the limit. Confirm email-delivery monitoring and what happens when a private owner link expires.

## Isolation verification

During the October 10 onboarding verification, compared all 400 existing production files against commit b45b04f8fb3c1841b9ad328800d118df6c062a39. In the pilot copy only `index.html` (For Print Shops link) and `vercel.json` (new service routes) differ. Existing designers, customer authentication, cart, checkout functions, payment webhooks and order handling are byte-for-byte unchanged. Browser checks confirm the original cart is preserved and guest designers do not contact the existing authentication or payment endpoints. See `outputs/print-shop-pilot/isolation-verification.json` and onboarding/browser test results.


## Subscription sandbox verification

The service uses separate sandbox Products and Prices: $49/month for 2D and $99/month for 2D + 3D. Real sandbox hosted checkouts completed with paid invoices. A declined test card was rejected. Advancing a dedicated test clock produced a successful $99 monthly renewal, then a past-due subscription and unpaid invoice with Stripe's renewal-failure test card. Customer Portal changed the test card and scheduled cancellation at the end of the paid period. Disposable test subscriptions were canceled after verification.

Stripe flexible billing's portal can set `cancel_at` while leaving `cancel_at_period_end` false. The service recognizes both representations and keeps access only through the appropriate paid period. Unit tests exercise private owner authorization, manual review gates, fixed server prices, checkout reuse, tenant ownership, live-key/event rejection, HMAC/replay-window behavior, duplicates, stale event ordering, renewal failures and cancellation states. Actual provider-to-application delivery also passed: paid subscription, scheduled cancellation and completed cancellation reached the separate billing record and owner page. Concurrent invoice/checkout events returned retry responses; manually resending through Stripe processed both successfully without reactivating the canceled subscription. Automatic retry timing has not been verified.

New private sandbox-only tables: `mqd_print_shop_billing_accounts` and `mqd_print_shop_billing_events`. New endpoints: `mqd-print-shop-billing` and `mqd-print-shop-billing-webhook`. The dedicated webhook and portal configuration are saved in the encrypted vault. With the user's approval, the dedicated restricted sandbox key was created with customer/checkout/portal write access and price/product/subscription/invoice read access and saved only in the encrypted vault. Temporary credential copies were removed. Existing apparel keys, webhooks, order tables and checkout code were not changed. This code cannot accept live keys and does not activate paid public shops.

Before release, finish the real private owner confirmation/admin approval. Billing verification used a clearly identified seeded fixture; it was closed, its token expired and its disposable subscription canceled afterward. The actual app checkout, owner status, portal and cancellation path passed. Renewal success/failure were verified in Stripe with a test clock and in handler tests, but not through an app-owned test-clock subscription. Then port the service files onto current production commit f4818024bab5910ea3c9e5e1cd70c68f0c0380b3 or newer; do not publish the older pilot archive over newer apparel changes. Confirm applicable tax registrations and the live billing policy before collecting real subscription payments.

Evidence: `outputs/print-shop-pilot/subscription-sandbox-verification.json`, `subscription-declined.png`, `subscription-cancellation.png`, `payment-method-update.png`, and `app-sandbox-cancellation.png`.


### Later pilot-copy changes

The October 11 billing audit also found pre-existing Everyday files modified late on October 10, before this billing work: the apparel page, checkout/contract/layers/package helpers, shared submission helper and regression test. Those files were not edited as part of subscription billing. Treat the earlier archive comparison as historical evidence, not a claim that the entire current pilot folder matches current production. Publish only reviewed print-shop service files onto a fresh current-production base; preserve newer apparel work. The October 11 guest-designer smoke check confirmed four garment choices, a visible order-request button, required phone and ready state after restarting the local preview.
