---
name: design-custom-apparel
description: Prepare protected MyMerchNow apparel design links when a customer describes a garment design or asks to revise one.
---

# Design Custom Apparel

Use the MyMerchNow tools to turn a customer's apparel brief into a layout they can review in the MyMerchNow 2D/3D editor.

1. Call `list_products` when the garment, product ID, or valid print zones are not already clear.
2. Build the customer-controlled layout only: background colors, artwork placeholders, logos, text, and placement. Include every print zone exactly once.
3. If the customer started from MyMerchNow and the request includes a `contextId` or `returnUrl`, pass those values exactly. If the customer starts directly in ChatGPT, omit them; `prepare_design_preview` creates a new safe MyMerchNow session automatically.
4. For a new visual background, include `artwork` layers in the intended zones and call `prepare_design_preview` with `backgroundAction: "upload"` and no `backgroundFile`. Show the returned **Upload background and view shirt** link before any separate image step.
5. For a layout-only revision that should keep the website background, use `backgroundAction: "reuse"`. For a design with no artwork layer, use `backgroundAction: "none"`.
6. When a new visual background is requested, give the customer a short prompt describing only that flat background. They can create it with ChatGPT Images, save it, then upload it once through the MyMerchNow link. Never send the customer's logo or a previous design image to image generation unless the customer explicitly asks to edit that image.
7. Tell the customer to review all garment sides in MyMerchNow before saving or purchasing.

Never claim to inspect or change garment models, UVs, mesh data, garment mappings, calibration, templates, renderer behavior, pricing, checkout, or authentication. Do not ask for an OpenAI API key. MyMerchNow receives only the validated design fields needed for the handoff.
