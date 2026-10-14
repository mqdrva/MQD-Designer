# Hosted Shirt Games integration — October 14, 2026

The user approved moving the tested games onto the existing MyMerchNow services and public site, with no additional spending. This supersedes the earlier local-only scope; the local alpha remains under `games/` and is excluded from site deployment.

## Implemented

- Dedicated `/shirt-games/` page and hidden secondary homepage entry, using the approved 2D garment images. Existing garment mapping is unchanged.
- Protected Supabase game records, private originals/crops and hashed slot invitations. Hosted mutations use version-checked commits and retry without overwriting other players.
- Google account sign-in for creators and buyers, capability-based guest contributions, server-side hidden contributions and shared reveal. Account-owned saved game designs return to the game instead of the ordinary blank editor.
- Browser face outline/transparent-cutout uploads, pinch/drag crop approval. The Mac-only automatic cutout helper is not used online; no paid background-removal provider is enabled.
- Existing checkout adapter and immutable game order bridge, with checkout disabled pending verification. Existing Stripe functions are reused unchanged.
- Owner Portal Games page protected by existing admin role and authenticator verification. Owner test proofs are separate from manufacturing packages; production download requires verified live payment and a reviewed garment template.
- Full-size PNG panels at canonical template pixel dimensions, original photos, crop/outline metadata and order/color/size manifest in the ZIP.

## Verified

42 game tests pass, covering invitation/reveal privacy, races, saved-design ownership, checkout guards, original retention, manual cutouts and panel dimensions. Existing customer account and owner-security checks pass. All 12 frozen product definitions and 66 shared garment-mapping sections remain unchanged.

Four additive migrations have been applied and the dedicated game Edge Function has been deployed. Live smoke checks return the four-game catalog, reject game creation while disabled and deny untrusted origins. SQL tests for game writes, client denials and the ordinary order bridge were transactional and rolled back. No real orders or customer photos were created by those tests.

## Still required before enabling customer purchases

- Hosted browser/phone walkthrough using real customer and owner authentication, including MFA.
- Existing Stripe sandbox end-to-end payment-to-Games-order verification; no real charge should be made as a test.
- Owner review of the actual panel PNGs for short sleeve, long sleeve and hoodie: placement, bleed, seams and photo quality. Technical pixel-dimension checks do not establish physical print suitability.
- Final public release verification and deliberate launch-switch changes. `shirt-games/launch.json` and database `enabled` / `checkout_enabled` remain false during preparation.

## Cost and release limits

No new service, subscription or paid background API was provisioned. Existing plan usage can still increase; zero incremental usage cost has not been guaranteed. Initial game storage is capped at 25 MiB and creation at 20 games total / five per creator daily. These are initial verification limits, not a promise of unlimited production capacity. Expired game access ends after 30 days; paid production snapshots remain private for fulfillment. A retention/cleanup operating policy and capacity review are still needed before a larger rollout.

Earlier Alfreda cancellation remains unconfirmed. Local runtime photos, records and access codes must never be committed or published.
