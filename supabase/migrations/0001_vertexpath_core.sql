-- VertexPath core schema (idempotent: safe to run more than once)
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- Matches the tables the existing app code already uses (profiles, courses,
-- roadmap_entries, user_courses) plus the new Resume Building tables.

-- ---------------------------------------------------------------------------
-- 0. Shared helper: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 1. EXISTING tables (recreated because the old project is likely gone)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  avatar_url         text,
  current_status     text,
  education_level    text,
  education_detail   text,
  college_or_company text,
  gender             text,
  dob                date,
  target_job         text,
  experience_years   text,
  industry           text,
  skills             text,          -- comma-separated, as ProfileForm.tsx writes it
  location           text,
  availability       text,
  salary_expectation text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- Columns the app ALREADY sends or now needs. ProfileForm.tsx upserts `bio`
-- but the old generated types had no such column -> saving the profile fails.
alter table public.profiles add column if not exists bio          text;
alter table public.profiles add column if not exists phone        text;
alter table public.profiles add column if not exists linkedin_url text;
alter table public.profiles add column if not exists github_url   text;
alter table public.profiles add column if not exists portfolio_url text;

create table if not exists public.courses (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  platform       text,
  url            text,
  difficulty     text,
  duration_hours numeric,
  is_free        boolean default false,
  skill_tags     text[]
);

create table if not exists public.roadmap_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  title        text,
  description  text,
  skill_tag    text,
  status       text,
  start_date   date,
  end_date     date,
  evidence_url text,
  created_at   timestamptz default now()
);

create table if not exists public.user_courses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.profiles(id) on delete cascade,
  course_id    uuid references public.courses(id) on delete cascade,
  status       text,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- 2. NEW tables: career assets, review queue, sources, resumes
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  description  text,
  technologies text[] not null default '{}',
  project_url  text,
  start_date   date,
  end_date     date,
  source_type  text not null default 'manual'
               check (source_type in ('manual','github','linkedin_export','profile_pdf','resume')),
  source_ref   text,                -- stable id, e.g. GitHub repo full_name; used for dedupe
  source_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists projects_user_source_uniq
  on public.projects (user_id, source_type, source_ref) where source_ref is not null;
create index if not exists projects_user_idx on public.projects (user_id);

create table if not exists public.certifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null,
  issuer              text,
  issue_date          date,
  expiry_date         date,
  credential_url      text,
  skills              text[] not null default '{}',
  source_type         text not null default 'manual'
                      check (source_type in ('manual','linkedin_export','profile_pdf','resume')),
  source_ref          text,
  -- 'unverified' by default. Only set 'verified' if a real check was done.
  verification_status text not null default 'unverified'
                      check (verification_status in ('unverified','verified')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists certs_user_source_uniq
  on public.certifications (user_id, source_type, source_ref) where source_ref is not null;
create index if not exists certs_user_idx on public.certifications (user_id);

-- Review queue: everything imported (CSV, PDF, GitHub sync) lands here first.
-- Nothing reaches `projects`/`certifications` until the user approves it.
create table if not exists public.import_candidates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('project','certification')),
  source     text not null check (source in ('github','linkedin_export','profile_pdf','resume')),
  source_ref text,
  payload    jsonb not null,        -- fields matching the target table
  status     text not null default 'pending'
             check (status in ('pending','approved','dismissed')),
  created_at timestamptz not null default now()
);
create unique index if not exists import_candidates_dedupe
  on public.import_candidates (user_id, kind, source, source_ref) where source_ref is not null;
create index if not exists import_candidates_user_idx
  on public.import_candidates (user_id, status);

-- Connected handles for syncable sources (GitHub only; LinkedIn is NOT scraped).
create table if not exists public.career_sources (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  source_type    text not null check (source_type in ('github')),
  handle         text not null,
  last_synced_at timestamptz,
  last_status    text,
  created_at     timestamptz not null default now(),
  unique (user_id, source_type)
);

-- One row per saved resume version. `content` is a JSON snapshot:
-- { sections:[{type,itemId,title,bullets[],...}], summary, skills[], order[] }
-- Snapshot (not live join) so editing a resume never mutates the original asset.
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  target_role     text,
  job_description text,
  content         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes (user_id);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['profiles','projects','certifications','resumes'] loop
    execute format('drop trigger if exists trg_%1$s_updated on public.%1$s', t);
    execute format('create trigger trg_%1$s_updated before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Row Level Security: each user sees only their own rows
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.certifications    enable row level security;
alter table public.import_candidates enable row level security;
alter table public.career_sources    enable row level security;
alter table public.resumes           enable row level security;
alter table public.roadmap_entries   enable row level security;
alter table public.user_courses      enable row level security;
alter table public.courses           enable row level security;

-- profiles (key is `id`)
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- tables keyed by user_id: one full-access-to-own-rows policy each
do $$
declare t text;
begin
  foreach t in array array['projects','certifications','import_candidates',
                           'career_sources','resumes','roadmap_entries','user_courses'] loop
    execute format('drop policy if exists "%1$s_own" on public.%1$s', t);
    execute format('create policy "%1$s_own" on public.%1$s for all
                    using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- courses = shared catalogue: any signed-in user may read, nobody writes from the client
drop policy if exists "courses_read_authenticated" on public.courses;
create policy "courses_read_authenticated" on public.courses
  for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 4. Storage: `avatars` bucket (ProfileForm uploads to "<user_id>/<timestamp>.<ext>")
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_insert_own"    on storage.objects;
drop policy if exists "avatars_update_own"    on storage.objects;
drop policy if exists "avatars_delete_own"    on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
