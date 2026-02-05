-- Create messages table for real-time history
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  call_id uuid references public.calls(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  role text not null check (role in ('agent', 'customer', 'system')),
  text text not null,
  is_final boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.messages enable row level security;

-- Policy: Allow authenticated users to view messages (can refine to owner later)
create policy "Users can view messages"
  on public.messages for select
  using (auth.uid() IS NOT NULL);

create policy "Users can insert messages"
  on public.messages for insert
  with check (auth.uid() IS NOT NULL);
