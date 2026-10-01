begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

create function pg_temp.throws_sqlstate(
  p_statement text,
  expected_state text
)
returns boolean
language plpgsql
as $$
begin
  execute p_statement;
  return false;
exception
  when others then
    return sqlstate = expected_state;
end;
$$;

select has_column(
  'public',
  'applications',
  'tag',
  'applications has a tag column'
);

select enum_has_labels(
  'public',
  'application_tag',
  array['high_priority', 'low_priority', 'remote'],
  'application_tag offers high priority, low priority, and remote'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-0000000000c3',
    'authenticated',
    'authenticated',
    'job-crm-tag-test-c@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-0000000000d4',
    'authenticated',
    'authenticated',
    'job-crm-tag-test-d@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';

insert into public.companies (id, name)
values ('30000000-0000-0000-0000-0000000000c3', 'Tag Test Company');

insert into public.applications (
  id,
  company_id,
  job_title,
  discovery_source_id,
  application_channel_id,
  current_stage_id
) values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-0000000000c3',
  'Untagged Role',
  (select id from public.application_sources where name = 'LinkedIn'),
  (select id from public.application_channels where name = 'Company Careers Page'),
  (select id from public.pipeline_stages where name = 'Saved')
);

select is(
  (
    select tag
    from public.applications
    where id = '40000000-0000-0000-0000-000000000001'
  ),
  null::public.application_tag,
  'a new application has no tag by default'
);

select lives_ok(
  $$
    insert into public.applications (
      id,
      company_id,
      job_title,
      discovery_source_id,
      application_channel_id,
      current_stage_id,
      tag
    ) values (
      '40000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-0000000000c3',
      'Strong Match Role',
      (select id from public.application_sources where name = 'LinkedIn'),
      (select id from public.application_channels where name = 'Company Careers Page'),
      (select id from public.pipeline_stages where name = 'Saved'),
      'high_priority'
    )
  $$,
  'an authenticated user can create a tagged application'
);

update public.applications
set tag = 'remote'
where id = '40000000-0000-0000-0000-000000000002';

select is(
  (
    select tag::text
    from public.applications
    where id = '40000000-0000-0000-0000-000000000002'
  ),
  'remote',
  'the owner can change the tag'
);

update public.applications
set tag = null
where id = '40000000-0000-0000-0000-000000000002';

select is(
  (
    select tag
    from public.applications
    where id = '40000000-0000-0000-0000-000000000002'
  ),
  null::public.application_tag,
  'the owner can clear the tag'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.applications
      set tag = 'urgent'
      where id = '40000000-0000-0000-0000-000000000002'
    $$,
    '22P02'
  ),
  'values outside the tag enum are rejected'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d4';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';

update public.applications
set tag = 'low_priority'
where id = '40000000-0000-0000-0000-000000000002';

select is(
  (select count(*) from public.applications),
  0::bigint,
  'another tenant cannot see tagged applications'
);

reset role;

select is(
  (
    select tag
    from public.applications
    where id = '40000000-0000-0000-0000-000000000002'
  ),
  null::public.application_tag,
  'another tenant cannot change the tag'
);

select * from finish();
rollback;
