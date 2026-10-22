# Hosted Shirt Games release — October 14, 2026

The user approved publishing the four tested games using existing MyMerchNow services, with no additional spending. Synced project sources and active Team/pilot work were not edited. The local alpha remains excluded from website deployment.

## Release contents

- Dedicated `/shirt-games/` page and secondary homepage Play Shirt Games card. Normal design and buying paths remain available.
- Private Supabase game records and original/cropped photos, hashed single-use slot invitations, version-checked concurrent updates, server-side hidden turns, shared reveal and creator review.
- Google accounts for creators and buyers; friends can contribute through their private slot links. Saved game designs reopen in the game.
- Existing 2D garment previews and canonical short-sleeve, long-sleeve and hoodie mappings. Twelve starter colors, optional purchasing and per-person garment/size choices.
- Crazy Faces uses a reviewed manual face/hair outline or a transparent upload online. No paid automatic background-removal provider was enabled.
- Immutable approved order snapshots reuse existing live Stripe checkout and webhook. Manufacturing ZIP access requires verified live payment, reviewed mapping, owner/admin role and MFA. Customers receive no manufacturing download.
- Owner Portal Games menu controls, live paid-game list and separate owner-only test proofs/sandbox orders.

## Verification evidence

48 game tests pass, including privacy, invitations, early finish, approved voting rules, concurrent writes, account recovery, original-image retention, full-size panel rendering, stale-proof rejection and sandbox webhook boundaries. Existing customer/owner checks and all 12 frozen garment / 66 mapping-section checks passed. Current release CI must pass before merge.

All four hosted game journeys passed on the official domain using creator/friend tabs. The user previously tested all four games and phone access in the local alpha. A new independent-network physical-phone check of the hosted release has not been performed by the agent.

Owner MFA was verified. Short-sleeve, long-sleeve and hoodie ZIPs were downloaded, digitally inspected and registered with current print-v2 template hashes. All 15 panel PNG dimensions and SHA-256 checksums matched their canonical manifests. These are digital export checks, not physical sample-print or seam-fit certification. Each paid order still requires production review for placement, seams, bleed and source-photo quality.

Actual Stripe sandbox order **MQD-F274F940FC** completed with published Stripe test-card details and fictional customer/shipping data: $40 shirt + $10 shipping, `livemode=false`, paid return page and signed webhook update. It appeared in Owner → Games under sandbox tests, remained excluded from live paid orders, queued zero notification emails and downloaded an owner-only paid sandbox proof. Five panel checksums/dimensions and customer/shipping metadata passed. The original approved draft was not converted into a test order. The sandbox detail projection was corrected to include fulfillment metadata, then downloaded and verified again.

Six additive game migrations are applied. Dedicated game Edge Function version 6 is active with custom verified-user/capability authentication. Only the existing test webhook was updated, with scoped game sandbox session binding and email suppression; the live webhook and live checkout implementation were reused unchanged.

## Release switches and operating limits

All three print-v2 garment hashes are reviewed. Database gameplay and checkout are enabled. `shirt-games/launch.json` enables the secondary homepage entry when this release deploys. This is an initially capped launch: 20 total game sessions, five per creator daily and a 25 MiB aggregate upload reservation. Eight MiB per-image limit and 30-day game access expiry also apply. Expired access does not delete paid fulfillment snapshots. Capacity and retention need review before a larger rollout; these limits can pause new games/uploads and do not promise unlimited service.

No new service, subscription or paid background API was purchased. Existing-plan usage can increase, so zero incremental cost is not guaranteed. Private owner QA downloads are excluded from Git and deployment.

Earlier Alfreda cancellation remains unconfirmed. Local runtime photos, game records, participant secrets and owner QA archives must never be committed or published.
