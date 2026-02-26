# How you're running the app — and how to see the latest changes

There are **two different ways** you can view the RoadRace app. Which one you use determines whether you see the latest code from your computer or an older version that was deployed earlier.

---

## 1. **Phone + Expo Go (QR code)** — **this is the latest code**

When you run in a terminal:

```bash
cd app
npx expo start
```

Expo shows a **QR code**. You open the **Expo Go** app on your phone and **scan that QR code**.

- Your phone then loads the app **from your computer** (your dev server).
- You are seeing the **current code** on your machine — the same files we’ve been editing.
- **To see new changes:** Save the file in your editor. The app on the phone will usually reload automatically (hot reload). If it doesn’t, shake the phone and tap **Reload**, or press `r` in the terminal where Expo is running.

So: **if you’re scanning the QR code from `npx expo start`, you are already on the latest version.** Reload the app (shake → Reload) if you don’t see updates.

---

## 2. **Vercel (or any deployed web URL)** — **this is a snapshot from when you last deployed**

The **POC Hosting Guide** describes building the app for **web** and deploying it to **Vercel**. That gives you a URL like:

`https://your-app-name.vercel.app`

- When you open that URL (in Safari on your phone or any browser), you’re viewing the **deployed** build.
- That build only updates when you run a new build and deploy again (e.g. `npx expo export:web` and push to Vercel).
- So the **Vercel URL does not** automatically show the latest changes you make on your computer. It shows whatever was last deployed.

If you want to see the **latest** UI changes (logo size, avatar, name position, etc.), use **Expo Go + QR code**, not the Vercel URL.

---

## Quick checklist: “Am I on the latest?”

| What you're doing | Are you on the latest? |
|-------------------|-------------------------|
| Scan QR code from `npx expo start` with **Expo Go** on your phone | **Yes** — same code as on your PC. Reload (shake → Reload) if needed. |
| Open a **Vercel URL** (e.g. `*.vercel.app`) in the browser | **No** — you see the last **deployed** build. Redeploy to update. |
| Run the app in **iOS Simulator** (press `i` in Expo terminal) | **Yes** — same as QR code; reload if needed. |

---

## Summary

- **To see the latest changes we make in the code:** Use **Expo Go** on your phone and scan the QR code from `npx expo start`. After saving files, reload the app (shake phone → Reload) if it doesn’t update by itself.
- **Vercel** is for a **hosted web version**; it only updates when you build and deploy again, so it’s not the right place to check “latest” during development.
