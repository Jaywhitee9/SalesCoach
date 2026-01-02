-- 04_fix_demo_trigger.sql
-- Purpose: Fix 'handle_new_user' to handle "Ghost Profiles" (Pre-seeded profiles without Auth).
--          If a user signs up and a profile already exists with that email:
--          1. Migrate all Child Data (Tasks, Leads, Calls) from the Old Profile ID to the New Auth ID.
--          2. Inherit the Role and Organization from the Old Profile.
--          3. Delete the Old Profile.
--          4. Create the New Profile associated with the Auth User.

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
  -- 1. Check for existing "Ghost" Profile with same email
  SELECT id, organization_id, role, full_name, avatar_url 
  INTO existing_profile_id, existing_org_id, existing_role, existing_name, existing_avatar
  FROM public.profiles 
  WHERE email = new.email 
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
     -- LOGIC A: MIGRATION (Ghost Profile Found)
     RAISE NOTICE 'Merging new user % with existing profile %', new.id, existing_profile_id;
     
     -- 1. Re-link Child Data (Handle FK Constraints)
     -- Tasks
     UPDATE public.tasks SET owner_id = new.id WHERE owner_id = existing_profile_id;
     -- Leads
     UPDATE public.leads SET owner_id = new.id WHERE owner_id = existing_profile_id;
     -- Calls (agent_id)
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'agent_id') THEN
        UPDATE public.calls SET agent_id = new.id WHERE agent_id = existing_profile_id;
     END IF;
     -- Call Summaries (if they have owner/agent linkage, usually via call, but checking just in case)
     -- (Checking standard potential columns just to be safe, though unexpected)
     
     -- 2. Delete Ghost Profile (to allow new insert)
     DELETE FROM public.profiles WHERE id = existing_profile_id;
     
     -- 3. Preserve Attributes
     final_org_id := existing_org_id;
     final_role := existing_role;
     -- Use existing name/avatar if available, else new meta
     IF existing_name IS NULL OR existing_name = '' THEN
        existing_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
     END IF;
     
  ELSE
     -- LOGIC B: NEW USER (No Ghost Profile)
     -- Fetch Default Org Safe Fallback
     SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Default Organization' LIMIT 1;
     IF default_org_id IS NULL THEN
         RAISE EXCEPTION 'Default Organization missing. Cannot create new user.';
     END IF;
     
     final_org_id := default_org_id;
     final_role := 'rep'; -- Default role
     existing_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
     existing_avatar := coalesce(new.raw_user_meta_data->>'avatar_url', '');
  END IF;

  -- 4. Insert New Profile (Linked to Auth ID)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, organization_id)
  VALUES (
    new.id, 
    new.email, 
    existing_name,
    existing_avatar,
    final_role,
    final_org_id
  );
  
  return new;
END;
$$;
