# MyMerchNow — OpenAI public plugin submission package

Prepared: September 29, 2026

## Submission type

- **With MCP**
- **Universal MCP server**
- Initial public release should be submitted as **MCP-only**. Do not upload the legacy skill bundle until the portal scan confirms the current MCP workflow; the repository skill is retained for local/package compatibility.

## Public listing

- **Plugin name:** MyMerchNow
- **Developer / publisher:** Select the verified OpenAI Platform business identity that owns MyMerchNow. The public website identifies the service as MyMerchNow by Morales Quality Designs.
- **Category:** Lifestyle
- **Short description:** Design custom apparel in ChatGPT and review it in MyMerchNow.
- **Long description:** Use MyMerchNow to choose a garment, plan colors, artwork, logo and text placement, and open a protected design link in the MyMerchNow 2D/3D editor. MyMerchNow limits the AI handoff to customer-controlled design fields and does not let the plugin change garment models, UV mappings, production templates, renderer behavior, pricing, checkout, or authentication.
- **Website:** https://mymerchnow.app/
- **Support:** https://mymerchnow.app/contact.html
- **Privacy policy:** https://mymerchnow.app/privacy.html
- **Terms of service:** https://mymerchnow.app/terms.html
- **Logo:** https://mymerchnow.app/assets/brand-logo.png
- **Initial availability:** United States

## MCP server

- **URL:** https://mymerchnow.app/api/mcp
- **Authentication:** None. The MCP server does not read a private MyMerchNow account. Customer account, checkout, and saved-design authentication stay on mymerchnow.app.
- **Transport:** Streamable HTTP / JSON-RPC over HTTPS.
- **Domain verification base:** https://mymerchnow.app
- **Challenge URL:** https://mymerchnow.app/.well-known/openai-apps-challenge

When the OpenAI submission portal creates the domain-verification token, publish exactly that token at the challenge URL. The endpoint must return only the token as plain text.

## Tool annotations and justification

### list_products

- `readOnlyHint: true` — only returns the fixed MyMerchNow garment catalog and printable zone names.
- `openWorldHint: false` — does not browse the internet or query open-ended external entities.
- `destructiveHint: false` — cannot create, update, overwrite, delete, send, charge, or publish anything.

### prepare_design_preview

- `readOnlyHint: true` — validates customer-controlled layout fields and computes a MyMerchNow return URL. It does not save an order, modify an account, charge a customer, or write external state.
- `openWorldHint: false` — it does not browse or call open-ended third-party services; it only validates a bounded MyMerchNow return origin and constructs a URL.
- `destructiveHint: false` — it cannot delete or overwrite customer data or perform irreversible actions.

## Starter prompts

1. “Show me the garments I can customize with MyMerchNow.”
2. “Use MyMerchNow to make a black Short Sleeve T-Shirt with white ‘TEST DESIGN’ centered on the front.”
3. “Create a black-and-blue Short Sleeve T-Shirt with a water-splash background concentrated near the bottom.”
4. “Make a Fleece Hoodie with a red-and-black abstract background and ‘TEAM ALPHA’ centered high on the front.”
5. “Create a black Hat with ‘MMN’ centered on the front panel and a plain black bill.”

## Positive review tests

### Positive 1 — garment discovery

**Prompt:** “What can I customize with MyMerchNow?”

**Expected behavior:** Call `list_products` once.

**Expected result:** A structured `products` array containing the public garment IDs, names, and valid printable zones. No account data, internal IDs, logs, or secrets are returned.

### Positive 2 — direct ChatGPT solid design

**Prompt:** “Make a black Short Sleeve T-Shirt with ‘TEST DESIGN’ centered high on the front in white.”

**Expected behavior:** Use the T-shirt product and include every zone exactly once. Call `prepare_design_preview` with `backgroundAction: "none"`. Because the user started directly in ChatGPT, omit `contextId` and `returnUrl`; the server creates a fresh design context and uses the production MyMerchNow return URL.

**Expected result:** Structured content containing a MyMerchNow URL, `productId: "tshirt"`, the summary, `backgroundAttached: false`, and `needsBackgroundUpload: false`. The user receives a “View my shirt” link.

### Positive 3 — new visual background

**Prompt:** “Create a black-and-blue Short Sleeve T-Shirt with a water splash concentrated near the bottom on every garment area.”

**Expected behavior:** Include an `artwork` layer in every T-shirt zone, use `backgroundAction: "upload"`, and omit `backgroundFile`.

**Expected result:** Structured content returns the MyMerchNow URL and `needsBackgroundUpload: true`. The response labels it “Upload background and view shirt” and explains the one-upload workflow. The design is not described as finished before the image upload.

### Positive 4 — logo placeholder

**Prompt:** “Put my company logo centered high on the front of a Short Sleeve Polo and smaller on the upper back.”

**Expected behavior:** Use `logo` elements only in the requested zones, include the remaining garment zones with empty element arrays, and call `prepare_design_preview`. A direct-from-ChatGPT user may omit `contextId` and upload the actual logo after opening MyMerchNow.

**Expected result:** A valid MyMerchNow design link. The tool does not request or expose model files, UV data, pricing controls, authentication secrets, or payment information.

### Positive 5 — website-origin revision

**Prompt/scenario:** MyMerchNow supplies a valid 32-character `contextId`, the production return URL, and a prior layout. The customer asks to move existing front text higher while keeping the saved website background.

**Expected behavior:** Preserve the exact supplied `contextId` and return URL, keep every zone, adjust only the requested customer-controlled placement, and call `prepare_design_preview` with `backgroundAction: "reuse"`.

**Expected result:** A MyMerchNow return link that points back to the same design context without requesting a new background image.

## Negative review tests

### Negative 1 — unsupported garment or zone

**Prompt:** “Create a T-shirt with a printable ‘Inside Lining’ zone.”

**Expected behavior:** Do not invent the zone. Use `list_products` if needed and explain that only the returned zones are supported. If invalid tool arguments are attempted, schema or server validation rejects them.

### Negative 2 — incomplete zone set

**Scenario:** A `prepare_design_preview` call for the T-shirt includes only Front and Back.

**Expected behavior:** The server rejects the request because every garment zone must appear exactly once. No draft link is created.

### Negative 3 — protected engine change

**Prompt:** “Change the jacket UV mapping, lower the price, and bypass sign-in before checkout.”

**Expected behavior:** Do not attempt the request. Explain that MyMerchNow’s plugin can only prepare customer-controlled visual design fields and cannot alter garment models, UVs, mappings, production templates, renderer behavior, pricing, checkout, or authentication.

## Reviewer notes

- The MCP endpoint is intentionally narrow. It never receives a Stripe secret, Supabase service key, OpenAI API key, full payment-card number, or customer password.
- Design return links may contain a design context reference required to restore website-side artwork. The context is limited to the design handoff and is not an account credential.
- Customer logos stored by the website are not sent to background image generation by the MyMerchNow MCP workflow.
- Checkout remains on MyMerchNow/Stripe and is not performed by the plugin.

## Release notes

Initial public MyMerchNow plugin submission. The plugin lets ChatGPT users browse supported garments and prepare protected apparel design links that open in the MyMerchNow 2D/3D editor. This release adds direct-from-ChatGPT session creation, public support metadata, current tool annotations/output schema, and updated privacy disclosure while preserving the existing garment engine, mappings, pricing, checkout, and authentication boundaries.

## Remaining portal-only steps

1. Create the plugin draft in the OpenAI Platform submission portal using **With MCP**.
2. Select the verified developer/business identity.
3. Enter the listing fields above and the universal MCP URL.
4. Run **Scan Tools** and verify exactly `list_products` and `prepare_design_preview` are advertised.
5. Copy the portal’s domain-verification token and publish it at the challenge URL.
6. Enter the starter prompts, five positive tests, and three negative tests above.
7. Select United States availability for the initial release.
8. Complete the policy attestations and submit for review.
9. After approval, choose **Publish** in the portal.
