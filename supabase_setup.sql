create table if not exists public.trip_planner_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.trip_planner_state enable row level security;

grant select, insert, update on public.trip_planner_state to anon;

drop policy if exists "allow anon read planner state" on public.trip_planner_state;
drop policy if exists "allow anon insert planner state" on public.trip_planner_state;
drop policy if exists "allow anon update planner state" on public.trip_planner_state;

create policy "allow anon read planner state"
on public.trip_planner_state
for select
to anon
using (id = 'main');

create policy "allow anon insert planner state"
on public.trip_planner_state
for insert
to anon
with check (id = 'main');

create policy "allow anon update planner state"
on public.trip_planner_state
for update
to anon
using (id = 'main')
with check (id = 'main');

insert into public.trip_planner_state (id, data, updated_at)
values ('main', '{}'::jsonb, now())
on conflict (id) do nothing;
