create extension if not exists pgcrypto;

create table if not exists public.dog_feedings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fed_at timestamptz not null,
  amount_g integer not null check (amount_g > 0),
  fed_by text,
  note text,
  slot_time text not null check (slot_time in ('08:00', '12:00', '16:00', '20:00'))
);

alter table public.dog_feedings enable row level security;

drop policy if exists "anon_read_feedings" on public.dog_feedings;
create policy "anon_read_feedings"
on public.dog_feedings
for select
to anon
using (true);

drop policy if exists "anon_insert_feedings" on public.dog_feedings;
create policy "anon_insert_feedings"
on public.dog_feedings
for insert
to anon
with check (true);

drop policy if exists "anon_delete_feedings" on public.dog_feedings;
create policy "anon_delete_feedings"
on public.dog_feedings
for delete
to anon
using (true);

create table if not exists public.family_diary_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_date date not null,
  author text,
  text text not null
);

alter table public.family_diary_entries enable row level security;

drop policy if exists "anon_read_diary" on public.family_diary_entries;
create policy "anon_read_diary"
on public.family_diary_entries
for select
to anon
using (true);

drop policy if exists "anon_insert_diary" on public.family_diary_entries;
create policy "anon_insert_diary"
on public.family_diary_entries
for insert
to anon
with check (true);

drop policy if exists "anon_delete_diary" on public.family_diary_entries;
create policy "anon_delete_diary"
on public.family_diary_entries
for delete
to anon
using (true);

create table if not exists public.dog_toilet_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_at timestamptz not null,
  kind text not null check (kind in ('SHIT', 'PISS'))
);

alter table public.dog_toilet_events enable row level security;

drop policy if exists "anon_read_toilet" on public.dog_toilet_events;
create policy "anon_read_toilet"
on public.dog_toilet_events
for select
to anon
using (true);

drop policy if exists "anon_insert_toilet" on public.dog_toilet_events;
create policy "anon_insert_toilet"
on public.dog_toilet_events
for insert
to anon
with check (true);

drop policy if exists "anon_delete_toilet" on public.dog_toilet_events;
create policy "anon_delete_toilet"
on public.dog_toilet_events
for delete
to anon
using (true);
