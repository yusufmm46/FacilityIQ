# Deploying FacilityIQ (public URL, no install for end users)

This deploys the **backend to Render** and the **frontend to Vercel**, both free tier.
Your database is already on Supabase. After this, anyone can open the app in a browser
via the Vercel URL — no cloning, no install.

```
 Browser ──▶ Vercel (React frontend) ──▶ Render (FastAPI backend) ──▶ Supabase (Postgres)
```

---

## Part 1 — Deploy the backend to Render

1. Go to <https://render.com> and sign up (use "Sign in with GitHub").
2. Click **New → Blueprint**.
3. Connect your GitHub and select the **FacilityIQ** repo.
4. Render detects `render.yaml` and proposes the `facilityiq-backend` service. Click **Apply**.
5. When prompted, set the three environment variables (copy them from your local
   `backend/.env`):
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_DB_URL`
6. Wait for the build to finish (~3–5 min). You'll get a URL like:
   `https://facilityiq-backend.onrender.com`
7. Verify it works: open `https://facilityiq-backend.onrender.com/api/health`
   — you should see `{"status":"ok","database":"connected"}`.

> **Free-tier note:** Render spins the backend down after ~15 min of inactivity.
> The first request after idle takes ~30–60s to wake up. Fine for demos.

---

## Part 2 — Deploy the frontend to Vercel

1. Go to <https://vercel.com> and sign up (use "Continue with GitHub").
2. Click **Add New → Project** and import the **FacilityIQ** repo.
3. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Create React App (auto-detected)
4. Expand **Environment Variables** and add:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** your Render backend URL from Part 1 (e.g. `https://facilityiq-backend.onrender.com`)
     — no trailing slash.
5. Click **Deploy**. After ~2 min you'll get a URL like `https://facility-iq.vercel.app`.

That URL is your shareable app link. 🎉

---

## Part 3 — Verify end to end

1. Open the Vercel URL.
2. Sign in, add a building/floor/area, upload a DXF and CSV.
3. If data doesn't load, open the browser console (F12). A CORS or network error
   usually means `REACT_APP_API_URL` is wrong or the Render backend is still waking up.

---

## Updating after code changes

Both platforms auto-deploy on every push to `main`:

```bash
git add -A
git commit -m "your change"
git push
```

Render rebuilds the backend and Vercel rebuilds the frontend automatically.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Frontend loads but no data | Check `REACT_APP_API_URL` in Vercel matches the Render URL exactly |
| `database: error` on `/api/health` | Re-check the three Supabase env vars in Render |
| First request very slow | Render free tier cold start — wait 30–60s |
| CORS error in console | Backend allows all origins by default; confirm the API URL has no typo |
