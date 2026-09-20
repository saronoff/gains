# Gains — Strength Training PWA

## What this is
A personal strength training tracker and coach. Single-user PWA built with vanilla HTML/CSS/JS, deployed on Vercel, with Supabase as the backend. No framework, no build step — everything is plain files.

## Stack
- **Frontend**: Vanilla JS, HTML, CSS — single page app in `public/index.html` + `public/app.js` + `public/app.css`
- **Backend**: Supabase (Postgres + auto-generated REST API via PostgREST)
- **Deployment**: Vercel (static, output directory = `public/`)
- **PWA**: `public/manifest.json` + `public/sw.js` service worker
- **AI features**: Anthropic API called directly from the browser (injected by Claude.ai artifact context); requires proxy in standalone deployment

## File structure
```
gains-app/
├── public/
│   ├── index.html      # App shell, HTML structure
│   ├── app.css         # All styles
│   ├── app.js          # All application logic
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker
│   └── icons/          # PWA icons (user-provided)
├── schema.sql          # Supabase table definitions
├── vercel.json         # Routing config
└── CLAUDE.md           # This file
```

## Database schema (Supabase)
Three tables — see `schema.sql` for full DDL.

### `workouts`
One row per logged set.
| column | type |
|--------|------|
| id | text PK |
| date | date |
| exercise | text |
| muscle | text |
| weight | numeric |
| reps | integer |
| is_pr | boolean |
| created_at | timestamptz |

### `kv_store`
JSON blob storage.
| key | value |
|-----|-------|
| `templates` | JSON array of template objects |
| `working_weights` | JSON object keyed by exercise name |
| `exercises` | JSON array of {name, muscle} — the exercise registry |

### `days`
One row per calendar date.
| column | type | notes |
|--------|------|-------|
| id | text PK | |
| date | date UNIQUE | |
| exercises | jsonb | [{name, sets, reps, muscle}] |
| source | text | 'template' \| 'makeup' \| 'manual' |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## Core data model

### Exercise registry
Exercises are global entities with a fixed muscle group. Stored in `kv_store` key `exercises`:
```json
[{ "name": "Bench Press", "muscle": "Chest" }]
```
Muscle group is a locked attribute of the exercise — not editable per-session or per-template. When adding an exercise anywhere, the muscle group comes from the registry automatically.

### Templates
Stored in `kv_store` key `templates`:
```json
{
  "id": "t1",
  "name": "Pull",
  "days": ["Mon"],
  "exercises": [{ "name": "Barbell Row", "sets": 2, "reps": "8-12", "muscle": "Back" }]
}
```

### Days
Auto-created on first open of a new date from the matching template (if any). Freely editable without affecting the template. Source badge tracks origin.

### Working weights
```json
{ "Bench Press": { "weight": 135, "suggestedWeight": 140, "dismissed": false } }
```

### Session sets (in-memory)
```js
{ "Exercise Name": [result|null, result|null] }
```

## Business logic

### Progressive overload
- Trigger: logged reps >= top of rep range
- Increment: 2.5 lbs (upper isolation), 10 lbs (compounds/legs)
- Suggestion appears inline on the exercise card after all sets complete
- Accept updates working weight; dismiss clears for this session

### Joint-sensitive exercises
6 reps IS the target. Never flag as plateau. Rep range stored as `4-6`.
- Squat, Stiff-Leg Deadlift, Bench Press

### Missed day detection
- Check: was yesterday a template day with zero logged sets?
- If yes: show subtle missed-day bar with makeup planner link
- Only yesterday — don't look further back

### Makeup planner
- AI generates a structured JSON exercise list + explanation
- User can apply it to replace today's Day (source: 'makeup')
- Logged sets are never affected by day edits

## Current split
```
Mon — Pull:         Barbell Row, Lat Pulldown, Cable Row, Bicep Curl, Rear Delt Fly, Incline Curl
Tue — Legs A:       Leg Extension, Stiff-Leg Deadlift, Hip Thrust, Calf Raise, Leg Curl
Wed — Push + Pull:  Bench Press, Barbell Row, Lateral Raise (3), Hammer Curls, Tricep Pushdown (3)
Thu — Rest
Fri — Legs B:       Leg Extension, Squat, Calf Raise, Split Squat
Sat — Push:         Bench Press, Incline Press, Chest Fly, Lateral Raise (3), Overhead Tricep Extension (3)
Sun — Rest
```

## Increment table
| Muscle | Increment |
|--------|-----------|
| Chest, Shoulders, Biceps, Triceps, Core | 2.5 lbs |
| Back, Quads, Hamstrings, Glutes, Calves | 10 lbs |

## Design principles
- **Dark theme only** — CSS vars in `:root`, never hardcode colors
- **Mobile-first** — gym use on phone, large touch targets
- **No framework** — vanilla JS, no npm, no build step
- **Offline resilient** — all DB ops have localStorage fallback
- **Single file per concern** — JS in `app.js`, styles in `index.html`

## CSS variable reference
```css
--bg, --bg2, --bg3          /* backgrounds */
--border, --border2         /* borders */
--text, --text2, --text3    /* text hierarchy */
--info-bg/border/text       /* blue info */
--green-bg/border           /* green success */
--radius, --radius-sm       /* border radii */
--safe-top, --safe-bottom   /* iOS safe area */
```

## Supabase conventions
- `.maybeSingle()` not `.single()` when row may not exist
- RLS enabled, "allow all" anon policies
- `dbUpsert(table, row, conflict)` with localStorage fallback
- `dbGetKV(key)` / `dbSetKV(key, value)` for kv_store

## Known constraints
- Anthropic API calls require Claude.ai context or a proxy server in standalone deployment
- No auth — anon key in localStorage, acceptable for single-user app
- Icons not included — user provides `public/icons/icon-192.png` and `icon-512.png`
