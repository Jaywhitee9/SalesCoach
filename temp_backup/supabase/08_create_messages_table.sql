-- Force recreate to ensure schema is correct
drop table if exists public.messages cascade;

-- Create Messages Table
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  sender_id uuid references public.profiles(id) not null,
  recipient_id uuid references public.profiles(id), 
  
  content text not null,
  is_read boolean default false,
  
  -- Metadata
  context_type text, -- 'lead', 'call'
  context_id uuid
);

-- RLS
alter table public.messages enable row level security;

-- Users can see messages sent BY them or TO them
create policy "Users can see their own messages" on public.messages
  for select using (
    auth.uid() = sender_id or auth.uid() = recipient_id
  );

-- Users can insert messages where they are the sender
create policy "Users can send messages" on public.messages
  for insert with check (
    auth.uid() = sender_id
  );
