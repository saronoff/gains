# Gains 🏋️

A personal strength training PWA with progressive overload tracking, AI coaching, and cross-device sync via Supabase.

---

## Setup (about 20 minutes total)

### 1. Supabase (~10 min)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project** — name it `gains`, choose a region close to you, set a database password
3. Wait ~2 minutes for the project to provision
4. Go to **SQL Editor** → **New query**, paste the contents of `schema.sql`, click **Run**
5. Go to **Settings** → **API**
   - Copy the **Project URL** (looks like `https://xxxx.supabase.co`)
   - Copy the **anon / public** key (starts with `eyJ...`)

### 2. Deploy to Vercel (~5 min)

1. Push this repo to GitHub (or just drag the folder into a new repo)
2. Go to [vercel.com](https://vercel.com) and click **Add New Project**
3. Import your GitHub repo
4. **No build configuration needed** — Vercel will detect it's a static site
   - Set **Output Directory** to `public`
5. Click **Deploy**
6. Vercel gives you a URL like `https://gains-xxx.vercel.app`

### 3. Install as PWA

**iPhone:**
- Open your Vercel URL in Safari
- Tap the Share button → **Add to Home Screen**
- Tap Add — it appears as a standalone app

**Android:**
- Open in Chrome
- Tap the three-dot menu → **Add to Home Screen** (or Chrome will prompt you automatically)

**Desktop (Chrome/Edge):**
- Click the install icon in the address bar

### 4. First launch

- Open the app (from your home screen or the Vercel URL)
- Paste your Supabase Project URL and anon key into the config screen
- These are stored in `localStorage` on each device — you'll enter them once per device
- Your data syncs via Supabase across all devices automatically

---

## Updating the app

```bash
# Make your changes, then:
git add . && git commit -m "update" && git push
```

Vercel redeploys automatically on every push. Users get the new version on next refresh (the service worker handles cache invalidation).

---

## Icons

You need two PNG icons for the PWA to install cleanly:

- `public/icons/icon-192.png` — 192×192px
- `public/icons/icon-512.png` — 512×512px

Quick option: go to [PWABuilder.com](https://pwabuilder.com), enter your Vercel URL, and it'll generate all icon sizes for you. Or use any image editor — a simple dumbbell emoji on a dark background works great.

---

## Project structure

```
gains-app/
├── public/
│   ├── index.html      # App shell + styles
│   ├── app.js          # All application logic
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker (offline support)
│   └── icons/
│       ├── icon-192.png  (you provide)
│       └── icon-512.png  (you provide)
├── schema.sql          # Supabase table setup
├── vercel.json         # Vercel routing config
└── README.md
```

---

## AI Coach note

The AI coaching features call the Anthropic API directly from the browser using the artifact's built-in API access. If you're deploying this outside of Claude.ai, you'll need to either:

- Add your own Anthropic API key to a backend proxy (recommended for production)
- Or remove the AI coach tab and use only the local features

For a personal app used only by you, a simple Vercel Edge Function as a proxy works well and keeps your key server-side.

---

## Data privacy

- Workout data is stored in your own Supabase project — not shared with anyone
- Working weights and templates are stored as JSON in the `kv_store` table
- Supabase credentials are stored in `localStorage` on each device, never transmitted anywhere except to Supabase itself
- The app works offline (using locally cached data) when you have no internet connection
