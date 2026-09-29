# Private AI artwork test

Public AI controls and MCP draft creation remain paused. This repair is enabled only on loopback hosts with `?ai-test=1`; that query never enables a deployed site.

From the repository, serve the static site bound to loopback (for example `python3 -m http.server 8765 --bind 127.0.0.1`) and open `http://127.0.0.1:8765/?ai-test=1`.

1. Open Design with your ChatGPT and upload a logo.
2. Describe the garment, background, logo placement, and wording. Copy the layout request and paste it into ChatGPT. Download `design-plan.json` and import it in the original designer tab. A JSON-code-block paste is available if ChatGPT cannot attach a file.
3. Use Create background in ChatGPT to copy the separate image request. Paste it into ChatGPT, then download the generated flat background image. Image generation and layout creation are separate requests so an image-only response cannot silently omit the layout.
4. Return to the original designer tab, upload the background image, then apply the draft. This first version uses file import; it does not use the paused plugin or a merchant OpenAI API key. Missing background artwork blocks application without changing the garment.
5. Inspect all zones in 2D and rotate the 3D preview. Check print quality at the intended size. Generated artwork is not automatically print-resolution artwork.

The logo/background are stored in IndexedDB for 24 hours and matched using a random draft context ID. Reloading the originating tab restores its context. Importing a draft in another tab of the same origin restores that draft's images. Other browsers/devices and expired or cleared storage require re-upload. Clear removes only the current draft's saved images, not other drafts or the displayed garment.

Missing required artwork, unsupported zones, duplicate/missing zones, invalid files, storage failures, and layer overflow must report an actionable error instead of claiming success. Asset checks run before the editor loads a draft. Reapplying replaces only AI-managed layers and preserves ordinary customer layers. Uploaded files retain their original resolution.

Logo sizing is translated from a contained-zone fraction to the existing editor's cover-fit scale using the uploaded image dimensions and the current design export's template dimensions. This reads template sizes but never writes templates or renderer settings. Select the draft's garment before applying a logo-bearing draft. Background images retain cover-fit. The prompt explains the separate text-size multiplier; review text size and contrast in the preview.

Verified locally on 2026-09-29: real ChatGPT-generated red/black water background downloaded and uploaded; ChatGPT layout imported through the JSON fallback; missing background blocked without changing the garment; both images and the draft survived reload; all five T-shirt zones received the background; front and smaller back logos rendered, with the phone below the back logo. Proofs exported from the existing 3D and flat-mockup controls. The test used the repository brand logo, not the user's teddy image (only its screenshot was available). This is not a print-quality approval or public launch.

Run `node tests/ai-artwork-handoff.mjs` and `node tests/ai-boundary-regression.mjs` for the contract/payload and frozen-engine checks. The repository's broader frozen-product test currently has a pre-existing catalog-name baseline mismatch; do not update that baseline as part of this repair.

Do not re-enable the public button or MCP endpoint until the actual customer flow has been reviewed. The manual file-import experience is separate from the previous automatic draft-link experience.
