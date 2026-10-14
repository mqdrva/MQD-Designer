> Current hosted work: see [hosted integration status](hosted-integration-status.md). The local-only status below describes the earlier alpha.

# Shirt Games site release plan

Status: user approved the appearance, local gameplay and phone gameplay, and requested moving to the site on October 14, 2026. This branch preserves that approved alpha. It does not provide a public launch yet.

## Verified target and source

- Repository: mqdrva/MQD-Designer; production branch main.
- Hosting project: mqd-designer-vercel (prj_s2IzWZbnIR32k7YrvJdTWbLDhTqo).
- Base: 6c56cad, matching origin/main when checked.
- Existing deployment uses a static output directory and hosted API functions. The alpha uses a persistent local Node process, local file storage and Apple Vision. These cannot be copied directly into the site's runtime.

## Deployment guard

The preparation branch disables its automatic Git deployment. A routing rule returns 404 for `/games` and everything below it before filesystem routing, and `.vercelignore` excludes `games/` from deployment uploads. This is intentional: the local private state, owner access page, server helper and computer-only API paths must not become public site content. Remove or narrow the guard only in the subsequent hosted implementation after its checks pass. Git excludes `.runtime/` independently; no uploaded photos, access codes, binaries or local game records belong in this branch.

## Work needed for playable site release

1. Port the validated game engine behind hosted authenticated endpoints. Replace local state persistence with transactional game/seat/contribution/order records. Test concurrent claims, submissions and early finish; local serialization is not a multi-instance lock.
2. Use private storage and server-side access controls for original images and crops. Keep all other players' contributions unavailable before reveal. Connect customer identity and owner/production roles to existing site auth; do not deploy the shared local access code as public auth.
3. Replace the Mac-only background-removal helper with a verified hosted processor or a supported on-device browser implementation. Preserve preview/crop consent and existing-cutout upload. External provider cost and suitability require verification; do not silently enable the existing paid-service path.
4. Add the secondary Play Shirt Games homepage card and dedicated page only once hosted APIs work. Preserve ordinary Start Designing and Buy paths. Register the four games so owner visibility/order controls persist.
5. Connect game order snapshots to the existing designer, verified garment mapping and sandbox payment flow. Enable real purchasing only after payment validation, replay protection, pricing and garment variant checks pass.
6. Add a Games tab in the existing owner portal. Route verified paid orders to authorized owner/production staff. Generate reviewed, garment-specific production panels and a manifest containing color, size, product, quantity and approved design version. Customers must have no manufacturing download endpoint.
7. Verify the hosted preview on real phones and separate networks, invitation privacy, expiry/recovery, upload handling, owner access, payment-to-production flow and print/seam proofs. Then release the tested deployment to the existing site.

## Current evidence

28 automated checks passed before this release preparation. The user confirmed phone access and reported all games working well. Browser walkthroughs and detailed local scope are recorded in three-game-verification.md. No real payment, manufacturing export, hosted identity/storage or cross-internet invitation flow has been tested by the alpha.

No live database, checkout, production deployment, paid service or active Team branch was changed by this release preparation.
