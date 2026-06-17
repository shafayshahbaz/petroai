
-- client_settings SELECT
DROP POLICY IF EXISTS "Users can view own settings" ON public.client_settings;
CREATE POLICY "Users can view own settings" ON public.client_settings
  FOR SELECT TO authenticated USING (client_id = public.get_current_client_id());
DROP POLICY IF EXISTS "Super admins can view all settings" ON public.client_settings;
CREATE POLICY "Super admins can view all settings" ON public.client_settings
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- debtors SELECT
DROP POLICY IF EXISTS "Users can view own debtors" ON public.debtors;
CREATE POLICY "Users can view own debtors" ON public.debtors
  FOR SELECT TO authenticated USING (client_id = public.get_current_client_id());
DROP POLICY IF EXISTS "Super admins can view all debtors" ON public.debtors;
CREATE POLICY "Super admins can view all debtors" ON public.debtors
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- nozzles SELECT
DROP POLICY IF EXISTS "Users can view own nozzles" ON public.nozzles;
CREATE POLICY "Users can view own nozzles" ON public.nozzles
  FOR SELECT TO authenticated USING (client_id = public.get_current_client_id());
DROP POLICY IF EXISTS "Super admins can view all nozzles" ON public.nozzles;
CREATE POLICY "Super admins can view all nozzles" ON public.nozzles
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- purchases SELECT
DROP POLICY IF EXISTS "Users can view own purchases" ON public.purchases;
CREATE POLICY "Users can view own purchases" ON public.purchases
  FOR SELECT TO authenticated USING (client_id = public.get_current_client_id());
DROP POLICY IF EXISTS "Super admins can view all purchases" ON public.purchases;
CREATE POLICY "Super admins can view all purchases" ON public.purchases
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- tanks SELECT
DROP POLICY IF EXISTS "Users can view own tanks" ON public.tanks;
CREATE POLICY "Users can view own tanks" ON public.tanks
  FOR SELECT TO authenticated USING (client_id = public.get_current_client_id());
DROP POLICY IF EXISTS "Super admins can view all tanks" ON public.tanks;
CREATE POLICY "Super admins can view all tanks" ON public.tanks
  FOR SELECT TO authenticated USING (public.is_super_admin());
