
-- Fix: Ensure profiles and daily_entries SELECT policies are scoped to authenticated users only
-- This prevents anonymous (unauthenticated) users from querying these tables

-- Drop existing SELECT policies on profiles that don't restrict to authenticated role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

-- Recreate with explicit TO authenticated
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_super_admin());

-- Drop existing SELECT policies on daily_entries
DROP POLICY IF EXISTS "Users can view own entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Super admins can view all entries" ON public.daily_entries;

-- Recreate with explicit TO authenticated
CREATE POLICY "Users can view own entries"
  ON public.daily_entries FOR SELECT
  TO authenticated
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all entries"
  ON public.daily_entries FOR SELECT
  TO authenticated
  USING (public.is_super_admin());
