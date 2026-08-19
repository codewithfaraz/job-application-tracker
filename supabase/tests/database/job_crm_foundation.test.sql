begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(75);

create temporary table test_state (
  ai_run_id uuid
) on commit drop;
grant select, insert, update, delete on test_state to authenticated;

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

-- Two real Auth rows exercise the production bootstrap trigger and defaults.
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
    '00000000-0000-0000-0000-0000000000a1',
    'authenticated',
    'authenticated',
    'job-crm-test-a@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-0000000000b2',
    'authenticated',
    'authenticated',
    'job-crm-test-b@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.companies (id, name)
values ('20000000-0000-0000-0000-0000000000a1', 'Tenant A Company');

select is(
  (select count(*) from public.companies),
  1::bigint,
  'tenant A sees only its own company'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

insert into public.companies (id, name)
values ('20000000-0000-0000-0000-0000000000b2', 'Tenant B Company');

select is(
  (select count(*) from public.companies),
  1::bigint,
  'tenant B sees only its own company'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into public.applications (
        id,
        company_id,
        job_title,
        discovery_source_id,
        application_channel_id,
        current_stage_id
      ) values (
        '10000000-0000-0000-0000-000000000099',
        '20000000-0000-0000-0000-0000000000b2',
        'Cross-tenant application',
        (select id from public.application_sources where name = 'LinkedIn'),
        (select id from public.application_channels where name = 'Company Careers Page'),
        (select id from public.pipeline_stages where name = 'Saved')
      )
    $$,
    '23503'
  ),
  'composite foreign keys reject cross-tenant references'
);

insert into public.applications (
  id,
  company_id,
  job_title,
  discovery_source_id,
  application_channel_id,
  applied_at,
  current_stage_id,
  raw_job_description
) values (
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-0000000000a1',
  'Applied Test Role',
  (select id from public.application_sources where name = 'LinkedIn'),
  (select id from public.application_channels where name = 'Company Careers Page'),
  now() - interval '2 days',
  (select id from public.pipeline_stages where name = 'Applied'),
  'An exact test job description.'
);

select is(
  (
    select count(*)
    from public.application_stage_events
    where application_id = '10000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'application insert creates exactly one initial stage event'
);

select lives_ok(
  $$
    select public.transition_application_stage(
      '10000000-0000-0000-0000-000000000001',
      (select id from public.pipeline_stages where name = 'Screening'),
      now() - interval '1 day',
      'Screen scheduled'
    )
  $$,
  'owned application transitions through the RPC'
);

select is(
  (
    select stage.category::text
    from public.applications as application
    join public.pipeline_stages as stage on stage.id = application.current_stage_id
    where application.id = '10000000-0000-0000-0000-000000000001'
  ),
  'screening',
  'transition updates current stage'
);

select is(
  (
    select count(*)
    from public.application_stage_events
    where application_id = '10000000-0000-0000-0000-000000000001'
  ),
  2::bigint,
  'transition appends one immutable history event'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.transition_application_stage(
        '10000000-0000-0000-0000-000000000001',
        (select id from public.pipeline_stages where name = 'Rejected'),
        now(),
        null
      )
    $$,
    'P0002'
  ),
  'another tenant cannot transition the application'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into public.applications (
  id,
  company_id,
  job_title,
  discovery_source_id,
  application_channel_id,
  current_stage_id
) values (
  '10000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-0000000000a1',
  'Saved Test Role',
  (select id from public.application_sources where name = 'LinkedIn'),
  (select id from public.application_channels where name = 'Company Careers Page'),
  (select id from public.pipeline_stages where name = 'Saved')
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.applications
      set applied_at = now()
      where id = '10000000-0000-0000-0000-000000000002'
    $$,
    '23514'
  ),
  'a never-applied Saved record cannot gain applied_at directly'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.transition_application_stage(
        '10000000-0000-0000-0000-000000000002',
        (select id from public.pipeline_stages where name = 'Screening'),
        now(),
        null
      )
    $$,
    '23514'
  ),
  'a Saved record cannot skip Applied for an advanced stage'
);

select lives_ok(
  $$
    select public.transition_application_stage(
      '10000000-0000-0000-0000-000000000002',
      (select id from public.pipeline_stages where name = 'Applied'),
      now() + interval '1 minute',
      null
    )
  $$,
  'Saved can transition to Applied with an application timestamp'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.applications
      set applied_at = null
      where id = '10000000-0000-0000-0000-000000000002'
    $$,
    '23514'
  ),
  'applied_at cannot be cleared after reaching Applied'
);

select lives_ok(
  $$
    update public.applications
    set applied_at = now() + interval '2 minutes'
    where id = '10000000-0000-0000-0000-000000000002'
  $$,
  'applied_at can be corrected within neighboring event times'
);

select is(
  (
    select stage_event.occurred_at
    from public.application_stage_events as stage_event
    join public.pipeline_stages as stage on stage.id = stage_event.to_stage_id
    where stage_event.application_id = '10000000-0000-0000-0000-000000000002'
      and stage.category = 'applied'
    order by stage_event.created_at
    limit 1
  ),
  now() + interval '2 minutes',
  'applied_at correction synchronizes the first Applied event'
);

select lives_ok(
  $$
    select public.transition_application_stage(
      '10000000-0000-0000-0000-000000000002',
      (select id from public.pipeline_stages where name = 'Screening'),
      now() + interval '3 minutes',
      null
    )
  $$,
  'a chronological transition after Applied succeeds'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.transition_application_stage(
        '10000000-0000-0000-0000-000000000002',
        (select id from public.pipeline_stages where name = 'Technical Interview'),
        now() + interval '2 minutes',
        null
      )
    $$,
    '22007'
  ),
  'out-of-order transition timestamps are rejected'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.transition_application_stage(
        '10000000-0000-0000-0000-000000000002',
        (select id from public.pipeline_stages where name = 'Technical Interview'),
        now() + interval '10 minutes',
        null
      )
    $$,
    '22007'
  ),
  'materially future transition timestamps are rejected'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.application_stage_events
      set notes = 'tampered'
      where application_id = '10000000-0000-0000-0000-000000000002'
    $$,
    '42501'
  ),
  'authenticated clients cannot mutate stage history directly'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.pipeline_stages
      set category = 'screening'
      where name = 'Applied'
    $$,
    '55000'
  ),
  'a referenced normalized stage category is immutable'
);

insert into public.pipeline_stages (
  id,
  name,
  category,
  sort_order
) values (
  '30000000-0000-0000-0000-000000000001',
  'Unused Custom Stage',
  'saved',
  999
);

select lives_ok(
  $$
    update public.pipeline_stages
    set category = 'applied'
    where id = '30000000-0000-0000-0000-000000000001'
  $$,
  'an unreferenced custom stage category remains editable'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values (
        'resumes',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
        '00000000-0000-0000-0000-0000000000a1',
        '{"size":4,"mimetype":"text/plain"}'::jsonb
      )
    $$,
    '42501'
  ),
  'storage INSERT is denied without an exact upload reservation'
);

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
      4,
      'text/plain'
    )
  $$,
  'an owner can reserve an exact resume path, size, and MIME type'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values (
        'resumes',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
        '00000000-0000-0000-0000-0000000000a1',
        '{"size":5,"mimetype":"text/plain"}'::jsonb
      )
    $$,
    '42501'
  ),
  'storage INSERT rejects metadata that does not match the reservation'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'resumes',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
      '00000000-0000-0000-0000-0000000000a1',
      '{"size":4,"mimetype":"text/plain"}'::jsonb
    )
  $$,
  'storage INSERT accepts an exact active reservation'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into public.resumes (
        id,
        name,
        original_filename,
        storage_path,
        mime_type,
        file_size_bytes,
        file_hash
      ) values (
        '40000000-0000-0000-0000-000000000009',
        'Bypass Resume',
        'bypass.txt',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000009/bypass.txt',
        'text/plain',
        4,
        repeat('f', 64)
      )
    $$,
    '42501'
  ),
  'authenticated clients cannot bypass upload finalization with direct metadata inserts'
);

select lives_ok(
  $$
    select public.finalize_resume_upload(
      '40000000-0000-0000-0000-000000000001',
      'Unsubmitted Resume',
      'test.txt',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
      'text/plain',
      4,
      repeat('a', 64),
      null
    )
  $$,
  'finalization atomically creates metadata and consumes the reservation'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'resumes'
      and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt'
  ),
  0::bigint,
  'resume storage objects are isolated between tenants'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

reset role;
update private.resume_storage_quota_config
set max_objects_per_user = 1;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.reserve_resume_upload(
        '40000000-0000-0000-0000-000000000003',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000003/count.txt',
        1,
        'text/plain'
      )
    $$,
    'P0001'
  ),
  'resume reservations enforce the per-user object-count ceiling'
);

reset role;
update private.resume_storage_quota_config
set max_objects_per_user = 50,
    max_bytes_per_user = 5242880;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.reserve_resume_upload(
        '40000000-0000-0000-0000-000000000004',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000004/bytes.txt',
        5242880,
        'text/plain'
      )
    $$,
    'P0001'
  ),
  'resume reservations enforce the per-user byte ceiling'
);

reset role;
update private.resume_storage_quota_config
set max_bytes_per_user = 262144000;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt',
      4,
      'text/plain'
    )
  $$,
  'a test reservation can be created before checking expiration'
);

reset role;
update private.resume_upload_intents
set expires_at = clock_timestamp() - interval '1 second'
where resume_id = '40000000-0000-0000-0000-000000000005';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values (
        'resumes',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt',
        '00000000-0000-0000-0000-0000000000a1',
        '{"size":4,"mimetype":"text/plain"}'::jsonb
      )
    $$,
    '42501'
  ),
  'expired reservations cannot authorize a new Storage INSERT'
);

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt',
      4,
      'text/plain'
    )
  $$,
  'an exact retry renews an expired reservation that is still charged'
);

reset role;
select ok(
  (
    select expires_at > clock_timestamp()
    from private.resume_upload_intents
    where resume_id = '40000000-0000-0000-0000-000000000005'
  ),
  'renewing a reservation extends its Storage authorization window'
);

update private.resume_upload_intents
set expires_at = clock_timestamp() - interval '1 second'
where resume_id = '40000000-0000-0000-0000-000000000005';
update private.resume_storage_quota_config
set max_objects_per_user = 2;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.reserve_resume_upload(
        '40000000-0000-0000-0000-000000000006',
        '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/over-cap.txt',
        1,
        'text/plain'
      )
    $$,
    'P0001'
  ),
  'expired upload authorizations remain charged against the hard object cap'
);

reset role;
update private.resume_storage_quota_config
set max_objects_per_user = 50;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt'
  ),
  false,
  'cancellation immediately queues release while keeping the allocation charged'
);

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt',
      4,
      'text/plain'
    )
  $$,
  'an exact retry clears cancellation and renews without double charging'
);

reset role;
select ok(
  (
    select cancel_requested_at is null
      and release_after is null
      and expires_at > clock_timestamp()
    from private.resume_upload_intents
    where resume_id = '40000000-0000-0000-0000-000000000005'
  ),
  'exact retry restores one active authorization allocation'
);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt'
  ),
  false,
  'a renewed allocation can be queued for cancellation again'
);

reset role;
update private.resume_upload_intents
set
  cancel_requested_at = clock_timestamp() - interval '25 hours',
  release_after = clock_timestamp() - interval '1 hour'
where resume_id = '40000000-0000-0000-0000-000000000005';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000005/expired.txt'
  ),
  true,
  'a later cancellation call releases an aged allocation after fresh absence verification'
);

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt',
      3,
      'text/plain'
    )
  $$,
  'an object-backed cancellation test can reserve capacity'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'resumes',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt',
      '00000000-0000-0000-0000-0000000000a1',
      '{"size":3,"mimetype":"text/plain"}'::jsonb
    )
  $$,
  'the cancellation test object can land under its reservation'
);

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt'
  ),
  false,
  'a landed object keeps its cancelled allocation charged'
);

reset role;
update private.resume_upload_intents
set
  cancel_requested_at = clock_timestamp() - interval '25 hours',
  release_after = clock_timestamp() - interval '1 hour'
where resume_id = '40000000-0000-0000-0000-000000000006';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt'
  ),
  false,
  'an aged cancellation still cannot release quota while its object exists'
);

delete from storage.objects
where bucket_id = 'resumes'
  and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt';

select is(
  public.cancel_resume_upload(
    '40000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000006/cancel.txt'
  ),
  true,
  'a later call releases aged quota only after fresh object absence'
);

delete from storage.objects
where bucket_id = 'resumes'
  and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt';

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'resumes'
      and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt'
  ),
  1::bigint,
  'resume metadata protects the immutable storage object from deletion'
);

delete from public.resumes
where id = '40000000-0000-0000-0000-000000000001';

select lives_ok(
  $$
    select public.restore_resume_metadata_after_failed_delete(
      '40000000-0000-0000-0000-000000000001',
      'Unsubmitted Resume',
      'test.txt',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt',
      'text/plain',
      4,
      repeat('a', 64),
      null,
      null,
      clock_timestamp(),
      clock_timestamp()
    )
  $$,
  'failed Storage deletion can restore only exact object-backed metadata'
);

delete from public.resumes
where id = '40000000-0000-0000-0000-000000000001';
delete from storage.objects
where bucket_id = 'resumes'
  and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt';

select is(
  (
    select count(*)
    from storage.objects
    where bucket_id = 'resumes'
      and name = '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000001/test.txt'
  ),
  0::bigint,
  'unreferenced object can be removed after deleting its metadata row'
);

select lives_ok(
  $$
    select public.reserve_resume_upload(
      '40000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000002/submitted.txt',
      8,
      'text/plain'
    )
  $$,
  'a submitted resume upload can be reserved'
);

select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner_id, metadata)
    values (
      'resumes',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000002/submitted.txt',
      '00000000-0000-0000-0000-0000000000a1',
      '{"size":8,"mimetype":"text/plain"}'::jsonb
    )
  $$,
  'a submitted resume object can land under its reservation'
);

select lives_ok(
  $$
    select public.finalize_resume_upload(
      '40000000-0000-0000-0000-000000000002',
      'Submitted Resume',
      'submitted.txt',
      '00000000-0000-0000-0000-0000000000a1/40000000-0000-0000-0000-000000000002/submitted.txt',
      'text/plain',
      8,
      repeat('b', 64),
      null
    )
  $$,
  'a submitted resume upload can be finalized'
);

update public.applications
set submitted_resume_id = '40000000-0000-0000-0000-000000000002'
where id = '10000000-0000-0000-0000-000000000001';

select ok(
  pg_temp.throws_sqlstate(
    $$
      delete from public.resumes
      where id = '40000000-0000-0000-0000-000000000002'
    $$,
    '23503'
  ),
  'a submitted resume metadata row is protected by its application FK'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        '10000000-0000-0000-0000-000000000001',
        'job_extraction',
        'openai',
        'test-model',
        repeat('9', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    '42501'
  ),
  'AI admission fails closed before the server capability is configured'
);

reset role;
select lives_ok(
  $$select private.configure_ai_rpc_secret(repeat('s', 40))$$,
  'the database owner can configure the AI RPC capability'
);
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        '10000000-0000-0000-0000-000000000001',
        'job_extraction',
        'openai',
        'test-model',
        repeat('9', 64),
        'job-extraction-test-v1',
        repeat('x', 40)
      )
    $$,
    '42501'
  ),
  'AI admission rejects a browser caller without the server capability'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      insert into public.ai_runs (
        operation,
        provider,
        model,
        input_hash,
        prompt_version
      ) values (
        'job_extraction',
        'openai',
        'test-model',
        repeat('a', 64),
        'test-v1'
      )
    $$,
    '42501'
  ),
  'authenticated clients cannot insert AI audit rows directly'
);

select lives_ok(
  $$
    select public.begin_ai_run(
      '10000000-0000-0000-0000-000000000001',
      'job_extraction',
      'openai',
      'test-model',
      repeat('c', 64),
      'job-extraction-test-v1',
      repeat('s', 40)
    )
  $$,
  'begin_ai_run creates a validated pending record'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        '10000000-0000-0000-0000-000000000001',
        'job_extraction',
        'openai',
        'test-model',
        repeat('c', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'an identical pending AI input cannot be admitted twice'
);

select is(
  (
    select count(*)
    from public.ai_runs
    where input_hash = repeat('c', 64)
  ),
  1::bigint,
  'duplicate AI admission leaves the ledger unchanged'
);

reset role;
update private.ai_quota_config
set per_user_concurrent_limit = 1;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        '10000000-0000-0000-0000-000000000001',
        'job_extraction',
        'openai',
        'test-model',
        repeat('e', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'AI admission enforces the per-user concurrent-run limit'
);

reset role;
update private.ai_quota_config
set per_user_concurrent_limit = 2;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

insert into test_state (ai_run_id)
select id
from public.ai_runs
where input_hash = repeat('c', 64);

select is(
  (
    select count(*)
    from public.ai_runs
    where status = 'pending'
      and input_hash = repeat('c', 64)
  ),
  1::bigint,
  'owner can read its pending AI run'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select is(
  (select count(*) from public.ai_runs),
  0::bigint,
  'another tenant cannot read AI runs'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.complete_ai_run(
        (select ai_run_id from test_state limit 1),
        'failed',
        repeat('s', 40),
        null,
        'not mine',
        null,
        null
      )
    $$,
    'P0002'
  ),
  'another tenant cannot complete an AI run'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        '10000000-0000-0000-0000-000000000001',
        'job_extraction',
        'openai',
        'test-model',
        repeat('d', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    '23503'
  ),
  'begin_ai_run validates application ownership'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$
    select public.complete_ai_run(
        (select ai_run_id from test_state limit 1),
        'succeeded',
        repeat('s', 40),
        '{"summary":"validated"}'::jsonb,
      null,
      10,
      5
    )
  $$,
  'owner can complete a pending AI run'
);

select is(
  (
    select status::text
    from public.ai_runs
    where id = (select ai_run_id from test_state limit 1)
  ),
  'succeeded',
  'completed AI run stores its terminal status'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.complete_ai_run(
        (select ai_run_id from test_state limit 1),
        'failed',
        repeat('s', 40),
        null,
        'late failure',
        null,
        null
      )
    $$,
    '23514'
  ),
  'an AI run cannot be completed twice'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      update public.ai_runs
      set input_tokens = 999999
      where id = (select ai_run_id from test_state limit 1)
    $$,
    '42501'
  ),
  'authenticated clients cannot update AI audit rows directly'
);

reset role;
update private.ai_quota_config
set
  per_user_window_limit = 1,
  per_user_daily_limit = 100,
  global_daily_limit = 100;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        null,
        'job_extraction',
        'openai',
        'test-model',
        repeat('f', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'AI admission enforces the per-user rolling-window rate limit'
);

reset role;
update private.ai_quota_config
set
  per_user_window_limit = 100,
  per_user_daily_limit = 1,
  global_daily_limit = 100;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        null,
        'job_extraction',
        'openai',
        'test-model',
        repeat('f', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'AI admission enforces the per-user UTC-day limit'
);

reset role;
update private.ai_quota_config
set
  per_user_window_limit = 100,
  per_user_daily_limit = 100,
  global_daily_limit = 1;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        null,
        'job_extraction',
        'openai',
        'test-model',
        repeat('f', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'AI admission enforces the shared UTC-day ceiling across tenants'
);

reset role;
update private.ai_quota_config
set
  per_user_window_limit = 6,
  window_seconds = 600,
  per_user_daily_limit = 30,
  per_user_concurrent_limit = 2,
  global_daily_limit = 300,
  stale_pending_seconds = 300;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$
    select public.begin_ai_run(
      null,
      'job_extraction',
      'openai',
      'test-model',
      repeat('e', 64),
      'job-extraction-test-v1',
      repeat('s', 40)
    )
  $$,
  'a pending run can be created for stale-lease recovery testing'
);

reset role;
update public.ai_runs
set created_at = clock_timestamp() - interval '6 minutes'
where user_id = '00000000-0000-0000-0000-0000000000a1'
  and input_hash = repeat('e', 64)
  and status = 'pending';
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select lives_ok(
  $$
    select public.begin_ai_run(
      null,
      'job_extraction',
      'openai',
      'test-model',
      repeat('e', 64),
      'job-extraction-test-v1',
      repeat('s', 40)
    )
  $$,
  'a stale pending run is failed before an identical retry is admitted'
);

select is(
  (
    select string_agg(status::text, ',' order by created_at)
    from public.ai_runs
    where input_hash = repeat('e', 64)
  ),
  'failed,pending',
  'stale recovery preserves the failed ledger entry and one live retry'
);

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.complete_ai_run(
        (
          select id
          from public.ai_runs
          where input_hash = repeat('e', 64)
            and status = 'failed'
          limit 1
        ),
        'succeeded',
        repeat('s', 40),
        '{"summary":"too late"}'::jsonb,
        null,
        1,
        1
      )
    $$,
    '23514'
  ),
  'a late completion cannot overwrite an expired AI run'
);

reset role;
update private.ai_quota_config
set per_user_window_limit = 3;
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

select ok(
  pg_temp.throws_sqlstate(
    $$
      select public.begin_ai_run(
        null,
        'job_extraction',
        'openai',
        'test-model',
        repeat('1', 64),
        'job-extraction-test-v1',
        repeat('s', 40)
      )
    $$,
    'P0001'
  ),
  'failed starts continue to consume the rolling admission quota'
);

select * from finish();
rollback;
