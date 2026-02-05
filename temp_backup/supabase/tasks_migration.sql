-- 6. TASKS
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Relations
  owner_id uuid references public.profiles(id) not null,
  lead_id uuid references public.leads(id), -- Optional: Task might be general or linked to lead
  
  -- Task Details
  title text not null,
  type text check (type in ('call', 'email', 'proposal', 'whatsapp', 'admin', 'meeting', 'file')) default 'admin',
  status text check (status in ('open', 'completed', 'overdue')) default 'open',
  priority text check (priority in ('high', 'medium', 'low')) default 'medium',
  
  -- Timing
  due_date date,
  due_time time,
  
  -- AI / Notes
  ai_reason text,
  notes text
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Policy: Users see their own tasks
create policy "Users see own tasks" on public.tasks
  for select using (auth.uid() = owner_id);

-- Policy: Managers see all tasks
create policy "Managers see all tasks" on public.tasks
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );

-- Policy: Users can insert own tasks
create policy "Users can insert own tasks" on public.tasks
  for insert with check (auth.uid() = owner_id);

-- Policy: Users can update own tasks
create policy "Users can update own tasks" on public.tasks
  for update using (auth.uid() = owner_id);

-- Policy: Managers can update any task
create policy "Managers can update any task" on public.tasks
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'manager'
    )
  );
