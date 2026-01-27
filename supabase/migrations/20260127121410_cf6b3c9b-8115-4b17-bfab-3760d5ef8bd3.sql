-- Create helper function to check if current user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Super admins bypass subscription check
    public.is_super_admin()
    OR
    -- Regular users must have active subscription
    EXISTS (
      SELECT 1
      FROM public.clients
      WHERE user_id = auth.uid()
        AND subscription_status = 'active'
        AND subscription_expiry_date > now()
    )
$$;

-- Update profiles table: require active subscription for updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.has_active_subscription());

-- Update clients table: require active subscription for self-updates
DROP POLICY IF EXISTS "Clients can update own data" ON public.clients;

CREATE POLICY "Clients can update own data" ON public.clients
FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND public.has_active_subscription())
WITH CHECK (auth.uid() = user_id AND public.has_active_subscription());