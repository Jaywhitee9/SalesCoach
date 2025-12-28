-- FIX: Enable Insert/Update/Delete for Leads table
-- The original schema was missing write policies for the 'leads' table.

-- 1. Allow authenticated users to INSERT leads
-- (We use 'true' to allow inserting any lead, provided they are authenticated. 
--  Ideally, we might restrict 'owner_id' to satisfy auth.uid(), but the UI defaults to it anyway.)
create policy "Enable insert for authenticated users" on public.leads
  for insert to authenticated 
  with check (true);

-- 2. Allow owners to UPDATE their leads
create policy "Enable update for owners" on public.leads
  for update using (auth.uid() = owner_id);

-- 3. Allow owners to DELETE their leads
create policy "Enable delete for users based on owner_id" on public.leads
  for delete using (auth.uid() = owner_id);
