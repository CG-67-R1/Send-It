# Proof of Concept Hosting Guide — Send It (RoadRace)

This guide walks you through hosting the **Send It** app for proof of concept only (not production). You will deploy:

1. **API** (Node/Express in `/api`) — headlines, QA, calendar
2. **Web app** (Expo web build from `/app`) — static site

Use free tiers so there’s no cost for a PoC.

---

## Overview

| Component | Where it runs | URL you get |
|-----------|----------------|-------------|
| API       | Render (free)  | `https://your-api-name.onrender.com` |
| Web app   | Vercel (free)  | `https://your-app-name.vercel.app` |

You’ll deploy the API first, then build the web app with that API URL and deploy the app.

---

## Part 1: Deploy the API (Render)

Render’s free tier can run your Node API. Free services spin down after inactivity and may take ~30s to wake up.

### 1.1 Prepare the API for deployment

1. Open a terminal in the project root (e.g. `c:\RoadRace`).
2. Go into the API folder and install dependencies (if you haven’t already):

   ```powershell
   cd api
   npm install
   ```

3. Confirm it runs locally:

   ```powershell
   npm start
   ```

   You should see something like: `RoadRace Headlines API on http://localhost:3001`.  
   Stop it with `Ctrl+C` when done.

### 1.2 Create a Render account and web service

1. Go to [https://render.com](https://render.com) and sign up (e.g. with GitHub).
2. In the dashboard, click **New +** → **Web Service**.
3. Connect your repository:
   - If the project is in GitHub: connect the **RoadRace** repo.
   - If not: you can connect later or use “Deploy from Git” by pushing to GitHub first.
4. Configure the service:
   - **Name:** e.g. `roadrace-api` (this becomes `https://roadrace-api.onrender.com`).
   - **Region:** choose one close to you.
   - **Runtime:** **Node**.
   - **Build Command:** `cd api && npm install`
   - **Start Command:** `cd api && npm start`
   - If your repo root is the RoadRace repo (so `api` is a folder in the root):
     - **Root Directory:** leave empty.
     - Build: `cd api && npm install`
     - Start: `cd api && npm start`
   - **Instance Type:** **Free**.
5. Click **Create Web Service**. Render will build and deploy. Wait until the deploy shows “Live” and the log shows the server listening (e.g. on `PORT`).
6. Open **Settings** → your service URL. It should look like:  
   `https://roadrace-api.onrender.com`  
   Test: `https://roadrace-api.onrender.com/health` should return `{"ok":true}`.
7. **Copy this URL** — you’ll use it as the API base URL for the web app (no trailing slash), e.g. `https://roadrace-api.onrender.com`.

---

## Part 2: Build the web app (Expo) with the API URL

The app reads the API base URL from the environment variable `EXPO_PUBLIC_API_URL` at build time.

### 2.1 Set the API URL and build for web

1. In the project root, open the `app` folder:

   ```powershell
   cd c:\RoadRace\app
   ```

2. Set the API URL and run the static web export (use your real Render URL from Part 1):

   **PowerShell:**

   ```powershell
   $env:EXPO_PUBLIC_API_URL="https://roadrace-api.onrender.com"
   npx expo export --platform web
   ```

   **Command Prompt (cmd):**

   ```cmd
   set EXPO_PUBLIC_API_URL=https://roadrace-api.onrender.com
   npx expo export --platform web
   ```

   Replace `https://roadrace-api.onrender.com` with your actual Render URL.

3. When it finishes, you should see a `dist` folder inside `app` with static files (e.g. `index.html`, `_expo/`, assets). This is what you’ll deploy.

---

## Part 3: Deploy the web app (Vercel)

Vercel’s free tier is enough for a static PoC.

### 3.1 Install Vercel CLI (one-time)

```powershell
npm install -g vercel
```

### 3.2 Deploy the `dist` folder

1. From the **app** directory (where `dist` was created), run:

   ```powershell
   cd c:\RoadRace\app
   vercel
   ```

2. When prompted:
   - **Set up and deploy?** Yes.
   - **Which scope?** Your account.
   - **Link to existing project?** No (first time).
   - **Project name:** e.g. `send-it-poc` (or accept the default).
   - **In which directory is your code?** Use `./dist` (important: deploy the built output, not the whole app).

   If it doesn’t ask for the directory, after the first deploy you can run:

   ```powershell
   vercel --prod
   ```

   and in **Project Settings** in the Vercel dashboard set **Root Directory** to `dist` (if your repo root is `app`, then the root for the deploy would be `dist`).

   **Alternative (recommended):** Deploy only the contents of `dist`:

   ```powershell
   cd c:\RoadRace\app\dist
   vercel
   ```

   That way Vercel serves the static export directly. Use `dist` as the “root” for this project in Vercel.

3. After deploy, Vercel will print a URL like `https://send-it-poc-xxx.vercel.app`. Open it in a browser — you should see the Send It app. Headlines, QA, and Calendar will call your Render API (first load after idle may be slow due to Render’s free spin-up).

### 3.3 (Optional) Set env var in Vercel for future builds

If you use Vercel’s “Import project” from Git and build from source:

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**.
2. Add: **Name** `EXPO_PUBLIC_API_URL`, **Value** `https://roadrace-api.onrender.com` (your Render URL).
3. Set **Build Command** to: `npx expo export --platform web`
4. Set **Output Directory** to: `dist`
5. Redeploy so the build uses the env var.

For the simplest PoC, deploying from `app/dist` with the CLI (after building locally with `EXPO_PUBLIC_API_URL` set) is enough.

---

## Part 4: Optional — Netlify instead of Vercel

If you prefer Netlify:

1. Build the app as in Part 2 (with `EXPO_PUBLIC_API_URL` set and `npx expo export --platform web`).
2. Go to [https://app.netlify.com](https://app.netlify.com) and sign up.
3. **Sites** → **Add new site** → **Deploy manually** (or connect Git and set build to use `dist`).
4. For manual deploy: drag and drop the **contents** of `app/dist` into the Netlify drop zone. Netlify will give you a URL like `https://random-name.netlify.app`.
5. To use Git: set **Build command** to `cd app && npx expo export --platform web`, **Publish directory** to `app/dist`, and add `EXPO_PUBLIC_API_URL` in **Site settings** → **Environment variables**.

---

## Checklist

- [ ] API runs locally (`cd api && npm start`).
- [ ] API deployed on Render and `/health` returns `{"ok":true}`.
- [ ] `EXPO_PUBLIC_API_URL` set to the Render URL (no trailing slash).
- [ ] `npx expo export --platform web` run from `app` and `app/dist` exists.
- [ ] Web app deployed (e.g. `vercel` from `app/dist` or Netlify with `dist`).
- [ ] Opened the app URL and verified Headlines / QA / Calendar load (allow ~30s on first request if Render was idle).

---

## Troubleshooting

- **App loads but Headlines/QA/Calendar don’t:**  
  Check that `EXPO_PUBLIC_API_URL` was set **when** you ran `npx expo export --platform web`. Re-export with the correct URL and redeploy.

- **CORS errors in the browser:**  
  The API already uses `cors()`. If you still see CORS errors, ensure the browser is opening the app from the same origin as the deployed URL (e.g. the Vercel/Netlify URL), not from `file://` or localhost.

- **API returns 503 or times out:**  
  On Render’s free tier, the service sleeps after inactivity. The first request after a while can take 30–50 seconds; refresh once and wait.

- **Build fails on Render:**  
  Ensure **Build Command** and **Start Command** point to the `api` folder (`cd api && npm install`, `cd api && npm start`) and that **Root Directory** (if used) matches your repo layout.

---

## Summary

1. Deploy **API** to **Render** (free) and copy the service URL.
2. From `app`, set `EXPO_PUBLIC_API_URL` to that URL and run `npx expo export --platform web`.
3. Deploy the contents of `app/dist` to **Vercel** (or Netlify) and use the given URL as your PoC link.

This setup is for proof of concept only; for production you’d add proper auth, monitoring, and a production-grade backend and frontend hosting strategy.
