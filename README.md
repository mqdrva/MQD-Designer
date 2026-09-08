# Morales Quality Designs — AOP Studio v5

Static multi-product 3D apparel designer and catalog-admin prototype.

## Included products
- All-Over Print T-Shirt — Front, Back, Left Sleeve, Right Sleeve, Collar
- Long Sleeve T-Shirt — Front, Back, Left Sleeve, Right Sleeve, Collar
- Short Sleeve Polo — Front, Back, Left Sleeve, Right Sleeve, Collar
- Long Sleeve Polo — Front, Back, Left Sleeve, Right Sleeve, Collar
- Fleece Hoodie — Front, Back, Left Sleeve, Right Sleeve, Hood
- Lightweight Jacket — Front, Back, Left Sleeve, Right Sleeve, Collar
- Mask — Entire Mask
- Long Sleeve Shirt With Hood And Built-In Mask — Front, Back, Left Sleeve, Right Sleeve, Hood, Built-In Mask
- Shorts — Front, Back
- Sweat Pants — Front, Back
- Long Sleeve Shirt With Hood — Front, Back, Left Sleeve, Right Sleeve, Hood
- Hat — Front Panel, Top of Bill

## Admin
Product Admin stores editable product name, category, price, and zone lists in localStorage. This means names and zones can be corrected without editing the code in a deployed browser session. For a real multi-user site, move this catalog to a backend/database.

## Deployment
This is a static site and can be deployed on Vercel, Netlify, Cloudflare Pages, or any static host. No build step is required.

## Manufacturing note
The production ZIP is a prototype export. Before manufacturing, replace the simple zone-slice logic with factory-authoritative UV/pattern masks for each garment.


## V6 production-template update
The T-Shirt now includes the four supplied production template images: front, back, shared sleeve, and collar. Exact maximum artwork sizes are encoded in the T-Shirt product configuration. The ZIP export preserves the supplied template references and creates dimension-matched artwork preview canvases. The preview canvases are not factory-ready flats until the UV-to-pattern placement is verified against the actual production pattern files.


## Long Sleeve Polo production template configuration
The Long Sleeve Polo uses the Short Sleeve Polo front (3730x4980), back (3730x5080), and collar (3180x1130) templates, plus the Long Sleeve Shirt sleeve template (2690x4120) for both left and right sleeves. No separate placket zone is defined.

## V8 production template catalog
All supplied production templates from the conversation have been added to the catalog where available. Template reuse rules:
- T-shirt: supplied front/back/sleeve/collar.
- Long Sleeve T-Shirt: T-shirt front/back/collar + long-sleeve sleeve.
- Short Sleeve Polo: supplied polo front/back/sleeve/collar.
- Long Sleeve Polo: polo front/back/collar + long-sleeve sleeve.
- Fleece Hoodie: supplied front/back/sleeve/hood.
- Lightweight Jacket: supplied rain-jacket front + hoodie back/sleeves/hood.
- Mask: one rectangular zone, factory pixel dimensions pending.
- Long Sleeve Shirt With Hood And Built-In Mask: long-sleeve shirt front/back/sleeves + hoodie hood + rectangular built-in mask zone.
- Sweat Pants: supplied front/back at 3670x5960.
- Long Sleeve Shirt With Hood: long-sleeve shirt front/back/sleeves + hoodie hood.
- Hat: supplied front panel and top-of-bill.
- Shorts: front/back zones remain provisional because no factory template dimensions were supplied yet.


## Shorts front production template
The Shorts front is a single combined printable zone covering both front leg areas. Maximum artwork: 2145 × 3480 px. Back template remains pending.


## Shorts back production template
Shorts Back is a single combined printable zone covering both back leg areas. Maximum artwork: 2455 × 3650 px. Shorts now has supplied front and back production templates.


## Mask production template
The Mask uses one rectangular printable zone covering the entire mask. Maximum artwork: 3100 × 3110 px.


## V12 production catalog
Corrected the Shorts template configuration and added confirmed Mask/Built-In Mask dimensions (3100x3110). Added `assets/production-manifest.json` as the canonical dimensions manifest for the 12-product catalog.

## V13 — all-product UV calibration workspace
This build adds a UV occupancy diagnostic image and JSON report for every garment GLB.
It also adds `assets/production-mapping-v13.json`, containing the complete product/zone/template map.
The diagnostics are intended to support exact UV-to-factory-pattern calibration; they do not by themselves prove that a supplied template and GLB UV island are geometrically identical.


## V14 — corrected Lightweight Jacket asset
The Lightweight Jacket product now points to the newly supplied `lightweight-jacket.glb`. Its UV occupancy diagnostic and UV report were regenerated from that corrected GLB. This verifies UV readiness but does not certify exact factory-template correspondence until panel-level calibration is confirmed.

## V16 — Supabase garment storage connection
All 12 product GLB model URLs are configured to load from the public Supabase `garments` bucket.
Vercel remains responsible for the web application; Supabase Storage serves the larger 3D assets.
The Supabase project URL and publishable key are stored as Vercel environment variables for later application/backend use.
No service-role/secret key is embedded in the browser code.
