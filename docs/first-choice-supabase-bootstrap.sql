-- First Choice Standard Schools Result Portal
-- Independent schema for the new Supabase project.
-- Run this once in the First Choice project's SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.app_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_context (
  id integer primary key default 1 check (id = 1),
  class_key text,
  academic_session text not null default '2026/2027',
  term text not null default '1st Term',
  term_status text not null default 'open' check (term_status in ('open', 'closed')),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  academic_session text not null default '2026/2027',
  name text not null,
  gender text not null,
  admno text,
  house text,
  age text,
  photo text,
  archived boolean not null default false,
  archived_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_key text not null,
  subject_index integer not null,
  term text not null,
  academic_session text not null,
  ca1 numeric,
  ca2 numeric,
  ca3 numeric,
  exam numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_index, term, academic_session)
);

create table if not exists public.traits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_key text not null,
  trait_type text not null,
  trait_name text not null,
  rating numeric,
  term text not null,
  academic_session text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, trait_type, trait_name, term, academic_session)
);

create table if not exists public.fees (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_key text not null,
  term text not null,
  academic_session text not null,
  total numeric not null default 0,
  paid numeric not null default 0,
  debt numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, term, academic_session)
);

create table if not exists public.remarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_key text not null,
  term text not null,
  academic_session text not null,
  academic text,
  form_master text,
  principal text,
  days_opened integer,
  days_present integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, term, academic_session)
);

create table if not exists public.published_subjects (
  id uuid primary key default gen_random_uuid(),
  class_key text not null,
  subject_index integer not null,
  term text not null,
  academic_session text not null,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_key, subject_index, term, academic_session)
);

create index if not exists students_class_idx on public.students(class_key, academic_session, archived);
create index if not exists scores_class_term_idx on public.scores(class_key, academic_session, term);
create index if not exists traits_student_term_idx on public.traits(student_id, academic_session, term);
create index if not exists fees_student_term_idx on public.fees(student_id, academic_session, term);
create index if not exists remarks_student_term_idx on public.remarks(student_id, academic_session, term);

alter table public.app_config enable row level security;
alter table public.academic_context enable row level security;
alter table public.students enable row level security;
alter table public.scores enable row level security;
alter table public.traits enable row level security;
alter table public.fees enable row level security;
alter table public.remarks enable row level security;
alter table public.published_subjects enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['app_config','academic_context','students','scores','traits','fees','remarks','published_subjects'] loop
    execute format('drop policy if exists "First Choice authenticated access" on public.%I', table_name);
    execute format('create policy "First Choice authenticated access" on public.%I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)', table_name);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

insert into public.app_config (id, config) values (1, jsonb_build_object(
  'school', jsonb_build_object(
    'name', 'FIRST CHOICE STANDARD SCHOOLS',
    'addr', 'Oke Odo Area, Ejigbo, Osun State, Nigeria',
    'phone', '07066845857 / 08052342535',
    'email', 'amb.adigun002@gmail.com'
  ),
  'session', '2026/2027',
  'term', '1st Term'
)) on conflict (id) do nothing;

insert into public.academic_context (id, academic_session, term, term_status)
values (1, '2026/2027', '1st Term', 'open')
on conflict (id) do nothing;
