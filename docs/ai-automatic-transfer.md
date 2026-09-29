# Automatic ChatGPT artwork transfer — private verification

The customer describes the complete shirt once on MyMerchNow. The copied request checks for the connected `prepare_design_preview` tool, generates the requested flat background inside the customer's ChatGPT, and passes the real generated file with the layout. The tool returns a link containing the validated layout, draft context, and temporary file reference. On opening that link in the same browser, the website retrieves the image through `/api/ai-artwork`, saves it with the original logo, and applies all layers automatically. No merchant OpenAI key or image-generation API is used.

## Deployment and connection

- Vercel previews enable the new MCP tool automatically. Open the preview's `/?ai-test=1` page and connect its `/api/mcp` endpoint in ChatGPT for testing. If Vercel protection blocks ChatGPT, use an authorized accessible test endpoint; do not silently disable protection.
- Production stays paused by default. `MQD_AI_HANDOFF_ENABLED=1` enables the transfer tool; `MQD_AI_PUBLIC_ENABLED=1` additionally enables the public interface. Enable public controls only after a real ChatGPT file handoff passes.
- Refresh/reconnect the ChatGPT tool catalog after deploying: the previous connection did not have a file input. The complete `openai/fileParams` schema declares `download_url`, `file_id`, `mime_type`, and `file_name`; only the first two are required.
- A Python static server cannot run the transfer endpoints. The Copy request button checks service availability and stops before opening ChatGPT if the backend is unavailable. Saved logo/prompt remain intact.

## Test once connected

1. Upload a logo in the deployed preview, describe the background and logo/phone placement, then copy the request into ChatGPT with MyMerchNow enabled.
2. Verify ChatGPT generates the flat image and calls `prepare_design_preview` with `backgroundAction=generate` and its actual file. An image alone or a fabricated file URL is a failure.
3. Open the returned link in the originating browser. Confirm the actual pattern, original logo, phone and all requested zones render without manual file transfer.
4. Revise layout using the saved background with `backgroundAction=reuse`, avoiding another generation. If a temporary file expires, resend the existing image through the tool.

Transfers accept only HTTPS ChatGPT file hosts, reject redirects and other URLs, sniff PNG/JPEG/WebP bytes, cap downloads at 20 MB, and decode/validate pixel dimensions in the browser before applying. URLs are passed in a fragment and POST body, never as query parameters to the image endpoint. Responses are not cached. Images stay in the customer's browser for 24 hours, scoped to a random context ID; changing browser/origin or clearing storage requires the original logo again. This does not promise permanent cloud storage or print resolution.

## Verification

`node tests/ai-automatic-transfer.mjs` covers file reference round trips, required generated files, blocked destinations/hosts, fragmented image bytes, expired file errors, size limits, spoofed MIME rejection, original logo preservation and placement. It makes no AI requests. Also run `tests/ai-artwork-handoff.mjs`, `tests/ai-boundary-regression.mjs`, and `tests/tshirt-text-mapping.mjs`.

Prior browser tests verified 2D/3D rendering and image restoration with downloaded red/black water artwork. Those tests were manual and do NOT establish that ChatGPT's generated-file transfer works. Record a separate live connector result before release.

The approved front logo preview offset, back logo/phone sizing and background correction are preserved. UV geometry, GLBs, templates, main renderer, pricing, checkout and auth are untouched.
