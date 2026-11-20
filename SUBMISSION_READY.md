# Submission ready

Repo: https://github.com/jakadul/lentera
Live demo: https://jakadul.github.io/lentera/
CI: build + deploy both green (run #11)

## What is verified working

| Check | Evidence |
|---|---|
| Extension builds | `npm run build` -> dist/, config injected |
| Demo builds | `npm run build:demo` -> dist-demo/ |
| Demo is live | https://jakadul.github.io/lentera/ returns 200 |
| Hosted bundle carries real config | apiKey, projectId, siteKey present |
| No placeholder tokens shipped | checked on the hosted bundle |
| 17 tests pass | router + integration + worker |
| 25/25 rehearsal checks | `npm run rehearse` |
| CI green | both workflows, 15/15 and 13/13 steps |
| No secrets in git history | scanned |
| Apache-2.0 licence visible | LICENSE at root, README names it |
| Extension artifact downloadable | `lentera-extension` artifact in run #11 |

## What only you can do

1. **App Check domain** — Firebase console -> App Check -> Apps -> web app ->
   reCAPTCHA Enterprise -> Manage -> add `jakadul.github.io`.
   Without this the hosted demo is rejected on every request.
2. **Deploy Firestore rules** — `firebase deploy --only firestore:rules,storage`
3. **Record the video** — `docs/VIDEO_SCRIPT.md`, 2:40, English captions.
4. **Submit** — `docs/DEVPOST_COPY.md` for every field.

## URLs for the Devpost form

- Repo: https://github.com/jakadul/lentera
- Try it: https://jakadul.github.io/lentera/
- Video: (paste your YouTube link)

Deadline: Nov 30, 2026, 2:00 PM PT = 19:00 WIB.
