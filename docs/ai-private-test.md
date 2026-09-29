# Private AI artwork test

Historical manual-test record. The current implementation and release gates are documented in [Automatic ChatGPT artwork transfer](ai-automatic-transfer.md); that flow replaces the separate background request and file import described below.

Public AI controls and MCP draft creation remain paused. This repair is enabled only on loopback hosts with `?ai-test=1`; that query never enables a deployed site.

From the repository, serve the static site bound to loopback (for example `python3 -m http.server 8765 --bind 127.0.0.1`) and open `http://127.0.0.1:8765/?ai-test=1`.

1. Open Design with your ChatGPT and upload a logo.
2. Describe the garment, background, logo placement, and wording. Copy the layout request and paste it into ChatGPT. Click **Open your design in MyMerchNow** in its response. ChatGPT computes the layout URL using code execution; the exact originating website and context ID preserve local test access and restore that draft's saved images. File/code import remains a collapsed backup when code execution is unavailable.
3. Use Create background in ChatGPT to copy the separate image request. Paste it into ChatGPT, then download the generated flat background image. Image generation and layout creation are separate requests so an image-only response cannot silently omit the layout.
4. If a new background is needed, upload it on the returned designer page. A pending draft applies automatically after the image upload; a return link with all saved images applies immediately. Missing required artwork blocks application without changing the garment. The paused plugin and merchant OpenAI API key are not used.
5. Inspect all zones in 2D and rotate the 3D preview. Check print quality at the intended size. Generated artwork is not automatically print-resolution artwork.

The logo/background are stored in IndexedDB for 24 hours and matched using a random draft context ID. Reloading the originating tab restores its context. Importing a draft in another tab of the same origin restores that draft's images. Other browsers/devices and expired or cleared storage require re-upload. Clear removes only the current draft's saved images, not other drafts or the displayed garment.

Missing required artwork, unsupported zones, duplicate/missing zones, invalid files, storage failures, and layer overflow must report an actionable error instead of claiming success. Asset checks run before the editor loads a draft. Reapplying replaces only AI-managed layers and preserves ordinary customer layers. Uploaded files retain their original resolution.

Logo sizing is translated from a contained-zone fraction to the existing editor's cover-fit scale using the uploaded image dimensions and the current design export's template dimensions. This reads template sizes but never writes templates or renderer settings. Select the draft's garment before applying a logo-bearing draft. Background images retain cover-fit. The prompt explains the separate text-size multiplier; review text size and contrast in the preview.

Verified locally on 2026-09-29: real ChatGPT-generated red/black water background downloaded and uploaded; ChatGPT layout imported through the JSON fallback; missing background blocked without changing the garment; both images and the draft survived reload; all five T-shirt zones received the background; front and smaller back logos rendered, with the phone below the back logo. Proofs exported from the existing 3D and flat-mockup controls. The test used the repository brand logo, not the user's teddy image (only its screenshot was available). This is not a print-quality approval or public launch.

Run `node tests/ai-artwork-handoff.mjs` and `node tests/ai-boundary-regression.mjs` for the contract/payload and frozen-engine checks. The repository's broader frozen-product test currently has a pre-existing catalog-name baseline mismatch; do not update that baseline as part of this repair.

Do not re-enable the public button or MCP endpoint until the actual customer flow has been reviewed. Return links carry the layout only; original logo/background images restore from same-browser storage. Newly generated background files still require the agreed manual image upload.

## User-reviewed chest placement calibration (2026-09-29)

The user explicitly requested a limited T-shirt preview calibration: preserve the front logo's 2D height, raise it only in 3D, and preserve the already-correct back foreground mapping. AI layers now carry their source zone. Front AI logos receive a 12% upward preview offset (3 percentage points more than before); back logos/text retain the existing 9% correction. AI full-zone backgrounds receive no foreground offset, lowering their pattern to the 2D frame and removing the artificial blank hem. Other products, ordinary customer layers, locked library artwork, UV geometry, GLBs and templates are unchanged.

Prompt defaults now suggest front chest logo y=-30/contained scale=.54, back logo y=-55/scale=.45, and back phone y=-25/text scale=.89/Anton/spacing=5. Explicit customer revisions take precedence. The private browser test reimported the user's exact adjusted coordinates and sizes through the actual file input; it did not overwrite the 2D heights to compensate for 3D. Run `node tests/tshirt-text-mapping.mjs` in addition to the AI tests. This calibration remains private pending visual approval.
