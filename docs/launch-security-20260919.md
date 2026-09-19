# Launch security changes — 2026-09-19

Deployed to Supabase project `gsxuhpffgdffsqksrkrf`. No garment, editor, or mapping files changed.

## Customer artwork bucket

Dashboard/API configuration (not a direct write to Storage metadata): `customer-artwork` remains private; maximum file size is 20 MiB (20971520 bytes); MIME allowlist is `image/png`, `image/jpeg`, `image/webp`. Existing files remain intact. Apply the same settings when provisioning another environment.

## Guest submissions

The function bounds streamed multipart input at 64 MiB, including requests without Content-Length. It accepts at most 64 artwork files, 20 MiB each; mockups are limited to 12 MiB. It validates files and metadata before creating an order. Designs permit at most 12 zones, 100 layers per zone and 20 library layers.

Server-only, atomic daily budgets: 500 attempts site-wide, 100 per IP and per guest token; 10 GiB reserved artwork site-wide and 2 GiB per token. Reservations include uploaded files plus the maximum 50 MiB for each library master copied into production storage. Rejected or interrupted requests do not refund reservations. Budgets reset at the database's date boundary and stale counters are removed after two days.

IP headers are not treated as authentication. The global budget remains effective if tokens/IPs rotate; these caps bound abuse but are not a substitute for bot protection or traffic monitoring. Review limits against real launch traffic.

## Background removal and payment notifications

Background removal returns 503 without calling Photoroom if the rate-limit RPC errors or returns an unexpected result; exhausted allowance returns 429.

Live and sandbox Stripe handlers conditionally update only orders not already paid. Duplicate or late failed events cannot replace paid metadata. A database trigger atomically preserves production, shipped, completed and cancelled status when a payment update attempts to set paid, including concurrent owner updates. Signature and amount verification remain in place.

## Verification

- `node tests/launch-security-guards.mjs`: streamed size limits, file validation, unavailable/exhausted budgets, background-removal failure safety, signed first settlement, repeated/late Stripe events, invalid signature.
- `node tests/checkout-security.mjs`: existing checkout checks.
- Database transaction tests (rolled back): request/byte ceilings, service-role access, customer RPC denial, fulfillment-status preservation on temporary rows. No customer orders were used for these tests.
- Read-back of deployed source and bucket configuration.

No real card charge or email was initiated by these tests. Backup restoration, monitoring and administrator MFA remain separate launch checks.
