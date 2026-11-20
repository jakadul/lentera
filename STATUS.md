# Status

Everything code-side is done and verified. `npm run rehearse` runs 22 checks
from the judge's perspective and passes all of them.

## Done

- Extension (MV3): popup, background worker, context menu, paste-from-page
- Hybrid routing: token estimate + Prompt API probe → explicit InferenceMode
- Firebase AI Logic with App Check (reCAPTCHA Enterprise)
- Firestore history with anonymous owner scoping, enforced by rules
- Hosted demo build for judges who will not install an extension
- 14 tests: 8 router unit tests, 6 end-to-end with a stubbed SDK
- `npm run rehearse`: 22 structural checks against the real build
- Docs: HLD, setup, submission criteria, video script, Devpost copy, deploy
- CI: build on push, Pages deploy on push to main

## Blocked on you

These need your browser, your accounts, or your face on camera. Nothing here can
be done from this machine.

1. Push to GitHub and add the 7 Actions secrets — `DEPLOY.md` step 1-2
2. Enable GitHub Pages — `DEPLOY.md` step 3
3. Add `<you>.github.io` to the reCAPTCHA allowed domains — `DEPLOY.md` step 4
4. Deploy Firestore rules — `DEPLOY.md` step 5
5. Load the extension and confirm a summary comes back — `docs/SETUP_CHECKLIST.md` step 6
6. Record a 2:40 video — `docs/VIDEO_SCRIPT.md`
7. Fill the Devpost form — `docs/DEVPOST_COPY.md`

Deadline: **Nov 30, 2026, 2:00 PM PT** = 19:00 WIB.

## How to hand back a problem

Paste the exact error string, not a paraphrase. Guessing from "it says an error"
costs a round trip every time.

## Verified numbers

```
build        config injected, no placeholders left
demo         config injected, no placeholders left
tests        14 pass, 0 fail
rehearse     22/22 checks passed
git history  0 key fragments
tracked      35 files
```
