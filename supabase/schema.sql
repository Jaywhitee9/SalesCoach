-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS (Profiles)
-- This table mirrors the Supabase Auth User for application-specific data.
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text check (role in ('rep', 'manager')) default 'rep',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: Users can read their own profile.
create policy "Users can see own profile" on public.profiles
  for select using (auth.uid() = id);

-- Policy: Managers can see all profiles.
create policy "Managers can see all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- 2. LEADS
create table public.leads (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references public.profiles(id) not null,
  
  -- Lead Details
  name text not null,
  company text,
  phone text,
  email text,
  status text default 'New', -- New, Discovery, Negotiation, POC, Closed
  priority text default 'Warm',
  value decimal(12,2),
  tags text[], -- Array of strings
  source text,
  
  -- CRM Metadata
  crm_id text, -- If synced from Salesforce/HubSpot
  last_activity_at timestamp with time zone
);

-- Enable RLS
alter table public.leads enable row level security;

-- Policy: Reps see leads they own.
create policy "Reps see own leads" on public.leads
  for select using (auth.uid() = owner_id);

-- Policy: Managers see all leads.
create policy "Managers see all leads" on public.leads
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- 3. CALLS
create table public.calls (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Relations
  agent_id uuid references public.profiles(id) not null,
  lead_id uuid references public.leads(id),
  
  -- Call Metadata
  direction text check (direction in ('inbound', 'outbound')),
  status text, -- completed, missed, failed
  duration integer, -- in seconds
  
  -- Storage Link (The "Key" to the Audio File)
  recording_url text, -- Supabase Storage URL
  
  -- Full Transcript (JSON)
  -- Structure: [{ "speaker": "agent", "text": "Hello", "timestamp": 123 }]
  transcript jsonb default '[]'::jsonb
);

-- Enable RLS
alter table public.calls enable row level security;

-- Policy: Users see their own calls
create policy "Users see own calls" on public.calls
  for select using (auth.uid() = agent_id);

-- Policy: Managers see all calls
create policy "Managers see all calls" on public.calls
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- 4. CALL SUMMARIES (AI Analysis)
create table public.call_summaries (
  id uuid default uuid_generate_v4() primary key,
  call_id uuid references public.calls(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- AI Output
  summary_text text,
  key_points text[],
  sentiment text, -- positive, neutral, negative
  score integer, -- 0-100
  
  -- Structured Feedback
  successful BOOLEAN,
  ai_feedback jsonb -- Detailed coaching tips
);

-- Enable RLS (Inherits from Call visibility effectively, but we define generic)
alter table public.call_summaries enable row level security;

create policy "Users see own summaries" on public.call_summaries
  for select using (
    exists (
      select 1 from public.calls
      where calls.id = call_summaries.call_id
      and calls.agent_id = auth.uid()
    )
  );

create policy "Managers see all summaries" on public.call_summaries
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- 5. STORAGE BUCKET POLICIES (Pseudo-code, configured in Storage UI usually)
-- Bucket: 'recordings'
-- Policy: GIVE select TO authenticated USING (bucket_id = 'recordings');
-- Policy: GIVE insert TO authenticated USING (bucket_id = 'recordings');
