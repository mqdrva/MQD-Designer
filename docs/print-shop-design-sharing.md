# Shop-created customer design sharing

This extends Print Shop’s existing `/shops/<slug>` and `/shops/<slug>/3d` designers. It does not use Teams masters, ordinary apparel checkout, Print Shop subscription checkout, or customer order tracking.

## Owner workflow

Open `/print-shop-designs.html` and sign in with the confirmed email used for the Print Shop setup. Existing MQD administrator accounts still require their authenticator verification. Select a shop and an offered designer, then create a customer design. The existing artwork, placement, color, garment and print-zone controls remain authoritative.

Enter a title and choose **Lock design** (on by default). **Save design and get customer link** saves the exact original ZIP privately and returns a single-design link. The owner can reopen saved designs or change their lock setting from the list. Concurrent saves require the current revision; an old tab cannot overwrite a newer save.

- Locked: customer views the saved garment and switches supported views/zones, but cannot change its artwork, download its editable ZIP or send an edited request through that link.
- Unlocked: customer edits an independent in-browser copy. Save my design still downloads a ZIP, and Send order request still sends an unpaid design request to the shop. Neither operation updates the shop original.
- The general shop URL remains a fresh customer designer with its existing request/email/ZIP flow.

Links are bearer access links for the intended customer. Anyone given the exact link can view that one design. The random 256-bit capability is in the URL fragment, sent to the service in the POST body, and stored hashed/encrypted server-side. No customer email is required or sent to create the link. Locked viewing prevents supported editing and all server writes; it is not DRM against screenshots or a technically modified local browser.

## Limits and preservation

Saved sharing packages use the existing 8 MiB Print Shop request limit. The service does not shrink, resample or recompress originals; oversize packages are rejected with an explicit message. ZIP validation bounds compressed/uncompressed size, entry count, file paths, engines, offered products and original-artwork references. 3D templates/models/zones must match the existing mapping catalog and layer limits. There are no new printable areas.

The original ZIP is immutable in private storage; owner updates point to a new package path. Saved logo/print-zone appearance is preserved independently of later shop-default branding changes. Current shop access, offering availability and pricing validation still apply. Shop follow-up, sizes, quotes, invoices, payment and print preparation remain external to this feature. No assisted ordering or production tracking was added.

## Verification

- `node tests/print-shop-design-sharing.mjs`: actual service handler with synthetic auth/database/storage; both engines, byte-exact ZIPs, owner isolation, admin MFA, shared capability isolation, lock changes, revision conflict, suspended access and Team exclusion.
- `tests/print-shop-design-schema.sql`: private table grants/RLS and private ZIP bucket in isolated PostgreSQL, included in existing CI.
- `node tests/print-shop-design-browser.mjs`: existing real 2D/3D renderers in desktop/mobile browser, synthetic services only. Requires Playwright available to Node and a locally cached approved T-shirt GLB (`MQD_TEST_TSHIRT_GLB`); `THREE_ROOT` and `CHROME_PATH` optionally select existing local dependencies/browser. No real emails, payments or production data.
- Existing onboarding, paid access, logo, management, subscription, Team API and frozen-garment tests remain required.

## Review and release status

Prepared for review only. The new database migration, private bucket and Edge Function are not applied to production. The existing request Edge Function also gains a shared-link permission check and must be released together. Deploying the frontend alone will not activate sharing. The review branch disables automatic Vercel deployments.

Before an authorized release: apply the new migration, deploy `mqd-print-shop-designs` and the updated `mqd-print-shop-pilot` with their dependency imports, release the frontend, and verify a synthetic owner design/locked/unlocked link in the release environment. Existing required security/access checks must pass. Do not enable billing or send real customer messages as part of release verification.

The Supabase CLI was unavailable locally, so the review migration was authored directly; its SQL is exercised by CI rather than applying it to the live database.
