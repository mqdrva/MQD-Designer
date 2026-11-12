# Print Shop fabric preferences and request receipts

Shops configure up to ten named fabric preferences per garment in their existing private setup. Customers can choose an offered preference, request another material for a shop quote, or leave fabric to shop confirmation when none are configured. No material is inferred from the preview or a generic garment name. The shop confirms stock, fabric suitability and final pricing.

Preferences are saved in order-request.json, restored when a ZIP or shop-created design is reopened, validated against the receiving shop on submission, and included in both emails. Existing saved designs without preferences reopen without inventing one. Team forms and checkout do not acquire fabric controls.

The existing request email still carries the original design ZIP to the shop. A separate plain-text receipt carries the reference and selected options to the customer, with replies directed to the shop and no artwork attachment. This is an unpaid request; the shop handles quotes, invoices, payments and preparation. No checkout or production tracking is added.

Delivery records shop acceptance before attempting the customer receipt. Separate stable provider keys, bounded retries and stored receipt status prevent resending the merchant ZIP on a receipt retry. Requests older than the provider retention window are not automatically resent. Historical requests remain receipt-null and are never emailed retroactively. A failed receipt does not turn an accepted shop request into a failure; the page tells the customer to retain the reference. Provider acceptance is not proof of inbox delivery. No background receipt queue is added; transient retries happen during the request, and a repeated identical request can retry a failed receipt within the bounded window.

## Release order

This branch is review-only and automatic deployment is disabled. After release authorization:

1. Apply docs/print-shop-receipts-schema.sql to the existing private request ledger. It adds delivery status and provider ID only, with no customer email storage or new public grants.
2. Deploy mqd-print-shop-setup with the updated contract and validator, and mqd-print-shop-pilot with contract.js, delivery.js and the existing saved-design service dependency.
3. Release the frontend, then verify a private preview and public shop branding. Changing a real shop’s fabrics or page logo uses its existing setup/review process. No billing settings change.

Rollback frontend and both functions together. The additive private ledger columns can remain; do not delete historical request data.

## Verification

Synthetic tests exercise actual 2D/3D submission handlers, ZIP/material agreement, unknown material rejection, original artwork byte preservation, shop acceptance followed by customer receipts, retry and partial failures, historical request suppression, rate-limited provider retries and ledger privacy. Existing design sharing, setup, logo, subscription/access and Team checks pass locally. A phone-sized browser preview verified offered and custom materials, unchanged artwork, save/download and reopen in both 2D and 3D. The existing 3D export was slow in that browser check; this change does not optimize that export path. No live requests, customer emails, subscription changes or charges were made.
