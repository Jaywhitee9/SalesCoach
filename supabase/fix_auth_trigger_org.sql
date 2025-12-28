-- FIX: Update Auth Trigger to assign 'Default Organization'
-- The previous trigger failed because 'org_id' is now required (NOT NULL).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  default_org_id uuid;
begin
  -- 1. Get the Default Org ID
  select id into default_org_id from public.organizations where name = 'Default Organization' limit 1;

  -- Fallback if not found (should not happen if migration ran)
  if default_org_id is null then
    raise exception 'Default Organization not found';
  end if;

  -- 2. Insert Profile with Org ID
  insert into public.profiles (id, email, full_name, avatar_url, role, org_id)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'rep', -- Default Role
    default_org_id -- Assign to Default Org
  );
  return new;
end;
$$;
