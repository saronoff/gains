-- ─── GAINS APP — SUPABASE SCHEMA ────────────────────────────────────────────
-- Run this in Supabase → SQL Editor → New query
-- Safe to re-run — all statements use IF NOT EXISTS

-- Workouts: one row per logged set
create table if not exists workouts (
  id          text primary key,
  date        date not null,
  exercise    text not null,
  muscle      text not null,
  weight      numeric not null,
  reps        integer not null,
  is_pr       boolean default false,
  created_at  timestamptz default now()
);

-- KV store: templates, working weights (JSON blobs)
create table if not exists kv_store (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- Days: one row per calendar date
-- exercises: JSONB array of {name, sets, reps, muscle}
-- source: 'template' | 'makeup' | 'manual'
create table if not exists days (
  id          text primary key,
  date        date unique not null,
  exercises   jsonb not null default '[]',
  source      text not null default 'manual',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Indexes
create index if not exists workouts_date_idx     on workouts(date desc);
create index if not exists workouts_exercise_idx on workouts(exercise);
create index if not exists days_date_idx         on days(date desc);

-- Row Level Security
alter table workouts enable row level security;
alter table kv_store enable row level security;
alter table days     enable row level security;

drop policy if exists "allow all" on workouts;
drop policy if exists "allow all" on kv_store;
drop policy if exists "allow all" on days;

create policy "allow all" on workouts for all using (true) with check (true);
create policy "allow all" on kv_store for all using (true) with check (true);
create policy "allow all" on days     for all using (true) with check (true);

grant all on workouts to anon;
grant all on kv_store to anon;
grant all on days     to anon;
