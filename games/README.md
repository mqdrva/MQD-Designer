# Shirt Games — local private alpha

Local-only implementation, October 14, 2026. No production deployment, database changes, checkout connection, or paid services. All new code lives in `games/`; the existing designer and Team work remain separate.

## Run

From this repository root, with Node installed:

```sh
MQD_GAMES_PICKED_RULES_APPROVED=1 node games/server/server.mjs
```

Open http://127.0.0.1:8770/ on this computer. This address cannot be used by friends on separate phones. Use separate browser tabs to claim invitations and test private participant sessions. The server stores private test state under `games/.runtime/`, excluded from Git. Do not distribute that directory: it contains original uploads and local owner access. Restarting changes the owner access token. Find the current private owner URL in `games/.runtime/owner-access.txt`.

## Included

- Four game flows, one to five invited friends plus the creator, reserved Pass the Shirt turns, and creator early finish.
- Server-side contribution privacy before reveal; one-use invitation slots and participant tokens.
- Photo uploads with permission and crop approval; original uploads retained privately. Crazy Faces uses the optional on-device Mac Vision helper for face-focused transparent cutouts, with user crop approval. No external extraction service is called.
- Front/back 2D previews, 12 starter colors, short sleeve / long sleeve / hoodie selection, placement review and unpaid order drafts.
- Birthday contribution removal and creator approval before order drafts.
- Approved voting rule: highest votes per person; ties use displayed saying order; sayings may repeat; zero-vote participants choose their result. Individual result editing is supported.
- Separate owner test screen for menu visibility/order and future paid game order handling. Customers have no manufacturing download route. Manufacturing export remains locked.

## Verification

25 automated tests passed for rules, contribution privacy, immutable drafts, owner access, HTTP boundaries and a simulated trusted payment adapter. Browser walkthroughs covered all four games, separate participant turns, photo crop approval, reveal and draft creation. The upload walkthrough used a nonpersonal logo image; real facial overlap quality still needs visual testing. Existing frozen product baseline and garment mapping checks passed.

```sh
node --test games/tests/games.test.mjs games/tests/crop.test.mjs games/tests/faces.test.mjs games/tests/journeys.test.mjs
node tests/frozen-product-baseline.mjs
node scripts/sync-garment-mapping.mjs --check
```

See `docs/launch-readiness.md` for remaining integration requirements.

## Local face cutout helper (Mac only)

Apple Vision separates a single face and hair from the background locally. It requires macOS 14+ and Xcode tools to compile once; no paid API or external upload is used. Unsupported hosts show an honest unavailable message and can accept a prepared transparent face PNG. This helper is a local prototype dependency, not a deployable cross-platform production service. Review hair edges/chin and unusual poses; no-face and multi-face photos are rejected.

Compile from the repository root before starting the local server:

```sh
xcrun swiftc -sdk /Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk -target arm64-apple-macosx14.0 -module-cache-path /tmp/mqd-swift-cache games/server/native/face-cutout.swift -o games/.runtime/face-cutout
```

New Crazy Faces uploads are separated before crop approval. Existing unapproved reveals have a creator-only “Use face cutouts & overlapping repeat” action; conversion is atomic and original photos remain private. The repeat covers front/back/sleeves with varying sizes/angles and protects previously drawn facial features when another cutout overlaps.

See `docs/three-game-verification.md` for the three-game browser walkthrough, corrected voting order context, and current launch limits.

## Temporary phone test over private Wi-Fi

Start the server with `MQD_GAMES_LAN_HOST` set to the Mac’s current private interface address, alongside `MQD_GAMES_PICKED_RULES_APPROVED=1`. The same process retains loopback access and binds a second listener to that exact interface, not all interfaces. Read the current phone URL, eight-digit code and expiry from ignored `games/.runtime/phone-access.json`. Do not commit or distribute runtime files. The eight-hour access code rotates on restart. Stop the server to end phone testing immediately.

Phone users enter the shared test gate code, then create a new game or follow their private participant invitation. Existing Mac participant sessions do not automatically transfer to a phone or to a different origin. Keep every test device on the same trusted Wi-Fi and keep the Mac awake. Local HTTP is not transport-encrypted; use test images rather than sensitive photos. No public tunnel, router forwarding, firewall change, hosted service or paid checkout is configured. Remote devices cannot access owner tools, even after entering the test code. Loopback owner access stays separate.

The gate preserves invitation fragments during login, rate-limits bad codes, expires after eight hours, and uses an HttpOnly SameSite cookie. On HTTP phone pages, invitation copy falls back to a selectable link. Automated gate tests require a connected private interface and use temporary listeners. Current suite: 28 passed.
