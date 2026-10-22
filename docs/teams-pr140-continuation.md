# Teams PR140 continuation — 2026-10-22

This continuation merges main 8a050a3 into the existing Teams branch. It does not replace the live premade gallery or normal apparel checkout. PR152 remains independently owned.

## Implemented in this continuation

- Private organizer token and fresh MQD administrator/MFA master draft/publish actions.
- Immutable published versions with atomic revision checks and private database grants.
- Independent member copies using the existing gallery clone machinery. Only designated text/allowed choices may change; artwork, styling, placement, layer order and garment mapping are checked server-side.
- Historical versions survive subsequent publishing and are included in member order archives. Team/member/master association appears in the owner order view.
- Existing flexible locked-logo mode remains until a master is published. Masters currently use the existing 3D garment design format; ordinary 2D Teams customization remains supported.
- Original bytes and pixel dimensions are checked; zone PNG dimensions use existing garment mappings. Text fonts are bundled from the existing web-font stylesheet. System-only fonts that cannot be packaged fail before checkout, rather than silently substituting a font.
- Proposed ZIP limit: 50 MiB, 128 MiB uncompressed, 500 entries. Oversize files fail without downsampling. The private bucket limit migration was applied with backend version 4. Hosted runtime/memory acceptance remains a release test, not established by local execution.
- 2D rendered artwork now retains its physical placement instead of being drawn at the output origin.

## Verification completed locally

- Teams API and signed-webhook adapter tests, including organizer/MQD authoring and public/cross-team denial. Payment services mocked.
- Master copies, historical versions, required permissions, choices, styling and artwork tamper tests.
- Disposable PostgreSQL: existing order/access/cutoff tests plus immutable publishing, stale revision rejection and denied public grants. Supabase scheduler and Vault installation excluded; no production database writes used for these tests.
- Synthetic desktop/mobile browser: personalized fields, protected controls, independent second member, ZIP save/reopen, five zone outputs, original source integrity/dimensions and bundled fonts. Requests intercepted; no charges or messages.
- Existing launch suite: 12 garments / 38 checks; normal apparel checkout and mobile guest cart tests; shared mapping check.

## Release gates still to verify

Real Stripe test-mode checkout handoff/settlement with notifications suppressed, authenticated MQD download of the paid test order, hosted maximum-package behavior, and production deployment verification. Do not describe local/mock tests as live verification.

## Hosted verification — 2026-10-22

- PR commit 8dbf06d passed all four GitHub checks; hosted Vercel preview is reachable.
- Production additive master migration and Teams backend version 4 deployed. Master tables have RLS enabled and deny anonymous SELECT and authenticated INSERT.
- Deployed negative checks: disabled checkout returns 503; unauthenticated admin master access returns 403; unknown-team authoring returns 404. No orders, charges or messages created.
- Front end is still a PR preview, not the production Teams feature. Live collection remains disabled.
- Added explicit sandbox notification suppression so test orders cannot email customers or staff.

## Billing decision — collection remains disabled

The existing Teams service uses one live-enabled setting for new organizer subscriptions, garment checkout and combined shipping. Enabling it exposes the following existing behavior:

- An approved organizer explicitly accepts terms and completes $20/month Stripe subscription checkout to activate the team.
- 10 qualifying net-paid garments in a billing period earn one $20 credit on the next renewal; refunds/disputes reduce eligibility. No organizer payout or Stripe Connect.
- Optional combined batch shipping requires MQD capacity/address review and a $25 organizer payment; the order window is 7–14 days.
- Individual shipping uses existing $10/$15/$20 quantity tiers. All garment proceeds go to MQD.

On October 22, 2026, the user approved $20/month until canceled, a free next month after at least 10 qualifying paid garments in each billing month, and $25 combined shipment to the organizer. Policy version is now 2026-10-22. Collection may be enabled after the remaining release verification succeeds. Code deployment with collection disabled is separate from an active live Teams ordering feature.
