
-- 1. Super admin write policies on bank_deposits
CREATE POLICY "Super admins can insert bank_deposits"
  ON public.bank_deposits FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can update bank_deposits"
  ON public.bank_deposits FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "Super admins can delete bank_deposits"
  ON public.bank_deposits FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 2. Super admin SELECT on dip_charts and daily_dip_readings
CREATE POLICY "Super admins can view all dip_charts"
  ON public.dip_charts FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Super admins can view all daily_dip_readings"
  ON public.daily_dip_readings FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- 3. Restrict platform_settings write policies to authenticated role
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_settings'
      AND cmd IN ('INSERT','UPDATE','DELETE')
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.platform_settings TO authenticated', pol.policyname);
  END LOOP;
END $$;
