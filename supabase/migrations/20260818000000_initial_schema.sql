-- Job CRM initial schema.
-- All application data is tenant-owned and protected by Row Level Security.

create schema if not exists private;
create schema if not exists extensions;
revoke all on schema private from public, anon, authenticated;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.pipeline_stage_category as enum (
  'saved',
  'applied',
  'screening',
  'assessment',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
  'ghosted',
  'closed'
);

create type public.work_mode as enum (
  'remote',
  'hybrid',
  'onsite',
  'unknown'
);

create type public.employment_type as enum (
  'full-time',
  'part-time',
  'contract',
  'internship',
  'temporary',
  'unknown'
);

create type public.salary_period as enum (
  'hour',
  'day',
  'month',
  'year'
);

create type public.application_event_type as enum (
  'recruiter_call',
  'screening',
  'technical_interview',
  'behavioral_interview',
  'system_design',
  'technical_assessment',
  'final_interview',
  'follow_up',
  'other'
);

create type public.ai_operation as enum (
  'job_extraction',
  'resume_comparison',
  'interview_prep_jd',
  'interview_prep_jd_resume'
);

create type public.ai_run_status as enum (
  'pending',
  'succeeded',
  'failed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  no_response_days integer not null default 21,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length_check
    check (display_name is null or char_length(display_name) <= 100),
  constraint profiles_timezone_check
    check (char_length(btrim(timezone)) between 1 and 100),
  constraint profiles_no_response_days_check
    check (no_response_days between 1 and 365)
);

create table public.application_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_sources_id_user_id_key unique (id, user_id),
  constraint application_sources_name_check
    check (char_length(btrim(name)) between 1 and 80)
);

create unique index application_sources_user_name_key
  on public.application_sources (user_id, lower(btrim(name)));

create table public.application_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_channels_id_user_id_key unique (id, user_id),
  constraint application_channels_name_check
    check (char_length(btrim(name)) between 1 and 80)
);

create unique index application_channels_user_name_key
  on public.application_channels (user_id, lower(btrim(name)));

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null,
  category public.pipeline_stage_category not null,
  sort_order integer not null,
  is_terminal boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pipeline_stages_id_user_id_key unique (id, user_id),
  constraint pipeline_stages_name_check
    check (char_length(btrim(name)) between 1 and 80),
  constraint pipeline_stages_sort_order_check check (sort_order >= 0)
);

create unique index pipeline_stages_user_name_key
  on public.pipeline_stages (user_id, lower(btrim(name)));
create index pipeline_stages_user_sort_order_idx
  on public.pipeline_stages (user_id, sort_order);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null,
  website text,
  industry text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_id_user_id_key unique (id, user_id),
  constraint companies_name_check
    check (char_length(btrim(name)) between 1 and 200)
);

create unique index companies_user_name_key
  on public.companies (user_id, lower(btrim(name)));
create index companies_name_trgm_idx
  on public.companies using gin (name extensions.gin_trgm_ops);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  name text not null,
  original_filename text not null,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  file_hash text,
  extracted_text text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_id_user_id_key unique (id, user_id),
  constraint resumes_user_storage_path_key unique (user_id, storage_path),
  constraint resumes_name_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint resumes_original_filename_check
    check (char_length(btrim(original_filename)) between 1 and 255),
  constraint resumes_storage_owner_path_check
    check (storage_path like user_id::text || '/%'),
  constraint resumes_mime_type_check
    check (mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    )),
  constraint resumes_file_size_check
    check (file_size_bytes between 1 and 5242880),
  constraint resumes_file_hash_check
    check (file_hash is null or file_hash ~ '^[a-fA-F0-9]{64}$'),
  constraint resumes_extracted_text_check
    check (extracted_text is null or char_length(extracted_text) <= 100000)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  company_id uuid not null,
  job_title text not null,
  job_url text,
  discovery_source_id uuid not null,
  application_channel_id uuid not null,
  location text,
  work_mode public.work_mode,
  employment_type public.employment_type,
  seniority text,
  salary_min numeric(14, 2),
  salary_max numeric(14, 2),
  salary_currency text,
  salary_period public.salary_period,
  applied_at timestamptz,
  current_stage_id uuid not null,
  submitted_resume_id uuid,
  raw_job_description text not null default '',
  ai_summary text,
  ai_extracted_data jsonb,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_id_user_id_key unique (id, user_id),
  constraint applications_company_owner_fkey
    foreign key (company_id, user_id)
    references public.companies (id, user_id),
  constraint applications_discovery_source_owner_fkey
    foreign key (discovery_source_id, user_id)
    references public.application_sources (id, user_id),
  constraint applications_channel_owner_fkey
    foreign key (application_channel_id, user_id)
    references public.application_channels (id, user_id),
  constraint applications_current_stage_owner_fkey
    foreign key (current_stage_id, user_id)
    references public.pipeline_stages (id, user_id),
  constraint applications_submitted_resume_owner_fkey
    foreign key (submitted_resume_id, user_id)
    references public.resumes (id, user_id),
  constraint applications_job_title_check
    check (char_length(btrim(job_title)) between 1 and 240),
  constraint applications_salary_min_check
    check (salary_min is null or salary_min >= 0),
  constraint applications_salary_max_check
    check (salary_max is null or salary_max >= 0),
  constraint applications_salary_range_check
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
  constraint applications_salary_currency_check
    check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$'),
  constraint applications_ai_extracted_data_check
    check (
      ai_extracted_data is null
      or jsonb_typeof(ai_extracted_data) = 'object'
    )
);

create index applications_user_archived_applied_idx
  on public.applications (user_id, archived_at, applied_at desc);
create index applications_user_current_stage_idx
  on public.applications (user_id, current_stage_id)
  where archived_at is null;
create index applications_user_company_idx
  on public.applications (user_id, company_id);
create index applications_user_updated_idx
  on public.applications (user_id, archived_at, updated_at desc);
create index applications_user_source_idx
  on public.applications (user_id, discovery_source_id);
create index applications_user_channel_idx
  on public.applications (user_id, application_channel_id);
create index applications_user_resume_idx
  on public.applications (user_id, submitted_resume_id)
  where submitted_resume_id is not null;
create index applications_job_title_trgm_idx
  on public.applications using gin (job_title extensions.gin_trgm_ops);
create index applications_notes_trgm_idx
  on public.applications using gin (notes extensions.gin_trgm_ops);

create table public.application_stage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  application_id uuid not null,
  from_stage_id uuid,
  to_stage_id uuid not null,
  occurred_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default clock_timestamp(),
  constraint application_stage_events_id_user_id_key unique (id, user_id),
  constraint application_stage_events_application_owner_fkey
    foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  constraint application_stage_events_from_stage_owner_fkey
    foreign key (from_stage_id, user_id)
    references public.pipeline_stages (id, user_id),
  constraint application_stage_events_to_stage_owner_fkey
    foreign key (to_stage_id, user_id)
    references public.pipeline_stages (id, user_id),
  constraint application_stage_events_distinct_stage_check
    check (from_stage_id is null or from_stage_id <> to_stage_id)
);

create unique index application_stage_events_one_initial_idx
  on public.application_stage_events (application_id)
  where from_stage_id is null;
create index application_stage_events_application_occurred_idx
  on public.application_stage_events (user_id, application_id, occurred_at, created_at);
create index application_stage_events_to_stage_idx
  on public.application_stage_events (user_id, to_stage_id, occurred_at);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  company_id uuid not null,
  application_id uuid,
  name text not null,
  role text,
  email text,
  phone text,
  linkedin_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_id_user_id_key unique (id, user_id),
  constraint contacts_company_owner_fkey
    foreign key (company_id, user_id)
    references public.companies (id, user_id) on delete cascade,
  constraint contacts_application_owner_fkey
    foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  constraint contacts_name_check
    check (char_length(btrim(name)) between 1 and 160)
);

create index contacts_user_company_idx
  on public.contacts (user_id, company_id);
create index contacts_user_application_idx
  on public.contacts (user_id, application_id)
  where application_id is not null;

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  application_id uuid not null,
  type public.application_event_type not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  meeting_url text,
  location text,
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_events_id_user_id_key unique (id, user_id),
  constraint application_events_application_owner_fkey
    foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  constraint application_events_title_check
    check (char_length(btrim(title)) between 1 and 240),
  constraint application_events_time_range_check
    check (ends_at is null or ends_at >= starts_at)
);

create index application_events_user_upcoming_idx
  on public.application_events (user_id, starts_at)
  where completed_at is null;
create index application_events_application_idx
  on public.application_events (user_id, application_id, starts_at);

create table public.application_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  application_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_notes_id_user_id_key unique (id, user_id),
  constraint application_notes_application_owner_fkey
    foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  constraint application_notes_body_check check (char_length(btrim(body)) > 0)
);

create index application_notes_application_created_idx
  on public.application_notes (user_id, application_id, created_at desc);
create index application_notes_body_trgm_idx
  on public.application_notes using gin (body extensions.gin_trgm_ops);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  application_id uuid,
  operation public.ai_operation not null,
  provider text not null,
  model text not null,
  input_hash text not null,
  prompt_version text not null,
  input_tokens integer,
  output_tokens integer,
  status public.ai_run_status not null default 'pending',
  error_message text,
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint ai_runs_id_user_id_key unique (id, user_id),
  constraint ai_runs_application_owner_fkey
    foreign key (application_id, user_id)
    references public.applications (id, user_id) on delete cascade,
  constraint ai_runs_provider_check
    check (char_length(btrim(provider)) between 1 and 80),
  constraint ai_runs_model_check
    check (char_length(btrim(model)) between 1 and 160),
  constraint ai_runs_input_hash_check
    check (input_hash ~ '^[a-fA-F0-9]{64}$'),
  constraint ai_runs_prompt_version_check
    check (char_length(btrim(prompt_version)) between 1 and 120),
  constraint ai_runs_input_tokens_check
    check (input_tokens is null or input_tokens >= 0),
  constraint ai_runs_output_tokens_check
    check (output_tokens is null or output_tokens >= 0),
  constraint ai_runs_error_message_check
    check (error_message is null or char_length(error_message) <= 2000),
  constraint ai_runs_result_check
    check (result is null or jsonb_typeof(result) = 'object'),
  constraint ai_runs_completion_check
    check (
      (status = 'pending' and completed_at is null)
      or (status <> 'pending' and completed_at is not null)
    ),
  constraint ai_runs_success_result_check
    check (status <> 'succeeded' or result is not null),
  constraint ai_runs_failure_error_check
    check (status <> 'failed' or nullif(btrim(error_message), '') is not null)
);

create index ai_runs_cache_lookup_idx
  on public.ai_runs (
    user_id,
    operation,
    input_hash,
    prompt_version,
    provider,
    model,
    created_at desc
  )
  where status = 'succeeded';
create index ai_runs_application_created_idx
  on public.ai_runs (user_id, application_id, created_at desc)
  where application_id is not null;
create index ai_runs_pending_created_idx
  on public.ai_runs (created_at)
  where status = 'pending';
create index ai_runs_created_idx
  on public.ai_runs (created_at);
create index ai_runs_user_created_idx
  on public.ai_runs (user_id, created_at);
create unique index ai_runs_one_pending_input_idx
  on public.ai_runs (
    user_id,
    (coalesce(application_id::text, '')),
    operation,
    provider,
    model,
    input_hash,
    prompt_version
  )
  where status = 'pending';

-- These owner-only settings make the safety ceilings explicit and testable
-- without exposing them through the API. They are deliberately conservative
-- defaults for a personal CRM using one server-side provider account.
create table private.ai_quota_config (
  singleton boolean primary key default true check (singleton),
  per_user_window_limit integer not null check (per_user_window_limit > 0),
  window_seconds integer not null check (window_seconds between 1 and 86400),
  per_user_daily_limit integer not null check (per_user_daily_limit > 0),
  per_user_concurrent_limit integer not null
    check (per_user_concurrent_limit > 0),
  global_daily_limit integer not null check (global_daily_limit > 0),
  stale_pending_seconds integer not null
    check (stale_pending_seconds between 60 and 3600),
  server_capability_hash bytea
);

insert into private.ai_quota_config (
  singleton,
  per_user_window_limit,
  window_seconds,
  per_user_daily_limit,
  per_user_concurrent_limit,
  global_daily_limit,
  stale_pending_seconds
) values (true, 6, 600, 30, 2, 300, 300);

-- Run this once from the Supabase SQL editor after choosing a random secret of
-- at least 32 characters. Only the SHA-256 digest is retained. The function is
-- intentionally unavailable to API roles; rerun it during a coordinated secret
-- rotation, then update the server environment to the same value.
create function private.configure_ai_rpc_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_secret is null
    or char_length(p_secret) < 32
    or char_length(p_secret) > 1024
  then
    raise exception using
      errcode = '23514',
      message = 'AI RPC secret must contain between 32 and 1024 characters.';
  end if;

  update private.ai_quota_config
  set server_capability_hash = extensions.digest(p_secret, 'sha256')
  where singleton;
end;
$$;

revoke all on function private.configure_ai_rpc_secret(text)
  from public, anon, authenticated;

create table private.resume_storage_quota_config (
  singleton boolean primary key default true check (singleton),
  max_objects_per_user integer not null check (max_objects_per_user > 0),
  max_bytes_per_user bigint not null check (max_bytes_per_user > 0),
  max_object_bytes bigint not null check (max_object_bytes > 0),
  upload_intent_ttl_seconds integer not null
    check (upload_intent_ttl_seconds between 60 and 3600),
  cancel_release_grace_seconds integer not null
    check (cancel_release_grace_seconds between 3600 and 604800),
  constraint resume_storage_quota_capacity_check
    check (max_bytes_per_user >= max_object_bytes)
);

insert into private.resume_storage_quota_config (
  singleton,
  max_objects_per_user,
  max_bytes_per_user,
  max_object_bytes,
  upload_intent_ttl_seconds,
  cancel_release_grace_seconds
) values (true, 50, 262144000, 5242880, 900, 86400);

create table private.resume_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null,
  storage_path text not null,
  expected_bytes bigint not null check (expected_bytes > 0),
  expected_mime_type text not null,
  expires_at timestamptz not null,
  cancel_requested_at timestamptz,
  release_after timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  constraint resume_upload_intents_user_resume_key unique (user_id, resume_id),
  constraint resume_upload_intents_storage_path_key unique (storage_path),
  constraint resume_upload_intents_owner_path_check
    check (storage_path like user_id::text || '/' || resume_id::text || '/%'),
  constraint resume_upload_intents_mime_type_check
    check (expected_mime_type in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    )),
  constraint resume_upload_intents_cancellation_check
    check (
      (cancel_requested_at is null and release_after is null)
      or (
        cancel_requested_at is not null
        and release_after is not null
        and release_after >= cancel_requested_at
      )
    )
);

create index resume_upload_intents_user_expiry_idx
  on private.resume_upload_intents (user_id, expires_at);
create index resume_upload_intents_cancel_release_idx
  on private.resume_upload_intents (user_id, release_after)
  where cancel_requested_at is not null;

revoke all on table
  private.ai_quota_config,
  private.resume_storage_quota_config,
  private.resume_upload_intents
from public, anon, authenticated;

-- Keep updated_at trustworthy without requiring every caller to remember it.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger application_sources_set_updated_at
  before update on public.application_sources
  for each row execute function private.set_updated_at();
create trigger application_channels_set_updated_at
  before update on public.application_channels
  for each row execute function private.set_updated_at();
create trigger pipeline_stages_set_updated_at
  before update on public.pipeline_stages
  for each row execute function private.set_updated_at();
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function private.set_updated_at();
create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute function private.set_updated_at();
create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function private.set_updated_at();
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function private.set_updated_at();
create trigger application_events_set_updated_at
  before update on public.application_events
  for each row execute function private.set_updated_at();
create trigger application_notes_set_updated_at
  before update on public.application_notes
  for each row execute function private.set_updated_at();

-- Changing the normalized category after a stage appears in history would
-- silently rewrite analytics. Referenced stages may still be renamed, ordered,
-- or deactivated, but their category is stable.
create function private.prevent_referenced_stage_category_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.category is distinct from old.category and (
    exists (
      select 1
      from public.applications as application
      where application.user_id = old.user_id
        and application.current_stage_id = old.id
    )
    or exists (
      select 1
      from public.application_stage_events as stage_event
      where stage_event.user_id = old.user_id
        and (
          stage_event.from_stage_id = old.id
          or stage_event.to_stage_id = old.id
        )
      )
  ) then
    raise exception using
      errcode = '55000',
      message = 'A stage category cannot change after the stage appears in application history.';
  end if;

  return new;
end;
$$;

create trigger pipeline_stages_prevent_referenced_category_change
  before update of category on public.pipeline_stages
  for each row execute function private.prevent_referenced_stage_category_change();

-- A resume row represents an immutable uploaded file version. Users may rename,
-- archive, or populate extracted_text; replacing the file requires a new row.
create function private.prevent_resume_file_replacement()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.storage_path is distinct from old.storage_path
    or new.original_filename is distinct from old.original_filename
    or new.mime_type is distinct from old.mime_type
    or new.file_size_bytes is distinct from old.file_size_bytes
    or (old.file_hash is not null and new.file_hash is distinct from old.file_hash)
  then
    raise exception using
      errcode = '55000',
      message = 'Resume file identity is immutable; upload a new resume version instead.';
  end if;

  return new;
end;
$$;

create trigger resumes_prevent_file_replacement
  before update on public.resumes
  for each row execute function private.prevent_resume_file_replacement();

-- Contacts attached to an application must name that application's company.
create function private.validate_contact_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.application_id is not null and not exists (
    select 1
    from public.applications as application
    where application.id = new.application_id
      and application.user_id = new.user_id
      and application.company_id = new.company_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Contact company must match the selected application company.';
  end if;

  return new;
end;
$$;

create trigger contacts_validate_company
  before insert or update of application_id, company_id, user_id
  on public.contacts
  for each row execute function private.validate_contact_company();

-- Changing an application's company while application-scoped contacts exist
-- would leave those contacts attached to the wrong company. Require callers to
-- reassign or remove the contacts explicitly first.
create function private.prevent_application_company_contact_mismatch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.company_id is distinct from old.company_id and exists (
    select 1
    from public.contacts as contact
    where contact.application_id = old.id
      and contact.user_id = old.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Reassign or remove application contacts before changing the company.';
  end if;

  return new;
end;
$$;

create trigger applications_prevent_company_contact_mismatch
  before update of company_id on public.applications
  for each row execute function private.prevent_application_company_contact_mismatch();

-- New applications start at Saved or Applied. This makes the first event
-- unambiguous; historical applications can then be advanced with the RPC.
create function private.validate_initial_application_stage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  stage_category public.pipeline_stage_category;
  stage_is_active boolean;
begin
  select stage.category, stage.is_active
    into stage_category, stage_is_active
  from public.pipeline_stages as stage
  where stage.id = new.current_stage_id
    and stage.user_id = new.user_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Initial stage does not belong to the application owner.';
  end if;

  if not stage_is_active then
    raise exception using
      errcode = '23514',
      message = 'Initial stage must be active.';
  end if;

  if stage_category not in ('saved', 'applied') then
    raise exception using
      errcode = '23514',
      message = 'A new application must start in Saved or Applied.';
  end if;

  if stage_category = 'applied' and new.applied_at is null then
    raise exception using
      errcode = '23514',
      message = 'Applied applications require an applied_at timestamp.';
  end if;

  if new.applied_at > now() + interval '5 minutes' then
    raise exception using
      errcode = '22007',
      message = 'The application date cannot be materially in the future.';
  end if;

  if stage_category = 'saved' and new.applied_at is not null then
    raise exception using
      errcode = '23514',
      message = 'Saved applications cannot have an applied_at timestamp yet.';
  end if;

  return new;
end;
$$;

create trigger applications_validate_initial_stage
  before insert on public.applications
  for each row execute function private.validate_initial_application_stage();

create function private.create_initial_application_stage_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.application_stage_events (
    user_id,
    application_id,
    from_stage_id,
    to_stage_id,
    occurred_at
  ) values (
    new.user_id,
    new.id,
    null,
    new.current_stage_id,
    coalesce(new.applied_at, new.created_at)
  );

  return new;
end;
$$;

create trigger applications_create_initial_stage_event
  after insert on public.applications
  for each row execute function private.create_initial_application_stage_event();

-- Direct current_stage_id updates remain safe: the database records history.
-- The public RPC additionally supplies an accurate occurred_at and notes.
create function private.prepare_application_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_category public.pipeline_stage_category;
  target_is_active boolean;
  configured_occurred_at text;
  effective_occurred_at timestamptz;
  latest_event_at timestamptz;
  has_applied_event boolean;
begin
  if new.current_stage_id is not distinct from old.current_stage_id then
    return new;
  end if;

  select stage.category, stage.is_active
    into target_category, target_is_active
  from public.pipeline_stages as stage
  where stage.id = new.current_stage_id
    and stage.user_id = new.user_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Target stage does not belong to the application owner.';
  end if;

  if not target_is_active then
    raise exception using
      errcode = '23514',
      message = 'Cannot move an application into an inactive stage.';
  end if;

  configured_occurred_at := current_setting(
    'job_crm.stage_occurred_at',
    true
  );
  effective_occurred_at := coalesce(
    nullif(configured_occurred_at, '')::timestamptz,
    now()
  );

  select
    max(stage_event.occurred_at),
    coalesce(
      bool_or(stage.category = 'applied'),
      false
    )
    into latest_event_at, has_applied_event
  from public.application_stage_events as stage_event
  join public.pipeline_stages as stage
    on stage.id = stage_event.to_stage_id
    and stage.user_id = stage_event.user_id
  where stage_event.application_id = old.id
    and stage_event.user_id = old.user_id;

  -- A direct update may provide applied_at without using the RPC. Use it as the
  -- transition time so the application date and Applied event stay identical.
  if target_category = 'applied'
    and not has_applied_event
    and nullif(configured_occurred_at, '') is null
    and new.applied_at is not null
  then
    effective_occurred_at := new.applied_at;
    perform set_config(
      'job_crm.stage_occurred_at',
      effective_occurred_at::text,
      true
    );
  end if;

  if effective_occurred_at < latest_event_at then
    raise exception using
      errcode = '22007',
      message = 'A stage transition cannot occur before the latest history event.';
  end if;

  if effective_occurred_at > now() + interval '5 minutes' then
    raise exception using
      errcode = '22007',
      message = 'A stage transition cannot be recorded materially in the future.';
  end if;

  if not has_applied_event and target_category in (
    'screening',
    'assessment',
    'interview',
    'offer',
    'accepted',
    'rejected',
    'ghosted'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Move the record to Applied before advancing to this stage.';
  end if;

  if target_category = 'applied' and new.applied_at is null then
    new.applied_at := effective_occurred_at;
  end if;

  return new;
end;
$$;

create trigger applications_prepare_stage_change
  before update of current_stage_id on public.applications
  for each row execute function private.prepare_application_stage_change();

create function private.record_application_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_occurred_at text;
  configured_notes text;
begin
  if new.current_stage_id is not distinct from old.current_stage_id then
    return new;
  end if;

  configured_occurred_at := current_setting(
    'job_crm.stage_occurred_at',
    true
  );
  configured_notes := current_setting('job_crm.stage_notes', true);

  insert into public.application_stage_events (
    user_id,
    application_id,
    from_stage_id,
    to_stage_id,
    occurred_at,
    notes
  ) values (
    new.user_id,
    new.id,
    old.current_stage_id,
    new.current_stage_id,
    coalesce(nullif(configured_occurred_at, '')::timestamptz, now()),
    nullif(configured_notes, '')
  );

  -- Avoid leaking transition metadata into another update in the same DB
  -- transaction. The public RPC also clears these settings defensively.
  perform set_config('job_crm.stage_occurred_at', '', true);
  perform set_config('job_crm.stage_notes', '', true);

  return new;
end;
$$;

create trigger applications_record_stage_change
  after update of current_stage_id on public.applications
  for each row execute function private.record_application_stage_change();

-- applied_at is editable, but it is not independent from history. A never-
-- applied Saved record cannot gain an application date, and an application
-- that has reached Applied cannot lose it.
create function private.guard_application_applied_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_applied_event boolean;
  target_category public.pipeline_stage_category;
begin
  if new.applied_at is not distinct from old.applied_at then
    return new;
  end if;

  select exists (
    select 1
    from public.application_stage_events as stage_event
    join public.pipeline_stages as stage
      on stage.id = stage_event.to_stage_id
      and stage.user_id = stage_event.user_id
    where stage_event.application_id = old.id
      and stage_event.user_id = old.user_id
      and stage.category = 'applied'
  ) into has_applied_event;

  if new.applied_at is null and has_applied_event then
    raise exception using
      errcode = '23514',
      message = 'The application date cannot be cleared after reaching Applied.';
  end if;

  if new.applied_at is not null and not has_applied_event then
    select stage.category
      into target_category
    from public.pipeline_stages as stage
    where stage.id = new.current_stage_id
      and stage.user_id = new.user_id;

    if target_category is distinct from 'applied' then
      raise exception using
        errcode = '23514',
        message = 'A Saved or never-applied record cannot have an applied_at timestamp.';
    end if;
  end if;

  return new;
end;
$$;

create trigger applications_guard_applied_at
  before update of applied_at on public.applications
  for each row execute function private.guard_application_applied_at();

create function private.prevent_application_stage_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('job_crm.allow_applied_event_date_sync', true) = 'on'
    and new.id = old.id
    and new.user_id = old.user_id
    and new.application_id = old.application_id
    and new.from_stage_id is not distinct from old.from_stage_id
    and new.to_stage_id = old.to_stage_id
    and new.notes is not distinct from old.notes
    and new.created_at = old.created_at
  then
    return new;
  end if;

  raise exception using
    errcode = '55000',
    message = 'Application stage events are immutable.';
end;
$$;

create trigger application_stage_events_prevent_update
  before update on public.application_stage_events
  for each row execute function private.prevent_application_stage_event_update();

create function private.sync_application_applied_event_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_applied_event_id uuid;
  first_applied_event_created_at timestamptz;
  previous_event_at timestamptz;
  next_event_at timestamptz;
begin
  if new.applied_at is not distinct from old.applied_at
    or new.applied_at is null
  then
    return new;
  end if;

  select stage_event.id, stage_event.created_at
    into first_applied_event_id, first_applied_event_created_at
  from public.application_stage_events as stage_event
  join public.pipeline_stages as stage
    on stage.id = stage_event.to_stage_id
    and stage.user_id = stage_event.user_id
  where stage_event.application_id = new.id
    and stage_event.user_id = new.user_id
    and stage.category = 'applied'
  order by stage_event.created_at, stage_event.id
  limit 1;

  if first_applied_event_id is null then
    raise exception using
      errcode = '55000',
      message = 'Cannot synchronize applied_at because Applied history is missing.';
  end if;

  select
    max(stage_event.occurred_at) filter (
      where stage_event.created_at < first_applied_event_created_at
    ),
    min(stage_event.occurred_at) filter (
      where stage_event.created_at > first_applied_event_created_at
    )
    into previous_event_at, next_event_at
  from public.application_stage_events as stage_event
  where stage_event.application_id = new.id
    and stage_event.user_id = new.user_id
    and stage_event.id <> first_applied_event_id;

  if previous_event_at is not null and new.applied_at < previous_event_at then
    raise exception using
      errcode = '22007',
      message = 'The application date cannot be before the preceding history event.';
  end if;

  if next_event_at is not null and new.applied_at > next_event_at then
    raise exception using
      errcode = '22007',
      message = 'The application date cannot be after the next history event.';
  end if;

  if new.applied_at > now() + interval '5 minutes' then
    raise exception using
      errcode = '22007',
      message = 'The application date cannot be materially in the future.';
  end if;

  perform set_config('job_crm.allow_applied_event_date_sync', 'on', true);
  update public.application_stage_events
  set occurred_at = new.applied_at
  where id = first_applied_event_id
    and user_id = new.user_id;
  perform set_config('job_crm.allow_applied_event_date_sync', '', true);

  return new;
end;
$$;

-- Trigger names are ordered intentionally: when a single statement changes
-- both stage and date, record_stage_change runs before this synchronization.
create trigger applications_sync_applied_at_event
  after update of applied_at on public.applications
  for each row execute function private.sync_application_applied_event_date();

create function public.transition_application_stage(
  p_application_id uuid,
  p_to_stage_id uuid,
  p_occurred_at timestamptz default now(),
  p_notes text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  target_is_active boolean;
  application_record public.applications%rowtype;
  effective_occurred_at timestamptz := coalesce(p_occurred_at, now());
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select application.*
    into application_record
  from public.applications as application
  where application.id = p_application_id
    and application.user_id = acting_user_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Application not found.';
  end if;

  select stage.is_active
    into target_is_active
  from public.pipeline_stages as stage
  where stage.id = p_to_stage_id
    and stage.user_id = acting_user_id;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Target stage does not belong to the application owner.';
  end if;

  if not target_is_active then
    raise exception using
      errcode = '23514',
      message = 'Cannot move an application into an inactive stage.';
  end if;

  if application_record.current_stage_id = p_to_stage_id then
    raise exception using
      errcode = '23514',
      message = 'Application is already in the requested stage.';
  end if;

  perform set_config(
    'job_crm.stage_occurred_at',
    effective_occurred_at::text,
    true
  );
  perform set_config('job_crm.stage_notes', coalesce(p_notes, ''), true);

  update public.applications
  set current_stage_id = p_to_stage_id
  where id = p_application_id
    and user_id = acting_user_id
  returning * into application_record;

  perform set_config('job_crm.stage_occurred_at', '', true);
  perform set_config('job_crm.stage_notes', '', true);

  return application_record;
end;
$$;

revoke all on function public.transition_application_stage(uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.transition_application_stage(uuid, uuid, timestamptz, text)
  to authenticated;

-- AI runs are audit/cache records, not general CRUD. These two RPCs expose the
-- minimum write surface needed by a Next.js server using the caller's JWT.
create function public.begin_ai_run(
  p_application_id uuid,
  p_operation public.ai_operation,
  p_provider text,
  p_model text,
  p_input_hash text,
  p_prompt_version text,
  p_server_capability text
)
returns public.ai_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  ai_run_record public.ai_runs%rowtype;
  quota private.ai_quota_config%rowtype;
  current_count bigint;
  utc_day_start timestamptz;
  admission_at timestamptz;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select * into strict quota
  from private.ai_quota_config
  where singleton;

  if quota.server_capability_hash is null
    or p_server_capability is null
    or extensions.digest(p_server_capability, 'sha256')
      <> quota.server_capability_hash
  then
    raise exception using
      errcode = '42501',
      message = 'AI RPC server capability is not configured or invalid.';
  end if;

  if p_application_id is not null and not exists (
    select 1
    from public.applications as application
    where application.id = p_application_id
      and application.user_id = acting_user_id
  ) then
    raise exception using
      errcode = '23503',
      message = 'Application does not belong to the authenticated user.';
  end if;

  if p_operation is null then
    raise exception using errcode = '23514', message = 'Invalid AI operation.';
  end if;

  if p_provider is null or char_length(btrim(p_provider)) not between 1 and 80 then
    raise exception using errcode = '23514', message = 'Invalid AI provider.';
  end if;

  if p_model is null or char_length(btrim(p_model)) not between 1 and 160 then
    raise exception using errcode = '23514', message = 'Invalid AI model.';
  end if;

  if p_input_hash is null or p_input_hash !~ '^[a-fA-F0-9]{64}$' then
    raise exception using errcode = '23514', message = 'Invalid AI input hash.';
  end if;

  if p_prompt_version is null
    or char_length(btrim(p_prompt_version)) not between 1 and 120
  then
    raise exception using errcode = '23514', message = 'Invalid AI prompt version.';
  end if;

  -- Serialize admission globally, then for the tenant. The global lock makes
  -- the shared ceiling atomic; PostgREST RPC transactions cannot hold it open
  -- after the request completes.
  perform pg_catalog.pg_advisory_xact_lock(51001, 0);
  perform pg_catalog.pg_advisory_xact_lock(
    51002,
    pg_catalog.hashtext(acting_user_id::text)
  );
  admission_at := clock_timestamp();

  -- Provider requests have a 60-second total timeout. A five-minute default
  -- leaves headroom for application/database cleanup while ensuring an outage
  -- cannot leave a duplicate or concurrency slot blocked forever.
  update public.ai_runs
  set
    status = 'failed',
    error_message = 'AI run expired before completion.',
    completed_at = admission_at
  where status = 'pending'
    and user_id = acting_user_id
    and created_at < admission_at
      - pg_catalog.make_interval(secs => quota.stale_pending_seconds);

  if exists (
    select 1
    from public.ai_runs as pending_run
    where pending_run.user_id = acting_user_id
      and pending_run.application_id is not distinct from p_application_id
      and pending_run.operation = p_operation
      and pending_run.provider = btrim(p_provider)
      and pending_run.model = btrim(p_model)
      and pending_run.input_hash = lower(p_input_hash)
      and pending_run.prompt_version = btrim(p_prompt_version)
      and pending_run.status = 'pending'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'AI_DUPLICATE_PENDING: An identical AI request is already running.';
  end if;

  select count(*) into current_count
  from public.ai_runs as pending_run
  where pending_run.user_id = acting_user_id
    and pending_run.status = 'pending';

  if current_count >= quota.per_user_concurrent_limit then
    raise exception using
      errcode = 'P0001',
      message = 'AI_CONCURRENCY_LIMIT: Too many AI requests are already running.';
  end if;

  select count(*) into current_count
  from public.ai_runs as recent_run
  where recent_run.user_id = acting_user_id
    and recent_run.created_at >= admission_at
      - pg_catalog.make_interval(secs => quota.window_seconds);

  if current_count >= quota.per_user_window_limit then
    raise exception using
      errcode = 'P0001',
      message = 'AI_RATE_LIMIT: The per-user AI request rate was exceeded.';
  end if;

  utc_day_start := pg_catalog.date_trunc(
    'day',
    admission_at at time zone 'UTC'
  ) at time zone 'UTC';

  select count(*) into current_count
  from public.ai_runs as daily_run
  where daily_run.user_id = acting_user_id
    and daily_run.created_at >= utc_day_start;

  if current_count >= quota.per_user_daily_limit then
    raise exception using
      errcode = 'P0001',
      message = 'AI_USER_DAILY_LIMIT: The daily per-user AI request limit was reached.';
  end if;

  select count(*) into current_count
  from public.ai_runs as global_run
  where global_run.created_at >= utc_day_start;

  if current_count >= quota.global_daily_limit then
    raise exception using
      errcode = 'P0001',
      message = 'AI_GLOBAL_DAILY_LIMIT: The shared daily AI request limit was reached.';
  end if;

  insert into public.ai_runs (
    user_id,
    application_id,
    operation,
    provider,
    model,
    input_hash,
    prompt_version,
    status,
    created_at
  ) values (
    acting_user_id,
    p_application_id,
    p_operation,
    btrim(p_provider),
    btrim(p_model),
    lower(p_input_hash),
    btrim(p_prompt_version),
    'pending',
    admission_at
  )
  returning * into ai_run_record;

  return ai_run_record;
end;
$$;

create function public.complete_ai_run(
  p_ai_run_id uuid,
  p_status public.ai_run_status,
  p_server_capability text,
  p_result jsonb default null,
  p_error_message text default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns public.ai_runs
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  ai_run_record public.ai_runs%rowtype;
  server_capability_hash bytea;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select quota.server_capability_hash into server_capability_hash
  from private.ai_quota_config as quota
  where quota.singleton;

  if server_capability_hash is null
    or p_server_capability is null
    or extensions.digest(p_server_capability, 'sha256')
      <> server_capability_hash
  then
    raise exception using
      errcode = '42501',
      message = 'AI RPC server capability is not configured or invalid.';
  end if;

  if p_status is null or p_status not in ('succeeded', 'failed') then
    raise exception using
      errcode = '23514',
      message = 'An AI run can only be completed as succeeded or failed.';
  end if;

  if p_input_tokens is not null and p_input_tokens < 0 then
    raise exception using errcode = '23514', message = 'Input tokens cannot be negative.';
  end if;

  if p_output_tokens is not null and p_output_tokens < 0 then
    raise exception using errcode = '23514', message = 'Output tokens cannot be negative.';
  end if;

  if p_status = 'succeeded' and (
    p_result is null or jsonb_typeof(p_result) <> 'object'
  ) then
    raise exception using
      errcode = '23514',
      message = 'A successful AI run requires an object result.';
  end if;

  if p_result is not null and octet_length(p_result::text) > 1048576 then
    raise exception using
      errcode = '23514',
      message = 'AI result exceeds the 1 MiB storage limit.';
  end if;

  if p_status = 'failed' and nullif(btrim(p_error_message), '') is null then
    raise exception using
      errcode = '23514',
      message = 'A failed AI run requires an error message.';
  end if;

  select ai_run.*
    into ai_run_record
  from public.ai_runs as ai_run
  where ai_run.id = p_ai_run_id
    and ai_run.user_id = acting_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'AI run not found.';
  end if;

  if ai_run_record.status <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'AI run has already been completed.';
  end if;

  update public.ai_runs
  set
    status = p_status,
    result = case when p_status = 'succeeded' then p_result else null end,
    error_message = case
      when p_status = 'failed' then left(btrim(p_error_message), 2000)
      else null
    end,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    completed_at = clock_timestamp()
  where id = p_ai_run_id
    and user_id = acting_user_id
  returning * into ai_run_record;

  return ai_run_record;
end;
$$;

revoke all on function public.begin_ai_run(uuid, public.ai_operation, text, text, text, text, text)
  from public, anon;
grant execute on function public.begin_ai_run(uuid, public.ai_operation, text, text, text, text, text)
  to authenticated;

revoke all on function public.complete_ai_run(uuid, public.ai_run_status, text, jsonb, text, integer, integer)
  from public, anon;
grant execute on function public.complete_ai_run(uuid, public.ai_run_status, text, jsonb, text, integer, integer)
  to authenticated;

-- Storage upload admission is reservation-based. Supabase Storage evaluates
-- INSERT policies in a rolled-back permission-check transaction before writing
-- the blob, so the policy is intentionally read-only. The reservation is
-- consumed atomically with resume metadata in finalize_resume_upload.
create function private.storage_metadata_bytes(p_metadata jsonb)
returns bigint
language plpgsql
immutable
set search_path = ''
as $$
declare
  byte_text text;
  byte_value numeric;
begin
  byte_text := coalesce(
    p_metadata ->> 'size',
    p_metadata ->> 'contentLength'
  );

  if byte_text is null or byte_text !~ '^[0-9]+$' then
    return null;
  end if;

  byte_value := byte_text::numeric;
  if byte_value > 9223372036854775807 then
    return null;
  end if;

  return byte_value::bigint;
end;
$$;

create function private.resume_upload_intent_allows(
  p_storage_path text,
  p_metadata jsonb
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from private.resume_upload_intents as upload_intent
      where upload_intent.user_id = auth.uid()
        and upload_intent.storage_path = p_storage_path
        and upload_intent.expected_bytes =
          private.storage_metadata_bytes(p_metadata)
        and upload_intent.expected_mime_type = lower(coalesce(
          p_metadata ->> 'mimetype',
          p_metadata ->> 'contentType',
          ''
        ))
        and upload_intent.cancel_requested_at is null
        and upload_intent.expires_at > clock_timestamp()
    );
$$;

create function public.reserve_resume_upload(
  p_resume_id uuid,
  p_storage_path text,
  p_expected_bytes bigint,
  p_mime_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  quota private.resume_storage_quota_config%rowtype;
  expected_prefix text;
  filename text;
  existing_intent private.resume_upload_intents%rowtype;
  actual_object_count bigint;
  actual_object_bytes bigint;
  reserved_object_count bigint;
  reserved_object_bytes bigint;
  upload_intent_id uuid;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_resume_id is null then
    raise exception using errcode = '23514', message = 'Invalid resume identifier.';
  end if;

  expected_prefix := acting_user_id::text || '/' || p_resume_id::text || '/';
  filename := substring(p_storage_path from char_length(expected_prefix) + 1);

  if p_storage_path is null
    or char_length(p_storage_path) > 1024
    or left(p_storage_path, char_length(expected_prefix)) <> expected_prefix
    or filename is null
    or filename = ''
    or position('/' in filename) > 0
    or position('..' in p_storage_path) > 0
  then
    raise exception using errcode = '23514', message = 'Invalid resume storage path.';
  end if;

  if lower(coalesce(p_mime_type, '')) not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ) then
    raise exception using errcode = '23514', message = 'Invalid resume MIME type.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    52001,
    pg_catalog.hashtext(acting_user_id::text)
  );

  select * into strict quota
  from private.resume_storage_quota_config
  where singleton;

  if p_expected_bytes is null
    or p_expected_bytes < 1
    or p_expected_bytes > quota.max_object_bytes
  then
    raise exception using errcode = '23514', message = 'Invalid resume file size.';
  end if;

  -- Storage first performs a rolled-back permission check, then streams the
  -- blob before its privileged metadata write. Expiry therefore stops future
  -- authorization but never releases quota: a blob authorized just before
  -- expiry may still be in flight. Ordinary expiry never releases quota, which
  -- prevents a direct client from cycling expired authorizations to exceed a
  -- hard limit; explicit cancellation uses the delayed path below.

  -- A cancellation first revokes authorization, then remains charged for a
  -- conservative 24-hour in-flight window. A later reserve/cancel call may
  -- release it only after that window and a fresh Storage absence check.
  delete from private.resume_upload_intents as cancelled_intent
  where cancelled_intent.user_id = acting_user_id
    and cancelled_intent.cancel_requested_at is not null
    and cancelled_intent.release_after <= clock_timestamp()
    and not exists (
      select 1
      from storage.objects as landed_object
      where landed_object.bucket_id = 'resumes'
        and landed_object.name = cancelled_intent.storage_path
    );

  if exists (
    select 1
    from storage.objects as stored_object
    where stored_object.bucket_id = 'resumes'
      and stored_object.name = p_storage_path
  ) then
    raise exception using
      errcode = '23505',
      message = 'A storage object already exists at this resume path.';
  end if;

  select * into existing_intent
  from private.resume_upload_intents as upload_intent
  where upload_intent.user_id = acting_user_id
    and (
      upload_intent.resume_id = p_resume_id
      or upload_intent.storage_path = p_storage_path
    )
  for update;

  if found then
    if existing_intent.resume_id = p_resume_id
      and existing_intent.storage_path = p_storage_path
      and existing_intent.expected_bytes = p_expected_bytes
      and existing_intent.expected_mime_type = lower(p_mime_type)
    then
      if existing_intent.expires_at <= clock_timestamp()
        or existing_intent.cancel_requested_at is not null
      then
        update private.resume_upload_intents
        set
          expires_at = clock_timestamp()
            + pg_catalog.make_interval(
              secs => quota.upload_intent_ttl_seconds
            ),
          cancel_requested_at = null,
          release_after = null
        where id = existing_intent.id;
      end if;

      return existing_intent.id;
    end if;

    raise exception using
      errcode = '23505',
      message = 'A different upload reservation already uses this resume identifier or path.';
  end if;

  select
    count(*),
    coalesce(sum(coalesce(
      private.storage_metadata_bytes(stored_object.metadata),
      quota.max_object_bytes
    )), 0)
    into actual_object_count, actual_object_bytes
  from storage.objects as stored_object
  where stored_object.bucket_id = 'resumes'
    and stored_object.name like acting_user_id::text || '/%';

  select
    count(*),
    coalesce(sum(upload_intent.expected_bytes), 0)
    into reserved_object_count, reserved_object_bytes
  from private.resume_upload_intents as upload_intent
  where upload_intent.user_id = acting_user_id
    and not exists (
      select 1
      from storage.objects as landed_object
      where landed_object.bucket_id = 'resumes'
        and landed_object.name = upload_intent.storage_path
    );

  if actual_object_count + reserved_object_count + 1
    > quota.max_objects_per_user
  then
    raise exception using
      errcode = 'P0001',
      message = 'RESUME_OBJECT_QUOTA: The per-user resume file count limit was reached.';
  end if;

  if actual_object_bytes + reserved_object_bytes + p_expected_bytes
    > quota.max_bytes_per_user
  then
    raise exception using
      errcode = 'P0001',
      message = 'RESUME_BYTES_QUOTA: The per-user resume storage limit was reached.';
  end if;

  insert into private.resume_upload_intents (
    user_id,
    resume_id,
    storage_path,
    expected_bytes,
    expected_mime_type,
    expires_at
  ) values (
    acting_user_id,
    p_resume_id,
    p_storage_path,
    p_expected_bytes,
    lower(p_mime_type),
    clock_timestamp()
      + pg_catalog.make_interval(secs => quota.upload_intent_ttl_seconds)
  )
  returning id into upload_intent_id;

  return upload_intent_id;
end;
$$;

-- The Next server calls this only after asking Storage to remove the object and
-- receiving a not-found result from a follow-up info request. Cancellation
-- immediately revokes authorization, but quota is released only by a later
-- call after the 24-hour in-flight grace and another absence check.
create function public.cancel_resume_upload(
  p_resume_id uuid,
  p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  expected_prefix text;
  quota private.resume_storage_quota_config%rowtype;
  upload_intent private.resume_upload_intents%rowtype;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  expected_prefix := acting_user_id::text || '/' || p_resume_id::text || '/';
  if p_resume_id is null
    or p_storage_path is null
    or left(p_storage_path, char_length(expected_prefix)) <> expected_prefix
    or position('..' in p_storage_path) > 0
  then
    raise exception using errcode = '23514', message = 'Invalid resume storage path.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    52001,
    pg_catalog.hashtext(acting_user_id::text)
  );

  select * into strict quota
  from private.resume_storage_quota_config
  where singleton;

  delete from private.resume_upload_intents as cancelled_intent
  where cancelled_intent.user_id = acting_user_id
    and cancelled_intent.cancel_requested_at is not null
    and cancelled_intent.release_after <= clock_timestamp()
    and not exists (
      select 1
      from storage.objects as landed_object
      where landed_object.bucket_id = 'resumes'
        and landed_object.name = cancelled_intent.storage_path
    );

  select * into upload_intent
  from private.resume_upload_intents as reserved_upload
  where reserved_upload.user_id = acting_user_id
    and reserved_upload.resume_id = p_resume_id
    and reserved_upload.storage_path = p_storage_path
  for update;

  if not found then
    return true;
  end if;

  update private.resume_upload_intents
  set
    expires_at = least(expires_at, clock_timestamp()),
    cancel_requested_at = coalesce(cancel_requested_at, clock_timestamp()),
    release_after = coalesce(
      release_after,
      clock_timestamp() + pg_catalog.make_interval(
        secs => quota.cancel_release_grace_seconds
      )
    )
  where id = upload_intent.id;

  -- A landed object always keeps the allocation charged. When it is absent,
  -- this first call merely queues delayed release; a later call performs the
  -- delete above after the grace window.
  if exists (
    select 1
    from storage.objects as stored_object
    where stored_object.bucket_id = 'resumes'
      and stored_object.name = p_storage_path
  ) then
    return false;
  end if;

  return false;
end;
$$;

create function public.finalize_resume_upload(
  p_resume_id uuid,
  p_name text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_file_hash text,
  p_extracted_text text default null
)
returns public.resumes
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  upload_intent private.resume_upload_intents%rowtype;
  actual_bytes bigint;
  actual_mime_type text;
  resume_record public.resumes%rowtype;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    52001,
    pg_catalog.hashtext(acting_user_id::text)
  );

  select * into upload_intent
  from private.resume_upload_intents as reserved_upload
  where reserved_upload.user_id = acting_user_id
    and reserved_upload.resume_id = p_resume_id
    and reserved_upload.storage_path = p_storage_path
    and reserved_upload.expected_bytes = p_file_size_bytes
    and reserved_upload.expected_mime_type = lower(coalesce(p_mime_type, ''))
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'A matching resume upload reservation was not found.';
  end if;

  select
    private.storage_metadata_bytes(stored_object.metadata),
    lower(coalesce(
      stored_object.metadata ->> 'mimetype',
      stored_object.metadata ->> 'contentType',
      ''
    ))
    into actual_bytes, actual_mime_type
  from storage.objects as stored_object
  where stored_object.bucket_id = 'resumes'
    and stored_object.name = p_storage_path
    and stored_object.owner_id = acting_user_id::text;

  if not found
    or actual_bytes is distinct from p_file_size_bytes
    or actual_mime_type is distinct from lower(p_mime_type)
  then
    raise exception using
      errcode = '23514',
      message = 'The uploaded resume object does not match its reservation.';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception using errcode = '23514', message = 'Invalid resume name.';
  end if;

  if p_original_filename is null
    or char_length(btrim(p_original_filename)) not between 1 and 255
  then
    raise exception using errcode = '23514', message = 'Invalid original filename.';
  end if;

  if p_file_hash is null or p_file_hash !~ '^[a-fA-F0-9]{64}$' then
    raise exception using errcode = '23514', message = 'Invalid resume file hash.';
  end if;

  if p_extracted_text is not null and char_length(p_extracted_text) > 100000 then
    raise exception using errcode = '23514', message = 'Resume text is too long.';
  end if;

  insert into public.resumes (
    id,
    user_id,
    name,
    original_filename,
    storage_path,
    mime_type,
    file_size_bytes,
    file_hash,
    extracted_text
  ) values (
    p_resume_id,
    acting_user_id,
    btrim(p_name),
    btrim(p_original_filename),
    p_storage_path,
    lower(p_mime_type),
    p_file_size_bytes,
    lower(p_file_hash),
    nullif(btrim(p_extracted_text), '')
  )
  returning * into resume_record;

  delete from private.resume_upload_intents
  where id = upload_intent.id;

  return resume_record;
end;
$$;

-- The normal delete flow removes metadata first because Storage DELETE is
-- blocked while that metadata exists. If the Storage API then fails, this
-- narrow recovery RPC can restore only metadata that still has an exact owned
-- object behind it; general client INSERT remains revoked.
create function public.restore_resume_metadata_after_failed_delete(
  p_resume_id uuid,
  p_name text,
  p_original_filename text,
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_file_hash text,
  p_extracted_text text,
  p_archived_at timestamptz,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns public.resumes
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user_id uuid := auth.uid();
  actual_bytes bigint;
  actual_mime_type text;
  resume_record public.resumes%rowtype;
begin
  if acting_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  if p_resume_id is null
    or p_storage_path not like
      acting_user_id::text || '/' || p_resume_id::text || '/%'
    or position('..' in p_storage_path) > 0
  then
    raise exception using errcode = '23514', message = 'Invalid resume storage path.';
  end if;

  select
    private.storage_metadata_bytes(stored_object.metadata),
    lower(coalesce(
      stored_object.metadata ->> 'mimetype',
      stored_object.metadata ->> 'contentType',
      ''
    ))
    into actual_bytes, actual_mime_type
  from storage.objects as stored_object
  where stored_object.bucket_id = 'resumes'
    and stored_object.name = p_storage_path
    and stored_object.owner_id = acting_user_id::text;

  if not found
    or actual_bytes is distinct from p_file_size_bytes
    or actual_mime_type is distinct from lower(coalesce(p_mime_type, ''))
  then
    raise exception using
      errcode = '23514',
      message = 'The resume object is missing or no longer matches its metadata.';
  end if;

  insert into public.resumes (
    id,
    user_id,
    name,
    original_filename,
    storage_path,
    mime_type,
    file_size_bytes,
    file_hash,
    extracted_text,
    archived_at,
    created_at,
    updated_at
  ) values (
    p_resume_id,
    acting_user_id,
    btrim(p_name),
    btrim(p_original_filename),
    p_storage_path,
    lower(p_mime_type),
    p_file_size_bytes,
    case when p_file_hash is null then null else lower(p_file_hash) end,
    p_extracted_text,
    p_archived_at,
    p_created_at,
    p_updated_at
  )
  returning * into resume_record;

  return resume_record;
end;
$$;

revoke all on function public.reserve_resume_upload(uuid, text, bigint, text)
  from public, anon;
grant execute on function public.reserve_resume_upload(uuid, text, bigint, text)
  to authenticated;

revoke all on function public.cancel_resume_upload(uuid, text)
  from public, anon;
grant execute on function public.cancel_resume_upload(uuid, text)
  to authenticated;

revoke all on function public.finalize_resume_upload(uuid, text, text, text, text, bigint, text, text)
  from public, anon;
grant execute on function public.finalize_resume_upload(uuid, text, text, text, text, bigint, text, text)
  to authenticated;

revoke all on function public.restore_resume_metadata_after_failed_delete(
  uuid, text, text, text, text, bigint, text, text, timestamptz, timestamptz,
  timestamptz
)
  from public, anon;
grant execute on function public.restore_resume_metadata_after_failed_delete(
  uuid, text, text, text, text, bigint, text, text, timestamptz, timestamptz,
  timestamptz
)
  to authenticated;

-- Create each auth profile and its independent, customizable default lookups.
create function private.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.application_sources (user_id, name, is_active)
  values
    (p_user_id, 'LinkedIn', true),
    (p_user_id, 'Indeed', true),
    (p_user_id, 'Company Careers Page', true),
    (p_user_id, 'Recruiter Outreach', true),
    (p_user_id, 'Email Outreach', true),
    (p_user_id, 'Referral', true),
    (p_user_id, 'Glassdoor', true),
    (p_user_id, 'Other Job Board', true),
    (p_user_id, 'Other', true)
  on conflict do nothing;

  insert into public.application_channels (user_id, name, is_active)
  values
    (p_user_id, 'Company Careers Page', true),
    (p_user_id, 'LinkedIn Easy Apply', true),
    (p_user_id, 'Indeed Apply', true),
    (p_user_id, 'Email', true),
    (p_user_id, 'Recruiter', true),
    (p_user_id, 'Referral', true),
    (p_user_id, 'Greenhouse', true),
    (p_user_id, 'Lever', true),
    (p_user_id, 'Ashby', true),
    (p_user_id, 'Workday', true),
    (p_user_id, 'Other ATS', true),
    (p_user_id, 'Other', true)
  on conflict do nothing;

  insert into public.pipeline_stages (
    user_id,
    name,
    category,
    sort_order,
    is_terminal,
    is_active
  ) values
    (p_user_id, 'Saved', 'saved', 10, false, true),
    (p_user_id, 'Applied', 'applied', 20, false, true),
    (p_user_id, 'Screening', 'screening', 30, false, true),
    (p_user_id, '1st Interview', 'interview', 40, false, true),
    (p_user_id, 'Technical Assessment', 'assessment', 50, false, true),
    (p_user_id, 'Technical Interview', 'interview', 60, false, true),
    (p_user_id, '2nd Interview', 'interview', 70, false, true),
    (p_user_id, 'Final Interview', 'interview', 80, false, true),
    (p_user_id, 'Offer', 'offer', 90, false, true),
    (p_user_id, 'Accepted', 'accepted', 100, true, true),
    (p_user_id, 'Rejected', 'rejected', 110, true, true),
    (p_user_id, 'Withdrawn', 'withdrawn', 120, true, true),
    (p_user_id, 'Ghosted', 'ghosted', 130, true, true),
    (p_user_id, 'Closed', 'closed', 140, true, true)
  on conflict do nothing;
end;
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inferred_display_name text;
begin
  inferred_display_name := nullif(
    left(
      coalesce(
        nullif(new.raw_user_meta_data ->> 'display_name', ''),
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      100
    ),
    ''
  );

  insert into public.profiles (id, display_name)
  values (new.id, inferred_display_name)
  on conflict (id) do nothing;

  perform private.seed_user_defaults(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill profiles/defaults if this migration is applied to a project that
-- already has Auth users.
insert into public.profiles (id, display_name)
select
  auth_user.id,
  nullif(
    left(
      coalesce(
        nullif(auth_user.raw_user_meta_data ->> 'display_name', ''),
        nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
        split_part(coalesce(auth_user.email, ''), '@', 1)
      ),
      100
    ),
    ''
  )
from auth.users as auth_user
on conflict (id) do nothing;

do $$
declare
  existing_user record;
begin
  for existing_user in select id from auth.users loop
    perform private.seed_user_defaults(existing_user.id);
  end loop;
end;
$$;

-- RLS: profiles are keyed by auth.uid(); every other public table uses user_id.
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'application_sources',
    'application_channels',
    'pipeline_stages',
    'companies',
    'resumes',
    'applications',
    'contacts',
    'application_events',
    'application_notes'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own',
      table_name
    );
  end loop;
end;
$$;

alter table public.application_stage_events enable row level security;
create policy application_stage_events_select_own
  on public.application_stage_events for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.ai_runs enable row level security;
create policy ai_runs_select_own
  on public.ai_runs for select to authenticated
  using ((select auth.uid()) = user_id);

-- Start from a closed permission set, then expose only the operations needed by
-- authenticated application sessions. anon receives no domain-table access.
revoke all on table
  public.profiles,
  public.application_sources,
  public.application_channels,
  public.pipeline_stages,
  public.companies,
  public.resumes,
  public.applications,
  public.application_stage_events,
  public.contacts,
  public.application_events,
  public.application_notes,
  public.ai_runs
from anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.application_sources,
  public.application_channels,
  public.pipeline_stages,
  public.companies,
  public.resumes,
  public.applications,
  public.contacts,
  public.application_events,
  public.application_notes
to authenticated;
-- Resume metadata can only be created by the exact-object finalization RPC (or
-- its narrow failed-delete recovery RPC). Existing rows remain user-editable,
-- archiveable, and deletable under RLS.
revoke insert on table public.resumes from authenticated;
grant select on table public.application_stage_events to authenticated;
grant select on table public.ai_runs to authenticated;

grant usage on type
  public.pipeline_stage_category,
  public.work_mode,
  public.employment_type,
  public.salary_period,
  public.application_event_type,
  public.ai_operation,
  public.ai_run_status
to authenticated;

-- Private resume storage. Files are insert-only versions: there is no UPDATE
-- policy, and an object cannot be deleted until its metadata row is removed.
-- The application FK prevents metadata deletion while a resume is submitted.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy resume_objects_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy resume_objects_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.resume_upload_intent_allows(name, metadata)
  );

create policy resume_objects_delete_unreferenced_own
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1
      from public.resumes as resume
      where resume.user_id = (select auth.uid())
        and resume.storage_path = storage.objects.name
    )
  );

comment on table public.application_stage_events is
  'Append-only application stage history. Authenticated clients may only read; changes are recorded by application triggers.';
comment on function public.transition_application_stage(uuid, uuid, timestamptz, text) is
  'Atomically locks an owned application, changes its current stage, and records an immutable history event.';
comment on column public.applications.raw_job_description is
  'Exact user-pasted job description. AI workflows must never replace this archival text.';
