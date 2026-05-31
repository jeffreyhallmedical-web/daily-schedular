-- Daily Practice Planner — Supabase schema
-- Run this in Supabase SQL Editor once.

create extension if not exists "pgcrypto";

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  surname text not null,
  given_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  schedule_date date not null,
  am_location text,
  pm_location text,
  pm_manually_changed boolean not null default false,
  start_time time not null default '08:30',
  end_time time not null default '17:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_id, schedule_date),
  constraint schedule_entries_am_location_check check (
    am_location is null or am_location in ('SHIMO', 'NASU', 'WFH', 'OFF', 'B_TRIP', 'HOLIDAY', 'KAWASAKI')
  ),
  constraint schedule_entries_pm_location_check check (
    pm_location is null or pm_location in ('SHIMO', 'NASU', 'WFH', 'OFF', 'B_TRIP', 'HOLIDAY', 'KAWASAKI')
  )
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('planner', '{"summer_time_enabled": false}'::jsonb)
on conflict (key) do nothing;

-- RLS is enabled. The app uses the service role key only inside Netlify Functions.
-- No anon/public policies are created, so browser clients cannot directly read/write these tables.
alter table public.people enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.app_settings enable row level security;

create index if not exists idx_people_active_sort
on public.people (active, lower(surname), lower(given_name));

create index if not exists idx_schedule_entries_date
on public.schedule_entries (schedule_date);

create index if not exists idx_schedule_entries_person_date
on public.schedule_entries (person_id, schedule_date);
