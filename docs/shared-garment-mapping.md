# Shared premium garment mapping

The main MYMERCHNOW designer and branded 3D service designer now compose their mapping from one canonical source. All twelve premium garments use `v20/garment-mapping-catalog.js` for model URLs, zones and artwork frames. Mapping, template masks, text/image placement, preview transforms and production drawing live in the marked sections of `v20/garment-mapping-source.js` and its imported garment helpers.

Edit the canonical source or imported helper, then run `npm run build:mappings`. Do not edit generated `@mapping-begin` sections in either editor. The release build runs the same composition automatically; CI rejects stale generated code. Both entry points receive the same content-based version, including helper, calibration and template changes. Customers receive the released improvement when reopening or refreshing their designer.

Composition preserves each host's lexical state and callbacks without moving shopping, service access, business pricing or account logic into the mapping engine. Service-specific logo drawing remains in the local `drawImageLayer` adapter, which delegates ordinary artwork to the shared `drawMappedImageLayer`. Keep `ensureBusinessLogo`, fixed-logo guards, selection/DPI policy and export package validation in the service host. The pending Brand/Team logo branch must retain its adapter when rebased; it is not included in this mapping release.

The existing Everyday cotton-only 2D designer is a separate physical print-area system; these twelve premium mappings apply to the paired 2D artwork editor and 3D preview used by the main and branded premium designers. A separately hosted copy outside this deployment does not receive updates automatically.

Validation: `npm run check:mappings`, `node tests/shared-garment-mapping.mjs`, the frozen twelve-product baseline, garment mapping regressions, and service access/onboarding regressions. The propagation test edits the canonical mapping in a temporary fixture and checks both hosts and cache versions, while protecting a fixed-logo adapter. Existing approved renderer function hashes remain unchanged in the main designer.

Deployment changes only add the mapping preparation build and normal cache versioning. Billing, fulfillment, customer submissions and the pending service management/Team release remain separate. Physical print/sew accuracy still requires production verification; no manufactured sample is certified by this change.
