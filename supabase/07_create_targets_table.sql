-- Create User Targets Table
create table if not exists public.user_targets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  period text default 'day', -- 'day', 'week', 'month'
  
  -- Goals
  calls_goal integer default 40,
  new_leads_goal integer default 10,
  meetings_goal integer default 3,
  deals_goal integer default 1,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, period)
);

-- RLS
alter table public.user_targets enable row level security;

create policy "Users can see own targets" on public.user_targets
  for select using (auth.uid() = user_id);

create policy "Managers can see all targets" on public.user_targets
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- Seed default targets for existing reps (Optional helper)
insert into public.user_targets (user_id, period, calls_goal, new_leads_goal, meetings_goal, deals_goal)
select id, 'day', 40, 10, 3, 1 from public.profiles where role = 'rep'
on conflict (user_id, period) do nothing;
