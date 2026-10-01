-- An optional, user-chosen tag for triaging applications: how closely a role
-- matches the user's resume (high or low priority), or that it is remote.
-- Adding a nullable column without a default is a metadata-only change, so
-- existing rows are untouched and keep tag = null.

create type public.application_tag as enum (
  'high_priority',
  'low_priority',
  'remote'
);

alter table public.applications
  add column tag public.application_tag;

grant usage on type public.application_tag to authenticated;

comment on column public.applications.tag is
  'Optional user-chosen triage tag: high_priority, low_priority, or remote.';
