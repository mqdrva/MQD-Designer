# Three-game local verification — October 14, 2026

Scope: local computer-only test on 127.0.0.1:8770. Fresh creator/friend tabs were used. No production website, database, active Team work or checkout was changed.

## Browser results

| Game | Verified flow | Local result |
| --- | --- | --- |
| Pass the Shirt | One invite means two participants; secret creator message and reserved placeholders; friend final turn opens shared reveal; front/back; creator approval; hoodie/color/size; placement requirement; unpaid draft | Passed; game 22dafd52-dba8-4e46-ac6d-cca6ad00f87f; draft GAMES-EC0FE5EB |
| Birthday Roast & Toast | Playful Roast with name Sam; private message and photo; photo permission/crop required; shared reveal; creator remove/restore; approval; front/back long sleeve; unpaid draft | Passed; game 440cf42c-9670-47b3-9a0a-7fedfd5a44e7; draft GAMES-A205BD40 |
| Your Friends Picked Your Shirt | Two invited friends; private ballots and optional prediction; all three submit; individual results; editable own result; zero-vote participant chooses a title; blank title blocked; long sleeve order draft | Passed after preview/order-context fix; game 2656f4d6-37b9-4269-a59c-8a267a3b92e7; drafts GAMES-2D1E4E8D and GAMES-32E149D6 |

All three tested creator tabs had zero captured browser console errors.

## Issue fixed

The voting screen could show another participant’s shirt while keeping the viewer’s own order form visible. Order controls now appear only while viewing the viewer’s own result; a View my shirt button returns there. Changing results clears placement approval, and a save guard rejects mismatched context. Browser retest confirmed the form is hidden while viewing Morgan’s result and returns for Casey’s own result. Personal edits do not change group assignments.

## Automated verification

25 tests passed, zero failed. In addition to the existing 22 checks, three HTTP journeys cover:

- Pass: out-of-turn denial, real server-response privacy, last-turn reveal, pre-approval ordering blocked, immutable approved art, hoodie draft, owner excludes unpaid orders, persistence/restart recovery.
- Birthday: Sweet and Playful Roast, private photo/message, creator-only early finish, removal before approval, long-sleeve draft.
- Voting: ballots hidden before reveal, approved tie order/repeats/zero-vote rules, empty result blocked, own saying stored against the correct buyer, group results unchanged by personal edits.

Run:

```sh
node --test games/tests/games.test.mjs games/tests/crop.test.mjs games/tests/faces.test.mjs games/tests/journeys.test.mjs
```

## Limits before launch

This confirms local desktop gameplay and draft flow only. The viewport override did not apply to the three existing test tabs (they still reported 1280px), so this run does not claim a phone-width pass. Physical phones, multi-device invitations, hosted authentication/private storage, real sandbox payments, authorized owner/production delivery, verified manufacturing PNG/ZIP output, accessibility and garment print/seam proofs remain launch gates. See launch-readiness.md. The owner portal is still a separate local test screen; no real payment or manufacturing download was enabled.
