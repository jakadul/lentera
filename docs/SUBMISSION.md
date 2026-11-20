# Submission pack — #BuildHybridAI 2026

Deadline: **Nov 30, 2026, 2:00 PM PT** (= Nov 30, 19:00 WIB). Judging Dec 10-16,
winners ~Dec 21.

Stage One is pass/fail: all requirements present, challenge addressed. Stage Two
scores 1-5 on four equally weighted criteria, averaged.

## Stage One checklist

| Requirement | Where it lives |
|---|---|
| Gen AI app on Firebase AI Logic | `src/firebase.js` → `getAI()` + `getGenerativeModel()` |
| Called at runtime, not just named in README | invoked in `src/popup.js` and `src/background.js` |
| App Check enforced | `ReCaptchaEnterpriseProvider` in `initFirebase()` |
| Platform selected (Web / Chrome extension) | `public/manifest.json` |
| Public repo with OSI licence visible in About | Apache-2.0, `LICENSE` at root |
| Demo video ≤3 min, YouTube public, English | `docs/VIDEO_SCRIPT.md` |
| Text description incl. AI Logic usage + value prop | Devpost form, text in `docs/DEVPOST_COPY.md` |
| No API keys / secrets / PII in repo | `.gitignore`, `.env` untracked |
| Free to test | extension is free, no login wall |

## Stage Two — where points are won

**Technological Implementation.** The router is the substance. It does not rely on
the SDK's silent fallback; it decides mode per request from token count and
`LanguageModel.availability()`, then verifies afterwards with
`response.inferenceSource`. Judges can read 100 lines and see the whole design.

**Design.** Complete product, not a proof of concept: popup with live disclosure
badge, context-menu flow, paste-from-page, Firestore history, honest failure
states, diagnosis line showing App Check and Prompt API state.

**Potential Impact.** Specific audience — students and analysts reading long
documents on a laptop — with a specific claim: text stays local when it fits, and
you are told when it does not. Verifiable in the demo in under a minute.

**Quality of Idea.** Non-obvious angle: the routing decision is surfaced to the
user as a privacy signal rather than hidden as an implementation detail. Most
hybrid demos flip to cloud silently and never mention it.

## Scoring notes

Tie-breaks compare Technological Implementation first, then Design, then Impact,
then Idea. Build depth there.

Grand Prize goes to the highest score across all categories; a submission can also
take one category prize.
