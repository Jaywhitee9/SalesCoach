-- ADMIN V3: FINANCIAL INTELLIGENCE MIGRATION

-- 1. Add Financial Columns to Organizations
alter table public.organizations
add column if not exists mrr numeric default 0, -- Monthly Recurring Revenue (Price of Plan)
add column if not exists usage_cost numeric default 0; -- Actual cost incurred by us

-- 2. Update/Replace Analytics Function
drop function if exists get_org_analytics_summary();

create or replace function get_org_analytics_summary()
returns table (
  org_id uuid,
  org_name text,
  total_users bigint,
  total_leads bigint,
  total_calls bigint,
  client_revenue numeric, -- How much the CLIENT made (GMV)
  saas_revenue numeric,   -- How much WE made (MRR)
  est_cost numeric,       -- Our expenses
  leads_won bigint,
  avg_call_duration numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
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
    
    -- Client GMV (Sum of Closed Leads)
    coalesce((select sum(cast(value as numeric)) from public.leads l where l.org_id = o.id and l.status = 'Closed'), 0) as client_revenue,
    
    -- SaaS Revenue (Based on Plan or MRR field)
    case 
        when o.mrr > 0 then o.mrr
        when o.plan = 'enterprise' then 299 -- Default estimate
        when o.plan = 'pro' then 99
        else 0 
    end as saas_revenue,

    -- Estimated Cost (Calls * 0.05 + 10 base)
    (
      (select count(*) from public.calls c where c.org_id = o.id) * 0.05 + 
      10 
    ) as est_cost,

    (select count(*) from public.leads l where l.org_id = o.id and l.status = 'Closed') as leads_won,
    coalesce((select avg(c.duration) from public.calls c where c.org_id = o.id), 0) as avg_call_duration
  from public.organizations o
  order by client_revenue desc;
end;
$$;
