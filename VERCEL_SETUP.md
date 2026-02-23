# Vercel setup for Send It (web app)

Follow these steps **exactly** so the build works.

## 1. Project root = `app` folder

In Vercel: **Your project → Settings → General**.

- Find **Root Directory**.
- Click **Edit**, set it to **`app`** (only that folder name), then **Save**.

If this stays as the repo root, Vercel will try to build the `api/` folder and hit size limits. The API runs on Render; Vercel should only build the Expo web app in `app/`.

## 2. Environment variable

In Vercel: **Your project → Settings → Environment Variables**.

- **Key:** `EXPO_PUBLIC_API_URL`
- **Value:** `https://send-it-ke7r.onrender.com` (no trailing slash)
- **Environments:** leave Production (and Preview if you want) checked → **Save**.

The app is also configured to use this URL by default if the env var is missing.

## 3. Build settings (optional)

With Root Directory = `app`, the repo’s `app/vercel.json` is used. It already sets:

- **Build Command:** `npm run build` (runs `expo export --platform web`)
- **Output Directory:** `dist`
- **Install Command:** `npm install`

You don’t need to change these in the dashboard unless you want to override.

## 4. Deploy

- Push your latest code to the `main` branch, or  
- **Deployments → … on latest → Redeploy**.

The first successful build can take a couple of minutes. After that, your app will be at `https://your-project.vercel.app`.

## If the build still fails

- Confirm **Root Directory** is exactly **`app`** (no slash, no path).
- Confirm **Environment Variables** has `EXPO_PUBLIC_API_URL` = `https://send-it-ke7r.onrender.com`.
- Check the **Build Logs** and look for the first red error line; that usually points to the fix.
