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

43 game tests pass, covering invitation/reveal privacy, races, saved-design ownership, checkout guards, original retention, manual cutouts and panel dimensions. Existing customer account and owner-security checks pass. All 12 frozen product definitions and 66 shared garment-mapping sections remain unchanged.

Four additive migrations have been applied and the dedicated game Edge Function has been deployed. Initial live smoke checks returned the four-game catalog, rejected game creation while disabled and denied untrusted origins. Gameplay was then enabled at the direct link for hosted verification; checkout and the homepage entry remain off. SQL tests for game writes, client denials and the ordinary order bridge were transactional and rolled back. No real orders or customer photos were created by those tests.

## Still required before enabling customer purchases

- Owner authentication/MFA completion, protected production-tool walkthrough and an independent-network phone check. Customer Google sign-in and all four hosted browser game flows passed.
- Existing Stripe sandbox end-to-end payment-to-Games-order verification; no real charge should be made as a test.
- Owner review of the actual panel PNGs for short sleeve, long sleeve and hoodie: placement, bleed, seams and photo quality. Technical pixel-dimension checks do not establish physical print suitability.
- Final public release verification and deliberate launch-switch changes. `shirt-games/launch.json` and database `checkout_enabled` remain false. Database `enabled` is true for direct-link hosted gameplay with the initial caps.

## Cost and release limits

No new service, subscription or paid background API was provisioned. Existing plan usage can still increase; zero incremental usage cost has not been guaranteed. Initial game storage is capped at 25 MiB and creation at 20 games total / five per creator daily. These are initial verification limits, not a promise of unlimited production capacity. Expired game access ends after 30 days; paid production snapshots remain private for fulfillment. A retention/cleanup operating policy and capacity review are still needed before a larger rollout.

Earlier Alfreda cancellation remains unconfirmed. Local runtime photos, records and access codes must never be committed or published.

## Hosted browser evidence

All four games completed on `https://mymerchnow.app/shirt-games/` using separate creator/friend tabs and the real Edge Function/private database. Pass verified hidden turns and a reveal for both participants, then saved matching short-sleeve, long-sleeve and hoodie drafts. Birthday verified explicit early finish with an unused slot and removal/restoration before creator approval. Voting verified displayed-order ties, a zero-vote self-choice and a personal saying draft. Crazy Faces verified manual outline controls and an approved transparent upload; originals/crops were stored in the private bucket and shared only at reveal. A nonpersonal authorized logo was the upload fixture; this does not validate extraction quality on real faces. No real order or charge was created.

Hosted testing exposed a shared rate counter that could block creation after ordinary refreshes; creation now has a separate counter. Guest accounts retain the Google sign-in option. Production reconstruction now records contain/cover framing for manual outlines, with an edge-retention regression test and layout-version bump. Owner query filters use the selected embedded-order alias. Existing site launch, cart, frozen-product and AI-boundary CI checks passed on the merged integration.

The Owner Portal is open at its existing authenticator challenge. The agent has not entered codes, completed owner MFA, downloaded hosted production proofs, run the full Stripe game-payment test, approved print layouts or enabled customer purchasing. Completion depends on the owner verification and actual panel review.
