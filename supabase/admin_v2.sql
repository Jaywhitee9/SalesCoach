-- ADMIN V2 FEATURES MIGRATION

-- 1. Update Organizations Table
-- Add fields for Lifecycle Management & Billing
alter table public.organizations 
add column if not exists status text check (status in ('active', 'frozen', 'suspended')) default 'active',
add column if not exists subscription_status text check (subscription_status in ('active', 'past_due', 'canceled')) default 'active',
add column if not exists subscription_ends_at timestamptz,
add column if not exists credits_used numeric default 0,
add column if not exists credits_limit numeric default 1000;

-- 2. Create Analytics Helper Function
-- Returns a summary of usage & ROI for each organization
create or replace function get_org_analytics_summary()
returns table (
  org_id uuid,
  org_name text,
  total_users bigint,
  total_leads bigint,
  total_calls bigint,
  total_revenue numeric,
  leads_won bigint,
  avg_call_duration numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- access check: only platform_admin can run this
  if not is_platform_admin() then
    raise exception 'Access Denied';
  end if;

  return query
  select 
    o.id as org_id,
    o.name as org_name,
    (select count(*) from public.profiles p where p.org_id = o.id) as total_users,
    (select count(*) from public.leads l where l.org_id = o.id) as total_leads,
    (select count(*) from public.calls c where c.org_id = o.id) as total_calls,
    coalesce((select sum(cast(value as numeric)) from public.leads l where l.org_id = o.id and l.status = 'Closed'), 0) as total_revenue,
    (select count(*) from public.leads l where l.org_id = o.id and l.status = 'Closed') as leads_won,
    coalesce((select avg(c.duration) from public.calls c where c.org_id = o.id), 0) as avg_call_duration
  from public.organizations o
  order by total_revenue desc;
end;
$$;

-- 3. Update RLS on Organizations (Ensure Admins can UPDATE these new fields)
-- The previous policy "Platform Admins manage orgs" should cover it, but let's double check.
-- "Platform Admins manage orgs" defined as "for all using (is_platform_admin())" covers UPDATE.

-- 4. Index for Performance
create index if not exists idx_leads_status_value on public.leads(status, value);
