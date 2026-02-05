-- 06_fix_system_users.sql
-- Purpose: SYSTEM REPAIR. 
-- 1. Updates 'handle_new_user' trigger to support "Legacy Profile" migration (fixing 500 errors).
-- 2. Forces correct ROLES for all system users (fixing Dashboard access).
-- 3. Cleans up any data inconsistencies.

BEGIN;

-- =======================================================
-- PART 1: FIX THE TRIGGER (Solves 500 Error on Signup)
-- =======================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_org_id uuid;
  existing_profile_id uuid;
  existing_org_id uuid;
  existing_role text;
  existing_name text;
  existing_avatar text;
  final_role text;
  final_org_id uuid;
BEGIN
  -- Check for existing "Ghost" Profile (Account exists in public.profiles but not in auth.users)
  SELECT id, organization_id, role, full_name, avatar_url 
  INTO existing_profile_id, existing_org_id, existing_role, existing_name, existing_avatar
  FROM public.profiles 
  WHERE email = new.email 
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
     RAISE NOTICE 'Merging new user % with existing profile %', new.id, existing_profile_id;
     
     -- PREPARE NEW ATTRIBUTES (Inherit from Ghost)
     final_org_id := existing_org_id;
     if final_org_id IS NULL THEN
        SELECT id INTO final_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
     END IF;

     final_role := existing_role;
     -- Use existing name/avatar if available, else new meta
     IF existing_name IS NULL OR existing_name = '' THEN
        existing_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
     END IF;
     
     -- STEP 1: INSERT NEW PROFILE (CRITICAL: Must exist before re-linking FKs)
     INSERT INTO public.profiles (id, email, full_name, avatar_url, role, organization_id)
     VALUES (
        new.id, 
        new.email, 
        existing_name,
        coalesce(existing_avatar, ''),
        final_role,
        final_org_id
     );

     -- STEP 2: RE-LINK CHILD DATA (Tasks, Leads, Calls)
     -- Now that new profile exists, we can safely point FKs to it.
     UPDATE public.tasks SET owner_id = new.id WHERE owner_id = existing_profile_id;
     UPDATE public.leads SET owner_id = new.id WHERE owner_id = existing_profile_id;
     
     -- Check for calls table existence to be safe
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'agent_id') THEN
        UPDATE public.calls SET agent_id = new.id WHERE agent_id = existing_profile_id;
     END IF;

     -- STEP 3: DELETE GHOST PROFILE
     -- Now that it has no children, we can delete it.
     DELETE FROM public.profiles WHERE id = existing_profile_id;

  ELSE
     -- LOGIC B: NEW USER (Normal Signup)
     SELECT id INTO final_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
     final_role := 'rep';
     existing_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
     existing_avatar := coalesce(new.raw_user_meta_data->>'avatar_url', '');

     INSERT INTO public.profiles (id, email, full_name, avatar_url, role, organization_id)
     VALUES (
        new.id, 
        new.email, 
        existing_name,
        existing_avatar,
        final_role,
        final_org_id
     );
  END IF;
  
  return new;
END;
$$;

-- =======================================================
-- PART 2: FORCE CORRECT ROLES (Solves Dashboard Access)
-- =======================================================

-- 1. Sara / Rep -> SALES REP (rep)
UPDATE public.profiles
SET role = 'rep', 
    full_name = 'Sara Cohen',
    organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE email IN ('sara@salesflow.ai', 'rep@salesflow.ai');

-- 2. David / Manager -> MANAGER (manager)
UPDATE public.profiles
SET role = 'manager', 
    full_name = 'David Levi',
    organization_id = (SELECT id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE email IN ('manager@salesflow.ai', 'david@salesflow.ai');

-- 3. Super Admin -> PLATFORM ADMIN (platform_admin)
UPDATE public.profiles
SET role = 'platform_admin', 
    full_name = 'System Admin'
WHERE email IN ('admin@salesflow.ai', 'o@o.com');

-- 4. DOWNGRADE anyone else (Safety Net)
UPDATE public.profiles
SET role = 'rep'
WHERE role = 'platform_admin' 
  AND email NOT IN ('admin@salesflow.ai', 'o@o.com');

COMMIT;
