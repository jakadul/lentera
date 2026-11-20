# Demo video script — 2:40 target, hard cap 3:00

Record at 1080p. Show the Chrome extension toolbar icon, the popup, and the tab.
Speak English. Burn in captions so it works muted.

## 0:00 - 0:12 | The problem

Screen: a long article, then a laptop fan spinning.
Voice: "Every summariser ships your document to a cloud model. Costs money, needs
a network, and your text leaves the machine. Chrome has a local model now. Almost
nobody uses it, because it silently falls back and nobody knows which happened."

## 0:12 - 0:30 | What Lentera is

Screen: popup opening, badge reading "On-device ready".
Voice: "Lentera summarises on-device when the document fits, and tells you when it
does not. That badge is the real answer from the SDK, not a guess."

## 0:30 - 1:05 | On-device path

Screen: paste a short article (~2 pages). Click Summarise. Badge shows On-device.
Then: open DevTools Network, show zero requests during the call. Then switch off
Wi-Fi and run it again — still works.
Voice: "Short document, local model, no network tab activity. I can turn the wifi
off and it still summarises. Free, private, offline."

## 1:05 - 1:45 | Cloud escalation

Screen: paste a 60-page document (or a long pasted text). Click Summarise. Badge
switches to Cloud. Hint reads "~9800 tokens exceeds the 9216 on-device limit".
Voice: "Now a long document. The router counts tokens first, sees it is over the
9216 ceiling, and routes to the cloud. It tells you, before the answer arrives,
that this one left the machine. No silent fallback."

## 1:45 - 2:05 | The code

Screen: `src/router.js`, scroll through decideMode and classify. Then the
`getGenerativeModel(ai, { mode })` call and `response.inferenceSource`.
Voice: "The whole design is in a hundred lines. Decide the mode, make the call,
then verify with the SDK's own inferenceSource field. If it says cloud, the badge
says cloud."

## 2:05 - 2:25 | App Check + Firebase

Screen: Firebase console AI Logic page showing App Check enforced. Popup footer
showing "App Check: present".
Voice: "App Check is enforced, reCAPTCHA Enterprise attests the extension, and the
App Check status is visible in the UI."

## 2:25 - 2:40 | Close

Screen: badge switching On-device / Cloud on two runs.
Voice: "Lentera. On-device when it fits, cloud when it has to, and honest either
way."

## Recording checklist

- Close every other tab; judges see the whole screen.
- Do the on-device run with DevTools Network open and empty. That single shot is
  the strongest evidence in the video.
- Captions on, since the rules require English and silent autoplay is common.
- No third-party music, no third-party logos, no other brands on screen.
