# Owner Team / Brand workspace

Entry: `/team-setup.html?ownerWorkspace=1`, also linked from Owner Orders and Team service management. Requires the existing approved MQD administrator account and authenticator verification. No new roles, grants, credentials, migration, gallery or checkout.

## Using it

1. Choose Team or Brand pilot. Enter the name, permanent link name and private organizer contact. Add a private placement request/reference if needed. Nothing is emailed by this workspace.
2. Choose flexible fixed-logo editing or strict master editing. Upload the original logo once (PNG/JPEG/WebP, up to 15 MiB); the page preview may be smaller, but the garment original stays unchanged.
3. Flexible mode: select 2D, 3D, or both and set each selected garment's logo to **Fixed**. Use only supported placement presets/dimensions. Members can add artwork and backgrounds around the fixed logo. This is the existing fixed-logo designer, not a granular background/artwork permission system.
4. Strict mode: choose 3D only and exactly one supported garment. Save the owner draft; open its 3D preview or master designer. Add artwork/backgrounds and example name/number text. Click **Save owner master draft**, then return to owner setup. Load the saved master, mark allowed text fields, name them, set maximum lengths/optional text choices, and publish a master version. All remaining artwork, backgrounds, styling and placement stay locked.
5. Save/reopen the owner draft as needed. Setup changes stay private until **Publish design review link** is clicked. Share the resulting normal `/teams/<slug>` customer URL yourself. It is viewable by anyone with the URL, grants no editor/admin rights, and supports independent member copies. Unpublish removes public access.
6. The link is design review only. No checkout, subscription, price promise, payout, email or invitation is created. Existing paid Teams continue their established billing/order workflow. Owner-created pilots do not silently acquire that billing workflow. Brand commercial terms and a commercial activation path for owner-created drafts remain a separate decision.
7. Paid orders already placed through the normal Teams service remain in Team service management with their purchased master versions and full production ZIPs. A review copy's **Save my design** ZIP is an unpaid design package, not a paid production order.

Organizer private links can manage their existing billing/requests but cannot save/load/publish masters. Owner-only authoring is enforced by the server using administrator app metadata plus existing MFA.

## Storage and safety

Uses existing private business rows for owner drafts and explicit published shop snapshots, existing Team accounts for association, and existing immutable master versions. Revision-conditional writes reject stale edits. A recoverable account-create step never exposes an incomplete draft publicly and never overwrites an existing account, order or payment. Organizer contact and private request/reference fields are omitted from member responses. No new database grants or migration are used.

## Validation

`tests/owner-team-workspace.mjs` executes the real handler with controlled data/payment adapters: MFA and role denial, private contacts, stale updates, draft/public isolation, explicit snapshot publish/unpublish, duplicate links, ordinary-Team overwrite denial and checkout denial.

`tests/owner-team-workspace-browser.mjs` uses synthetic mocked account/payment/email adapters to exercise owner form, save/reopen, 3D studio, master permissions, publish link, independent member editing and mobile review. It does not create live pilot records.
