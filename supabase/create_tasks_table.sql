-- Reset Table (Optional - Remove if you have real data you want to keep)
drop table if exists public.tasks;

-- Create Tasks Table
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  owner_id uuid references public.profiles(id) not null,
  
  -- Task Details
  title text not null,
  lead_id uuid references public.leads(id), -- Optional link to lead
  due_date timestamp with time zone default timezone('utc'::text, now()),
  completed boolean default false
);

-- Enable RLS
alter table public.tasks enable row level security;

-- Policy: Users can see and manage their own tasks.
create policy "Users manage own tasks" on public.tasks
  for all using (auth.uid() = owner_id);

-- Seed some initial tasks for demo
insert into public.tasks (title, owner_id, lead_id, due_date, completed)
select 
  'הכנת הצעת מחיר', 
  (select id from public.profiles limit 1), 
  (select id from public.leads limit 1), 
  now() + interval '2 hours', 
  false;

insert into public.tasks (title, owner_id, lead_id, due_date, completed)
select 
  'שיחת מעקב בוואטסאפ', 
  (select id from public.profiles limit 1), 
  (select id from public.leads offset 1 limit 1), 
  now() + interval '4 hours', 
  false;
