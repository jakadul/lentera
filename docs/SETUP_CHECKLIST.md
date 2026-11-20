# What is left, in order

Everything below happens on your machine. Code, build, and docs are done.

## 1. Push to GitHub

Create the repo first at https://github.com/new (public, no README).

```bash
cd /home/ubuntu/lentera
git remote add origin https://github.com/<you>/lentera.git
git branch -M main
git push -u origin main
```

## 2. Add Actions secrets

Repo → Settings → Secrets and variables → Actions → New repository secret.
Add these seven (values are in your local `.env`, minus the `VITE_FB_` prefix):

```
FIREBASE_API_KEY
FIREBASE_AUTH_DOMAIN
FIREBASE_PROJECT_ID
FIREBASE_STORAGE_BUCKET
FIREBASE_SENDER_ID
FIREBASE_APP_ID
FIREBASE_APPCHECK_SITE_KEY
```

## 3. Turn on Pages

Repo → Settings → Pages → Source: **GitHub Actions**.

The `deploy-demo` workflow publishes `dist-demo/`. Your URL becomes:

```
https://<you>.github.io/lentera/demo.html
```

## 4. Allow the Pages domain in reCAPTCHA

Firebase console → App Check → Apps → your web app → reCAPTCHA Enterprise →
Manage → add `<you>.github.io` to allowed domains.

Without this, the hosted demo gets rejected by App Check on every request.

## 5. Deploy Firestore rules

```bash
npm i -g firebase-tools
firebase login
cd /home/ubuntu/lentera
firebase use --add          # select lentera-56f8e
firebase deploy --only firestore:rules,storage
```

## 6. Load and test the extension

```bash
cd /home/ubuntu/lentera
npm run build
```

```
chrome://extensions
→ Developer mode ON
→ Load unpacked → /home/ubuntu/lentera/dist
```

Open any article → click the Lentera icon → Summarise.
Badge should read **On-device ready** (Chrome 139+, flag on) or **Cloud only**.

## 7. Record the video

Follow `docs/VIDEO_SCRIPT.md`. 2:40, hard cap 3:00, English captions burned in.
The strongest shot is the on-device run with DevTools Network open and empty.

Upload to YouTube as **public**.

## 8. Submit on Devpost

Use `docs/DEVPOST_COPY.md` for every text field. Fill in:

- Repo: your GitHub URL
- Video: your YouTube URL
- Try it: your Pages URL

Submit before **Nov 30, 2026, 2:00 PM PT** (= 19:00 WIB).

## If something breaks

Paste the exact error text. Not a summary of it — the string.

| Symptom | Likely cause |
|---|---|
| `Firebase config is still a placeholder` | built before `.env` was filled |
| `App Check: error ...` in the popup footer | site key wrong, or App Check not enabled on the web app |
| Badge stuck on "Cloud only" | Chrome < 139, or the Prompt API flag is off |
| Badge says over the on-device limit | the document really is over 9216 tokens |
| `Failed` on the first call | model still downloading; wait, then retry |
