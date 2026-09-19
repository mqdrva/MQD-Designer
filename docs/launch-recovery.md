# MQD launch protection and recovery

## Owner access

Owner Orders and Artwork Library require a verified admin role and a Supabase AAL2 session. The owner completes authenticator enrollment or verification in a dialog. Customer sign-in stays unchanged. QR secrets and codes are never logged or sent to a third-party QR service.

If an authenticator is lost, the Supabase project owner must verify identity and reset that user's factor through the dashboard. Do not remove MFA checks from the application to bypass recovery. Enable MFA separately on the Supabase dashboard, GitHub, Vercel and owner email accounts.

## File backup

Open `/owner-backup.html` in desktop Chrome or Edge while signed in as the owner. Choose a private local/external-drive folder. The exporter creates a new dated subfolder and downloads all four source buckets, retaining original paths and SHA-256 checksums in `manifest.json`. Every saved file is read back and checked. The manifest is marked complete only after all listings and downloads finish. Failed or interrupted exports remain incomplete and must be rerun.

Use **Verify an existing backup**, choosing the dated folder, to check every file again. This is a manual file backup, not a scheduled off-site service or a full database recovery test. The current files total approximately 1.27 GB; allow extra space. Store copies privately with disk encryption and access restrictions. Never commit customer files to the public GitHub repository.

Database backups are visible in the Supabase dashboard, but exclude file contents. For a full recovery drill, restore a database backup to an isolated new project and restore the files there using the manifest's original bucket/path values and the original bucket privacy settings. Compare all hashes and exercise a test design/order. Do not restore over production for a drill. A new project may incur charges and requires owner selection/approval.

Automated off-site backups remain pending selection and access to a private backup destination. Until then, run this export after new orders/uploads and retain dated copies.

## Monitoring

`MQD live site checks` runs approximately every 30 minutes, checking the storefront, customer script, contact/refund pages, guest service and anonymous rejection at both admin endpoints. Failures retry once, then fail the workflow without printing customer information. Enable GitHub Actions failure email notifications for the workflow owner and verify delivery. Scheduled Actions can be delayed and public-repository schedules can be disabled after inactivity; this is basic availability monitoring, not a guaranteed uptime service or browser runtime-error collection. Payment/email failures still require dashboard monitoring until a dedicated alert destination is configured.

## Saved artwork limits

The authenticated save endpoint validates the owner path, image signature and 20 MiB size limit. Daily server-enforced budgets permit 200 attempts / 512 MiB per account and 2,000 attempts / 10 GiB site-wide for saved artwork. Failures consume reservations. Direct client inserts and updates into customer-artwork are disabled after the new client is deployed; reads and deletions remain owner-only. These are daily ingestion budgets, not a lifetime retained-storage quota. Guest production submissions have their existing separate limits.

## Remaining owner acceptance checks

- Enroll the actual owner authenticator and confirm Orders/Library open after verification.
- Complete and re-verify the first external file backup.
- Select a private destination for automated backups.
- Verify alert delivery and configure runtime/payment/email error alerts.
- Complete an isolated restoration drill and a real purchase/refund/production-export acceptance check before unrestricted launch.
- Resolve the frozen-renderer baseline gate against the approved September 19 artwork fixes. The security changes do not modify renderer files. Do not regenerate baseline hashes simply to hide a failing test.
