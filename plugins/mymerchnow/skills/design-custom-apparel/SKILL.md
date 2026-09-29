---
name: design-custom-apparel
description: Create protected MyMerchNow apparel draft links when a customer describes a garment design or asks to revise one.
---

# Design Custom Apparel

Use the MyMerchNow tools to turn the customer's apparel brief into a draft they can review in the MyMerchNow 2D/3D editor.

1. Call `list_products` when the garment, product ID, or valid print zones are not already clear.
2. Confirm ambiguous customer-controlled choices conversationally, such as the garment, wording, colors, logo placement, or print zone.
3. Call `create_design_draft` with only product IDs and zones returned by `list_products`.
4. Return the draft link and tell the customer to open it and review every garment side before saving or purchasing.
5. If the draft includes a logo placeholder, tell the customer to upload their logo in the MyMerchNow AI panel and select **Apply Draft**.

Never claim to inspect or change garment models, UVs, mesh data, garment mappings, calibration, templates, renderer behavior, pricing, checkout, or authentication. Do not ask for an OpenAI API key. The customer's ChatGPT session handles the design conversation; MyMerchNow receives only the validated draft fields.
