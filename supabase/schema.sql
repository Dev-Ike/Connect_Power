-- =====================================================================
-- Connect Power database (Supabase / Postgres)
--
-- HOW TO RUN: Supabase dashboard > SQL Editor > New query > paste this
-- whole file > Run. It is safe to run again.
-- =====================================================================

-- ---------- Tables ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  first_name  text not null default '',
  last_name   text not null default '',
  email       text not null default '',
  phone       text not null default '',
  state       text not null default '',
  provider    text not null default 'password',
  consent_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.applications (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  completed   integer not null default 0 check (completed between 0 and 5),
  personal    jsonb,
  education   jsonb,
  programme   jsonb,
  review      jsonb,
  documents   jsonb not null default '{}'::jsonb,
  pay         jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Written only by the server (service role). Users cannot read or change it.
create table if not exists public.payments (
  reference    text primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  email        text not null,
  amount_kobo  integer not null check (amount_kobo > 0),
  status       text not null default 'pending',
  access_code  text,
  gateway_id   text,
  created_at   timestamptz not null default now(),
  checked_at   timestamptz,
  paid_at      timestamptz
);

-- Created only by the server after Paystack confirms a payment.
create table if not exists public.receipts (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  application_number  text not null unique,
  reference           text not null,
  amount_naira        numeric not null,
  currency            text not null default 'NGN',
  email               text,
  channel             text,
  paid_at             timestamptz not null default now()
);

-- Applications now have 5 steps before payment (was 4). Safe to run on an existing database.
alter table public.applications drop constraint if exists applications_completed_check;
alter table public.applications add  constraint applications_completed_check check (completed between 0 and 5);

create sequence if not exists public.application_seq;

-- ---------- Row level security ----------

alter table public.profiles     enable row level security;
alter table public.applications enable row level security;
alter table public.payments     enable row level security;
alter table public.receipts     enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "applications: read own"            on public.applications;
drop policy if exists "applications: update own if unpaid" on public.applications;
create policy "applications: read own" on public.applications
  for select to authenticated using (user_id = auth.uid());
-- Once a receipt exists the application is locked.
create policy "applications: update own if unpaid" on public.applications
  for update to authenticated
  using (
    user_id = auth.uid()
    and not exists (select 1 from public.receipts r where r.user_id = auth.uid())
  )
  with check (user_id = auth.uid());

drop policy if exists "receipts: read own" on public.receipts;
create policy "receipts: read own" on public.receipts
  for select to authenticated using (user_id = auth.uid());

-- payments: RLS on and no policy = nobody but the server can touch it.

-- ---------- Column-level permissions ----------

revoke all on public.profiles, public.applications, public.payments, public.receipts from anon;
revoke all on public.profiles, public.applications, public.payments, public.receipts from authenticated;

grant select on public.profiles to authenticated;
grant update (first_name, last_name, phone, state) on public.profiles to authenticated;

grant select on public.applications to authenticated;
grant update (completed, personal, education, programme, review, documents, pay)
  on public.applications to authenticated;

grant select on public.receipts to authenticated;

-- ---------- Triggers ----------

-- When someone signs up, create their profile and an empty application.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta      jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text  := coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), '');
  first_part text := split_part(full_name, ' ', 1);
begin
  insert into public.profiles (id, email, first_name, last_name, phone, state, provider, consent_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(meta ->> 'first_name', ''), first_part, ''),
    coalesce(nullif(meta ->> 'last_name', ''), trim(substr(full_name, length(first_part) + 1)), ''),
    coalesce(meta ->> 'phone', ''),
    coalesce(meta ->> 'state', ''),
    coalesce(new.raw_app_meta_data ->> 'provider', 'password'),
    case when (meta ->> 'consent') = 'true' then now() else null end
  )
  on conflict (id) do nothing;

  insert into public.applications (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest and stop the owner column being changed.
create or replace function public.applications_guard()
returns trigger
language plpgsql
as $$
begin
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists applications_guard on public.applications;
create trigger applications_guard
  before update on public.applications
  for each row execute function public.applications_guard();

-- ---------- Safe single-document updates (no lost updates) ----------

create or replace function public.set_document(p_key text, p_meta jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  if p_key not in ('nin', 'lg', 'pp', 'pro', 'bc', 'deg', 'wc') then
    raise exception 'invalid document key';
  end if;
  update public.applications
     set documents = jsonb_set(coalesce(documents, '{}'::jsonb), array[p_key], p_meta, true)
   where user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.remove_document(p_key text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare n integer;
begin
  update public.applications
     set documents = coalesce(documents, '{}'::jsonb) - p_key
   where user_id = auth.uid();
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke execute on function public.set_document(text, jsonb) from public, anon;
revoke execute on function public.remove_document(text)     from public, anon;
grant  execute on function public.set_document(text, jsonb) to authenticated;
grant  execute on function public.remove_document(text)     to authenticated;

-- ---------- Payment settlement (called only by the server) ----------
-- Runs as one locked step so a payment is counted exactly once, even if the
-- browser return page and Paystack's webhook arrive at the same moment.

create or replace function public.settle_payment(
  p_reference         text,
  p_status            text,
  p_amount_kobo       integer,
  p_currency          text,
  p_gateway_reference text,
  p_gateway_id        text,
  p_channel           text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
  n   bigint;
begin
  select * into pay from public.payments where reference = p_reference for update;
  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  if pay.status = 'success' then
    return jsonb_build_object('result', 'already');
  end if;

  if p_status is distinct from 'success' then
    update public.payments
       set status = coalesce(nullif(p_status, ''), 'failed'), checked_at = now()
     where reference = p_reference;
    return jsonb_build_object('result', 'not_successful', 'status', coalesce(nullif(p_status, ''), 'failed'));
  end if;

  if p_gateway_reference is distinct from p_reference
     or p_amount_kobo is distinct from pay.amount_kobo
     or p_currency is distinct from 'NGN' then
    update public.payments set status = 'mismatch', checked_at = now() where reference = p_reference;
    return jsonb_build_object('result', 'mismatch');
  end if;

  if exists (select 1 from public.receipts where user_id = pay.user_id) then
    update public.payments set status = 'success-duplicate', checked_at = now() where reference = p_reference;
    return jsonb_build_object('result', 'already');
  end if;

  n := nextval('public.application_seq');
  insert into public.receipts (user_id, application_number, reference, amount_naira, currency, email, channel)
  values (
    pay.user_id,
    'CP-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0'),
    p_reference,
    pay.amount_kobo / 100.0,
    'NGN',
    pay.email,
    p_channel
  );
  update public.payments
     set status = 'success', gateway_id = p_gateway_id, paid_at = now(), checked_at = now()
   where reference = p_reference;

  return jsonb_build_object('result', 'success');
end;
$$;

revoke execute on function public.settle_payment(text, text, integer, text, text, text, text) from public, anon, authenticated;
grant  execute on function public.settle_payment(text, text, integer, text, text, text, text) to service_role;

-- ---------- Private file storage for documents ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 5242880, array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg'];

-- Files live at  <user id>/<nin|lg|pp|pro|bc|deg|wc>.<pdf|png|jpg>
drop policy if exists "documents: read own"   on storage.objects;
drop policy if exists "documents: insert own" on storage.objects;
drop policy if exists "documents: update own" on storage.objects;
drop policy if exists "documents: delete own" on storage.objects;

create policy "documents: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "documents: insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/(nin|lg|pp|pro|bc|deg|wc)[.](pdf|png|jpg)$'
    and not exists (select 1 from public.receipts r where r.user_id = auth.uid())
  );

create policy "documents: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.receipts r where r.user_id = auth.uid())
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f-]{36}/(nin|lg|pp|pro|bc|deg|wc)[.](pdf|png|jpg)$'
  );

create policy "documents: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not exists (select 1 from public.receipts r where r.user_id = auth.uid())
  );
