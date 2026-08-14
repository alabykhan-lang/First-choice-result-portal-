-- First Choice AI credit wallet (pilot provisioning)
-- Run in the First Choice Supabase project SQL editor.
-- The Gemini provider key is intentionally not stored in this schema.

create table if not exists public.school_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.school_accounts (name)
select 'First Choice Standard Schools'
where not exists (select 1 from public.school_accounts);

alter table public.staff_profiles add column if not exists school_id uuid;
update public.staff_profiles
set school_id = (select id from public.school_accounts order by created_at asc limit 1)
where school_id is null;
alter table public.staff_profiles alter column school_id set not null;
do $$ begin
  alter table public.staff_profiles add constraint staff_profiles_school_fk
    foreign key (school_id) references public.school_accounts(id);
exception when duplicate_object then null; end $$;

create table if not exists public.ai_wallets (
  school_id uuid primary key references public.school_accounts(id) on delete cascade,
  free_credits integer not null default 100,
  free_credits_used integer not null default 0,
  paid_credits integer not null default 0,
  paid_credits_used integer not null default 0,
  updated_at timestamptz not null default now(),
  check (free_credits >= 0 and free_credits_used >= 0 and paid_credits >= 0 and paid_credits_used >= 0)
);

insert into public.ai_wallets (school_id)
select id from public.school_accounts
where not exists (select 1 from public.ai_wallets w where w.school_id = public.school_accounts.id);

create table if not exists public.ai_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.school_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  operation text not null check (operation in ('ocr_scores','ocr_student_names')),
  model text not null,
  status text not null check (status in ('reserved','succeeded','failed','refunded')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  billable_tokens integer not null default 0,
  credits_reserved integer not null default 0,
  reserved_free integer not null default 0,
  reserved_paid integer not null default 0,
  credits_charged integer not null default 0,
  idempotency_key text not null,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (school_id, idempotency_key)
);

-- Existing installations may still have the old browser-held provider key in
-- app_config. Remove it before deploying the server-only provider path.
update public.app_config
set config = config - 'gemini_key'
where config ? 'gemini_key';

create index if not exists ai_usage_school_created_idx on public.ai_usage_ledger(school_id, created_at desc);

alter table public.school_accounts enable row level security;
alter table public.ai_wallets enable row level security;
alter table public.ai_usage_ledger enable row level security;

drop policy if exists "School members read own school" on public.school_accounts;
create policy "School members read own school" on public.school_accounts for select to authenticated
using (id = (select school_id from public.staff_profiles where id = (select auth.uid())));
drop policy if exists "School members read wallet" on public.ai_wallets;
create policy "School members read wallet" on public.ai_wallets for select to authenticated
using (school_id = (select school_id from public.staff_profiles where id = (select auth.uid())));
drop policy if exists "School members read usage" on public.ai_usage_ledger;
create policy "School members read usage" on public.ai_usage_ledger for select to authenticated
using (school_id = (select school_id from public.staff_profiles where id = (select auth.uid())));

grant select on public.school_accounts, public.ai_wallets, public.ai_usage_ledger to authenticated;

create or replace function public.ai_reserve_credits(
  p_operation text, p_model text, p_idempotency_key text, p_estimated_credits integer
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_user uuid := (select auth.uid()); v_school uuid; v_free integer; v_paid integer; v_total integer; v_id uuid;
begin
  if v_user is null then return jsonb_build_object('ok', false, 'code', 'RESULT_SESSION_REQUIRED'); end if;
  select school_id into v_school from staff_profiles where id = v_user and suspended = false;
  if v_school is null then return jsonb_build_object('ok', false, 'code', 'RESULT_PERMISSION_DENIED'); end if;
  select id into v_id from ai_usage_ledger where school_id = v_school and idempotency_key = p_idempotency_key;
  if v_id is not null then return jsonb_build_object('ok', true, 'ledger_id', v_id, 'replayed', true); end if;
  if p_estimated_credits < 1 or p_estimated_credits > 100 then return jsonb_build_object('ok', false, 'code', 'AI_REQUEST_LIMIT'); end if;
  select (free_credits-free_credits_used), (paid_credits-paid_credits_used)
    into v_free, v_paid from ai_wallets where school_id = v_school for update;
  v_total := coalesce(v_free,0) + coalesce(v_paid,0);
  if v_total < p_estimated_credits then return jsonb_build_object('ok', false, 'code', 'AI_CREDITS_EXHAUSTED', 'remaining_credits', v_total); end if;
  insert into ai_usage_ledger(school_id,user_id,operation,model,status,credits_reserved,reserved_free,reserved_paid,idempotency_key)
    values(v_school,v_user,p_operation,p_model,'reserved',p_estimated_credits,least(v_free,p_estimated_credits),greatest(0,p_estimated_credits-v_free),p_idempotency_key) returning id into v_id;
  update ai_wallets set free_credits_used=free_credits_used+least(v_free,p_estimated_credits), paid_credits_used=paid_credits_used+greatest(0,p_estimated_credits-v_free), updated_at=now() where school_id=v_school;
  return jsonb_build_object('ok', true, 'ledger_id', v_id, 'remaining_credits', v_total-p_estimated_credits);
end $$;
revoke all on function public.ai_reserve_credits(text,text,text,integer) from public;
grant execute on function public.ai_reserve_credits(text,text,text,integer) to authenticated;

create or replace function public.ai_settle_credits(
  p_ledger_id uuid, p_status text, p_input_tokens integer, p_output_tokens integer, p_billable_tokens integer, p_credits_charged integer, p_error_code text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := (select auth.uid()); v_school uuid; v_row ai_usage_ledger%rowtype; v_free integer; v_paid integer; v_charge integer; v_free_charge integer;
begin
  select school_id into v_school from staff_profiles where id = v_user and suspended = false;
  select * into v_row from ai_usage_ledger where id = p_ledger_id and school_id = v_school and user_id = v_user for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'AI_LEDGER_NOT_FOUND'); end if;
  if v_row.status <> 'reserved' then return jsonb_build_object('ok', true, 'replayed', true); end if;
  v_charge := greatest(0, least(v_row.credits_reserved, coalesce(p_credits_charged,0)));
  select free_credits-free_credits_used, paid_credits-paid_credits_used into v_free,v_paid from ai_wallets where school_id=v_school for update;
  -- Release the reservation first, then apply the actual charge. This makes
  -- failures free and refunds the unused part of an estimate.
  update ai_wallets set free_credits_used=greatest(0,free_credits_used-v_row.reserved_free), paid_credits_used=greatest(0,paid_credits_used-v_row.reserved_paid), updated_at=now() where school_id=v_school;
  if p_status = 'succeeded' then
    v_free_charge := least(v_free + v_row.reserved_free, v_charge);
    update ai_wallets set free_credits_used=free_credits_used+v_free_charge, paid_credits_used=paid_credits_used+(v_charge-v_free_charge), updated_at=now() where school_id=v_school;
  end if;
  update ai_usage_ledger set status=case when p_status='succeeded' then 'succeeded' else 'failed' end, input_tokens=greatest(0,p_input_tokens), output_tokens=greatest(0,p_output_tokens), billable_tokens=greatest(0,p_billable_tokens), credits_charged=case when p_status='succeeded' then v_charge else 0 end, error_code=p_error_code, completed_at=now() where id=p_ledger_id;
  return jsonb_build_object('ok', true, 'credits_charged', case when p_status='succeeded' then v_charge else 0 end);
end $$;
revoke all on function public.ai_settle_credits(uuid,text,integer,integer,integer,integer,text) from public;
grant execute on function public.ai_settle_credits(uuid,text,integer,integer,integer,integer,text) to authenticated;
