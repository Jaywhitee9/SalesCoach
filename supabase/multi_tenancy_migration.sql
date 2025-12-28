-- MULTI-TENANCY MIGRATION SCRIPT
-- RUN THIS IN SQL EDITOR

-- 1. Create Organizations Table
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  plan text check (plan in ('free', 'pro', 'enterprise')) default 'free'
);

-- Enable RLS for Organizations
alter table public.organizations enable row level security;

-- 2. Seed Default Organization
-- We do this in a DO block to capture the ID and use it immediately
do $$
declare
  default_org_id uuid;
begin
  -- Insert default org if not exists
  if not exists (select 1 from public.organizations where name = 'Default Organization') then
    insert into public.organizations (name, plan)
    values ('Default Organization', 'free')
    returning id into default_org_id;
  else
    select id into default_org_id from public.organizations where name = 'Default Organization';
  end if;

  -- 3. Add org_id to Tables (Nullable first)
  -- Profiles
  alter table public.profiles add column if not exists org_id uuid references public.organizations(id);
  -- Leads
  alter table public.leads add column if not exists org_id uuid references public.organizations(id);
  -- Calls
  alter table public.calls add column if not exists org_id uuid references public.organizations(id);
  -- Tasks
  alter table public.tasks add column if not exists org_id uuid references public.organizations(id);

  -- 4. Backfill Data
  update public.profiles set org_id = default_org_id where org_id is null;
  update public.leads set org_id = default_org_id where org_id is null;
  update public.calls set org_id = default_org_id where org_id is null;
  update public.tasks set org_id = default_org_id where org_id is null;
  
  -- 5. Enforce Constraints (NOT NULL)
  alter table public.profiles alter column org_id set not null;
  alter table public.leads alter column org_id set not null;
  alter table public.calls alter column org_id set not null;
  alter table public.tasks alter column org_id set not null;

end $$;

-- 6. Add Indexes for Performance
create index if not exists idx_profiles_org_id on public.profiles(org_id);
create index if not exists idx_leads_org_id on public.leads(org_id);
create index if not exists idx_calls_org_id on public.calls(org_id);
create index if not exists idx_tasks_org_id on public.tasks(org_id);

-- 7. Update Profiles Role Check
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('rep', 'manager', 'platform_admin'));

-- 8. Hardened Security Functions
-- Helper to get auth user's org_id securely
create or replace function get_auth_org_id()
returns uuid
language sql security definer
set search_path = public
stable
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- Helper to check if auth user is platform admin
create or replace function is_platform_admin()
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'platform_admin'
  );
$$;

-- 9. Triggers for Org ID Enforcement
-- Function to set org_id automatically
create or replace function set_org_id()
returns trigger
language plpgsql security definer
as $$
begin
  -- Platform admins can set org_id manually, others get forced to their own org
  if not is_platform_admin() then
    new.org_id := get_auth_org_id();
  end if;
  return new;
end;
$$;

-- Create Triggers
drop trigger if exists set_leads_org_id on public.leads;
create trigger set_leads_org_id
  before insert on public.leads
  for each row execute function set_org_id();

drop trigger if exists set_calls_org_id on public.calls;
create trigger set_calls_org_id
  before insert on public.calls
  for each row execute function set_org_id();

drop trigger if exists set_tasks_org_id on public.tasks;
create trigger set_tasks_org_id
  before insert on public.tasks
  for each row execute function set_org_id();

-- 10. RLS Policies (Drop Old, Create New)

-- PROFILES
drop policy if exists "Users can see own profile" on public.profiles;
drop policy if exists "Managers can see all profiles" on public.profiles;

create policy "Users see own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Org members can see profiles" on public.profiles
  for select using (org_id = get_auth_org_id());

create policy "Platform Admins see all profiles" on public.profiles
  for select using (is_platform_admin());

create policy "Platform Admins manage profiles" on public.profiles
  for all using (is_platform_admin());

-- ORGANIZATIONS
create policy "Users see own org" on public.organizations
  for select using (id = get_auth_org_id());

create policy "Platform Admins manage orgs" on public.organizations
  for all using (is_platform_admin());

-- LEADS
drop policy if exists "Reps see own leads" on public.leads;
drop policy if exists "Managers see all leads" on public.leads;
drop policy if exists "Enable insert for authenticated users" on public.leads;
drop policy if exists "Enable update for owners" on public.leads;
drop policy if exists "Enable delete for users based on owner_id" on public.leads;

create policy "Access Own Org Leads" on public.leads
  for all using (org_id = get_auth_org_id() or is_platform_admin());

-- CALLS
drop policy if exists "Users see own calls" on public.calls;
drop policy if exists "Managers see all calls" on public.calls;

create policy "Access Own Org Calls" on public.calls
  for all using (org_id = get_auth_org_id() or is_platform_admin());

-- TASKS
drop policy if exists "Users see own tasks" on public.tasks;
drop policy if exists "Managers see all tasks" on public.tasks;
drop policy if exists "Users can insert own tasks" on public.tasks;
drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Managers can update any task" on public.tasks;

create policy "Access Own Org Tasks" on public.tasks
  for all using (org_id = get_auth_org_id() or is_platform_admin());
