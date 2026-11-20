# Deploy — getting Lentera in front of judges

Two things need hosting: the extension itself (judges load unpacked, so it needs
to be downloadable) and the demo page (judges open a URL).

## 1. Push to GitHub

```bash
git remote add origin https://github.com/<you>/lentera.git
git push -u origin main
```

Add these repository secrets (Settings → Secrets and variables → Actions):

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_SENDER_ID
FIREBASE_APP_ID
FIREBASE_APPCHECK_SITE_KEY
```

Values are the same ones in your local `.env`. They are public client
identifiers, but keeping them in secrets means the repo carries no project
values at all.

## 2. Enable Pages

Settings → Pages → Source: **GitHub Actions**.

The `deploy-demo` workflow fires on push to main and publishes `dist-demo/`.
URL looks like `https://<you>.github.io/lentera/demo.html` (note: the site root
404s on purpose — `demo.html` is the only page).

That URL goes in the Devpost "Try it" field. It is the single most valuable line
in the submission, because the rules say judges are not required to install an
extension and may judge on video and text alone.

## 3. Publish the extension build

Two options.

**GitHub Release** (simplest). The `build` workflow uploads `dist/` as an
artifact. Download it, zip the *contents* (not the folder), and attach it to a
Release. Note that Chrome will not install a downloaded zip as an extension;
judges must unzip and use Load unpacked. Say so in the submission text.

**Chrome Web Store.** Cleaner for judges but the review queue can take days.
Given the Nov 30 deadline, do not rely on this.

## 4. Deploy Firestore rules

```bash
npm i -g firebase-tools
firebase login
firebase use --add          # pick lentera-56f8e
firebase deploy --only firestore:rules,storage
```

Rules live in `firebase/firestore.rules`. They are anonymous-owner scoped: each
device mints a random UUID, and every read and write is checked against it.

## 5. Hosted demo gotcha

Firebase App Check with reCAPTCHA Enterprise needs the **deployed domain** added
to the reCAPTCHA key's allowed domains, otherwise every request from the hosted
demo is rejected.

Firebase console → App Check → Apps → your web app → reCAPTCHA Enterprise →
Manage → add `<you>.github.io` to the allowed domains list.

The extension is exempt from this because `chrome-extension://` origins are
verified by the extension ID, not the domain list.

## 6. Final check before submitting

- [ ] `https://<you>.github.io/lentera/demo.html` loads and summarises
- [ ] Badge reads On-device or Cloud, never Unknown
- [ ] Extension loads unpacked from a downloaded zip
- [ ] Video is public on YouTube, under 3 minutes, English
- [ ] Repo About shows Apache-2.0
- [ ] No `.env` or debug token in git history (`git log -p | grep AIza` returns nothing)
