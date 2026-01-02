-- 1. Modify Profiles to have Organization ID (UUID)
-- If column exists as text, this might fail, so we assume it works or is new.
-- The error "invalid input syntax for type uuid" suggests the column expects UUID.
alter table public.profiles 
add column if not exists organization_id uuid;

-- 2. Modify Leads to have Organization ID (UUID)
alter table public.leads 
add column if not exists organization_id uuid;

-- 3. Trigger to Auto-Assign Org ID
create or replace function public.set_lead_org()
returns trigger as $$
begin
  select organization_id into new.organization_id
  from public.profiles
  where id = new.owner_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_lead_created on public.leads;
create trigger on_lead_created
  before insert on public.leads
  for each row execute procedure public.set_lead_org();

-- 4. RLS Policies (Updated for UUID)

-- Leads
drop policy if exists "Managers see all leads" on public.leads;
drop policy if exists "Reps see own leads" on public.leads;
drop policy if exists "Managers see org leads" on public.leads;

create policy "Reps see own leads" on public.leads
  for select using (auth.uid() = owner_id);

create policy "Managers see org leads" on public.leads
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() 
      and role = 'manager'
      and organization_id = leads.organization_id
    )
  );

-- Profiles
drop policy if exists "Managers can see all profiles" on public.profiles;
drop policy if exists "Managers see org profiles" on public.profiles;

create policy "Managers see org profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles as mine
      where mine.id = auth.uid() 
      and mine.role = 'manager'
      and mine.organization_id = public.profiles.organization_id
    )
  );

-- 5. Seed Data with a Valid UUID
-- We use a DO block to generate a deterministic UUID for the "Default Center"
-- or just update nulls with a new UUID.

DO $$
DECLARE
  default_center_id uuid := '11111111-1111-1111-1111-111111111111'; -- Easy to identify ID
BEGIN
  -- Update profiles with no org to default
  update public.profiles 
  set organization_id = default_center_id 
  where organization_id is null;

  -- Update leads with no org to default
  update public.leads 
  set organization_id = default_center_id 
  where organization_id is null;
END $$;
