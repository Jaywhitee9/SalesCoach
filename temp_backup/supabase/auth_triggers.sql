-- ==========================================
-- AUTOMATION: Auth -> Profiles Trigger
-- ==========================================

-- 1. Create the Function
-- This function runs "inside" the database whenever a new user is created in Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    'rep' -- Default Role
  );
  RETURN new;
END;
$$;

-- 2. Create the Trigger
-- Binds the function to the 'auth.users' table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. (Optional) Backfill existing users who might miss a profile
-- Uncomment/Run this if you already created users manually and they can't login
-- INSERT INTO public.profiles (id, email, full_name, role)
-- SELECT id, email, email, 'rep' FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles);
