-- Opt-in demo data for local development.
--
-- Automatic seeding is disabled in config.toml. To seed a specific existing
-- Auth user, run both commands in the same psql session, for example:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -c "set job_crm.demo_user_id = '00000000-0000-0000-0000-000000000000'" \
--     -f supabase/seed.sql
--
-- Running this file without job_crm.demo_user_id is a safe no-op. The script is
-- idempotent: demo applications are identified by example.invalid job URLs.

do $demo_seed$
declare
  demo_user_setting text := nullif(
    current_setting('job_crm.demo_user_id', true),
    ''
  );
  demo_user_id uuid;

  linkedin_source_id uuid;
  indeed_source_id uuid;
  recruiter_source_id uuid;
  referral_source_id uuid;

  careers_channel_id uuid;
  easy_apply_channel_id uuid;
  recruiter_channel_id uuid;
  referral_channel_id uuid;

  applied_stage_id uuid;
  screening_stage_id uuid;
  assessment_stage_id uuid;
  technical_stage_id uuid;
  final_stage_id uuid;
  offer_stage_id uuid;
  accepted_stage_id uuid;
  rejected_stage_id uuid;
  withdrawn_stage_id uuid;

  company_id uuid;
  application_id uuid;
begin
  if demo_user_setting is null then
    raise notice 'Demo seed skipped: set job_crm.demo_user_id to an existing Auth user UUID.';
    return;
  end if;

  demo_user_id := demo_user_setting::uuid;

  if not exists (select 1 from auth.users where id = demo_user_id) then
    raise exception 'Demo seed user % does not exist in auth.users.', demo_user_id;
  end if;

  -- Make auth.uid() resolve to the selected user for ownership-validating RPCs.
  perform set_config('request.jwt.claim.sub', demo_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', demo_user_id, 'role', 'authenticated')::text,
    true
  );

  select id into linkedin_source_id
  from public.application_sources
  where user_id = demo_user_id and name = 'LinkedIn';
  select id into indeed_source_id
  from public.application_sources
  where user_id = demo_user_id and name = 'Indeed';
  select id into recruiter_source_id
  from public.application_sources
  where user_id = demo_user_id and name = 'Recruiter Outreach';
  select id into referral_source_id
  from public.application_sources
  where user_id = demo_user_id and name = 'Referral';

  select id into careers_channel_id
  from public.application_channels
  where user_id = demo_user_id and name = 'Company Careers Page';
  select id into easy_apply_channel_id
  from public.application_channels
  where user_id = demo_user_id and name = 'LinkedIn Easy Apply';
  select id into recruiter_channel_id
  from public.application_channels
  where user_id = demo_user_id and name = 'Recruiter';
  select id into referral_channel_id
  from public.application_channels
  where user_id = demo_user_id and name = 'Referral';

  select id into applied_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Applied';
  select id into screening_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Screening';
  select id into assessment_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Technical Assessment';
  select id into technical_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Technical Interview';
  select id into final_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Final Interview';
  select id into offer_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Offer';
  select id into accepted_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Accepted';
  select id into rejected_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Rejected';
  select id into withdrawn_stage_id
  from public.pipeline_stages
  where user_id = demo_user_id and name = 'Withdrawn';

  if linkedin_source_id is null
    or indeed_source_id is null
    or recruiter_source_id is null
    or referral_source_id is null
    or careers_channel_id is null
    or easy_apply_channel_id is null
    or recruiter_channel_id is null
    or referral_channel_id is null
    or applied_stage_id is null
    or screening_stage_id is null
    or assessment_stage_id is null
    or technical_stage_id is null
    or final_stage_id is null
    or offer_stage_id is null
    or accepted_stage_id is null
    or rejected_stage_id is null
    or withdrawn_stage_id is null
  then
    raise exception 'Default lookup rows are missing for demo user %.', demo_user_id;
  end if;

  -- Acme: Applied -> Screening -> Technical Interview -> Rejected
  insert into public.companies (user_id, name, website, industry, location)
  values (
    demo_user_id,
    'Acme',
    'https://example.invalid/acme',
    'Software',
    'Remote'
  )
  on conflict do nothing;
  select id into company_id from public.companies
  where user_id = demo_user_id and lower(btrim(name)) = 'acme';

  select id into application_id from public.applications
  where user_id = demo_user_id
    and job_url = 'https://example.invalid/job-crm-demo/acme-backend';
  if application_id is null then
    insert into public.applications (
      user_id,
      company_id,
      job_title,
      job_url,
      discovery_source_id,
      application_channel_id,
      location,
      work_mode,
      employment_type,
      applied_at,
      current_stage_id,
      raw_job_description
    ) values (
      demo_user_id,
      company_id,
      'Backend Engineer',
      'https://example.invalid/job-crm-demo/acme-backend',
      linkedin_source_id,
      careers_channel_id,
      'Remote',
      'remote',
      'full-time',
      now() - interval '60 days',
      applied_stage_id,
      'Build reliable TypeScript and PostgreSQL services for a growing product.'
    ) returning id into application_id;

    perform public.transition_application_stage(
      application_id,
      screening_stage_id,
      now() - interval '56 days',
      'Recruiter screen scheduled.'
    );
    perform public.transition_application_stage(
      application_id,
      technical_stage_id,
      now() - interval '50 days',
      'Technical interview completed.'
    );
    perform public.transition_application_stage(
      application_id,
      rejected_stage_id,
      now() - interval '45 days',
      'Position closed after interview.'
    );
  end if;

  -- Globex: Applied -> Rejected
  insert into public.companies (user_id, name, industry, location)
  values (demo_user_id, 'Globex', 'Technology', 'New York, NY')
  on conflict do nothing;
  select id into company_id from public.companies
  where user_id = demo_user_id and lower(btrim(name)) = 'globex';

  select id into application_id from public.applications
  where user_id = demo_user_id
    and job_url = 'https://example.invalid/job-crm-demo/globex-full-stack';
  if application_id is null then
    insert into public.applications (
      user_id, company_id, job_title, job_url, discovery_source_id,
      application_channel_id, location, work_mode, employment_type,
      applied_at, current_stage_id, raw_job_description
    ) values (
      demo_user_id, company_id, 'Full Stack Engineer',
      'https://example.invalid/job-crm-demo/globex-full-stack',
      indeed_source_id, easy_apply_channel_id, 'New York, NY', 'hybrid',
      'full-time', now() - interval '42 days', applied_stage_id,
      'Develop accessible React interfaces and TypeScript API services.'
    ) returning id into application_id;

    perform public.transition_application_stage(
      application_id,
      rejected_stage_id,
      now() - interval '39 days',
      'Automated rejection received.'
    );
  end if;

  -- Umbrella: a complete successful progression.
  insert into public.companies (user_id, name, industry, location)
  values (demo_user_id, 'Umbrella', 'Healthcare Technology', 'Remote')
  on conflict do nothing;
  select id into company_id from public.companies
  where user_id = demo_user_id and lower(btrim(name)) = 'umbrella';

  select id into application_id from public.applications
  where user_id = demo_user_id
    and job_url = 'https://example.invalid/job-crm-demo/umbrella-node';
  if application_id is null then
    insert into public.applications (
      user_id, company_id, job_title, job_url, discovery_source_id,
      application_channel_id, location, work_mode, employment_type,
      applied_at, current_stage_id, raw_job_description
    ) values (
      demo_user_id, company_id, 'Node.js Developer',
      'https://example.invalid/job-crm-demo/umbrella-node',
      referral_source_id, referral_channel_id, 'Remote', 'remote',
      'full-time', now() - interval '90 days', applied_stage_id,
      'Own Node.js services, queues, PostgreSQL data, and cloud deployments.'
    ) returning id into application_id;

    perform public.transition_application_stage(application_id, screening_stage_id, now() - interval '86 days', null);
    perform public.transition_application_stage(application_id, assessment_stage_id, now() - interval '80 days', null);
    perform public.transition_application_stage(application_id, technical_stage_id, now() - interval '74 days', null);
    perform public.transition_application_stage(application_id, final_stage_id, now() - interval '68 days', null);
    perform public.transition_application_stage(application_id, offer_stage_id, now() - interval '62 days', null);
    perform public.transition_application_stage(application_id, accepted_stage_id, now() - interval '60 days', 'Offer accepted.');
  end if;

  -- Initech: old Applied state intentionally exercises derived No Response.
  insert into public.companies (user_id, name, industry, location)
  values (demo_user_id, 'Initech', 'Business Software', 'Austin, TX')
  on conflict do nothing;
  select id into company_id from public.companies
  where user_id = demo_user_id and lower(btrim(name)) = 'initech';

  if not exists (
    select 1 from public.applications
    where user_id = demo_user_id
      and job_url = 'https://example.invalid/job-crm-demo/initech-software'
  ) then
    insert into public.applications (
      user_id, company_id, job_title, job_url, discovery_source_id,
      application_channel_id, location, work_mode, employment_type,
      applied_at, current_stage_id, raw_job_description
    ) values (
      demo_user_id, company_id, 'Software Engineer',
      'https://example.invalid/job-crm-demo/initech-software',
      linkedin_source_id, careers_channel_id, 'Austin, TX', 'onsite',
      'full-time', now() - interval '35 days', applied_stage_id,
      'Maintain internal business systems and improve operational workflows.'
    );
  end if;

  -- Stark Industries: Applied -> Screening -> Withdrawn
  insert into public.companies (user_id, name, industry, location)
  values (demo_user_id, 'Stark Industries', 'Advanced Technology', 'Los Angeles, CA')
  on conflict do nothing;
  select id into company_id from public.companies
  where user_id = demo_user_id and lower(btrim(name)) = 'stark industries';

  select id into application_id from public.applications
  where user_id = demo_user_id
    and job_url = 'https://example.invalid/job-crm-demo/stark-platform';
  if application_id is null then
    insert into public.applications (
      user_id, company_id, job_title, job_url, discovery_source_id,
      application_channel_id, location, work_mode, employment_type,
      applied_at, current_stage_id, raw_job_description
    ) values (
      demo_user_id, company_id, 'Platform Engineer',
      'https://example.invalid/job-crm-demo/stark-platform',
      recruiter_source_id, recruiter_channel_id, 'Los Angeles, CA', 'hybrid',
      'full-time', now() - interval '24 days', applied_stage_id,
      'Build deployment tooling, observability, and resilient cloud platforms.'
    ) returning id into application_id;

    perform public.transition_application_stage(application_id, screening_stage_id, now() - interval '21 days', null);
    perform public.transition_application_stage(application_id, withdrawn_stage_id, now() - interval '18 days', 'Withdrew after learning the role required relocation.');
  end if;

  raise notice 'Demo Job CRM records seeded for user %.', demo_user_id;
end;
$demo_seed$;
