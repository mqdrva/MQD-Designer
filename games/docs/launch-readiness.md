# Launch readiness — local alpha only

The user requested keeping this local because no separate test backend or payment sandbox exists. This build is ready for local gameplay evaluation, not public launch.

## Required before public launch

1. Integrate existing customer authentication and owner/production-team roles, with server authorization and private durable upload storage. Replace local single-process file persistence, add recovery, retention/deletion and production abuse controls.
2. Connect invitations to protected multi-device sessions. Test expired/reused slots, interrupted uploads, early finish and concurrent submissions across real devices. Contributions must never be delivered to other players before reveal.
3. Connect the existing designer and verified Premium AOP templates. The imported canonical garment mapping is recorded with drafts, but canvas mockups are illustrative and are not production print exports. Verify every required panel, bleed, physical dimensions, resolution and seams for each size/product; physically proof samples. Preserve the approved design when copying garments, with placement review.
4. Refine the wearable compositions and test real authorized face cutouts, varied size/angle and overlapping edges without obscuring eyes/mouths. The local Mac Vision helper now performs single-face separation; a production-compatible processor, hosting cost and broad photo quality remain unverified. Keep user cutout approval and test diverse hairstyles and poses.
5. Integrate an isolated payment sandbox first. Verify Stripe signatures server-side, bind checkout to an immutable order snapshot, validate amount/currency/payment state and process events idempotently. The current `recordVerifiedPayment` is a unit-tested trusted-adapter contract; it is not a real webhook or proof that payment integration works.
6. Route only verified paid game orders into the existing Owner Portal Games tab. Restrict manufacturing ZIP access to owner/authorized production staff. Include production PNG panels and an order manifest with color, garment, size, quantity and approved version. Keep customers unable to retrieve the package even with a guessed URL. Test the complete payment-to-production flow before enabling downloads.
7. Add game types through a maintained game registry when needed; current owner controls hide/reorder the four implemented games. Validate accessibility and mobile gameplay before release.

## Explicit limits

- All orders currently remain unpaid drafts; checkout and manufacturing export are disabled.
- Owner test access is a local token, not the existing portal login or production authorization system.
- Color choices are starter options, not verified popularity rankings or guaranteed available variants.
- No cost guarantee, public hosting, mandatory email notifications or runtime AI service was introduced.
- Existing live website, database, checkout and Team work were not changed. Earlier Alfreda cancellation is unconfirmed.
