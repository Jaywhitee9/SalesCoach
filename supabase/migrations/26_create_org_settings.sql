-- Create organization_settings table if it doesn't exist
create table if not exists public.organization_settings (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references public.organizations(id) not null unique,
  
  -- Interaction Settings
  calls_config jsonb default '{
    "transcription": true, 
    "aiInsights": true, 
    "language": "auto", 
    "aiModel": "standard", 
    "shortTips": false, 
    "coachingWeights": {"discovery": 70, "objections": 50, "closing": 85}
  }'::jsonb,
  
  -- Stages Configuration (Array of strings)
  stages_config jsonb default '["פתיחה והיכרות", "גילוי צרכים והבנת כאב", "הצגת חזון ופתרון", "טיפול בהתנגדויות", "הצעת מחיר וסגירה"]'::jsonb,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.organization_settings enable row level security;

-- Policies (Assuming managers can edit their org settings)
-- Note: usage of 'organizations' table implies it exists. If not, we might need adjustments.
-- Based on previous files, 'organizations' seems to be the tenant table.

-- VIEW POLICY
create policy "Managers can view settings" on public.organization_settings
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() 
      and role = 'manager'
      and organization_id = public.organization_settings.organization_id
    )
  );

-- UPDATE POLICY
create policy "Managers can update settings" on public.organization_settings
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() 
      and role = 'manager'
      and organization_id = public.organization_settings.organization_id
    )
  );

-- INSERT POLICY
create policy "Managers can insert settings" on public.organization_settings
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() 
      and role = 'manager'
      and organization_id = public.organization_settings.organization_id
    )
  );
