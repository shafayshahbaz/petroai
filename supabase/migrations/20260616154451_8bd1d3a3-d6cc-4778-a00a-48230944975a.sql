
-- Tighten clients table policies to authenticated role only
DROP POLICY IF EXISTS "Super admins can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Super admins can update clients" ON public.clients;

CREATE POLICY "Super admins can delete clients" ON public.clients
  FOR DELETE TO authenticated USING (is_super_admin());
CREATE POLICY "Super admins can insert clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "Super admins can update clients" ON public.clients
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Revoke anon access to clients
REVOKE ALL ON public.clients FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- Tighten ledger_transactions policies to authenticated role only
DROP POLICY IF EXISTS "Super admins can view all ledger transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Users can delete own ledger transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Users can insert own ledger transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Users can update own ledger transactions" ON public.ledger_transactions;
DROP POLICY IF EXISTS "Users can view own ledger transactions" ON public.ledger_transactions;

CREATE POLICY "Super admins can view all ledger transactions" ON public.ledger_transactions
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "Users can view own ledger transactions" ON public.ledger_transactions
  FOR SELECT TO authenticated USING (client_id = get_current_client_id());
CREATE POLICY "Users can insert own ledger transactions" ON public.ledger_transactions
  FOR INSERT TO authenticated WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "Users can update own ledger transactions" ON public.ledger_transactions
  FOR UPDATE TO authenticated USING (client_id = get_current_client_id()) WITH CHECK (client_id = get_current_client_id());
CREATE POLICY "Users can delete own ledger transactions" ON public.ledger_transactions
  FOR DELETE TO authenticated USING (client_id = get_current_client_id());

REVOKE ALL ON public.ledger_transactions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_transactions TO authenticated;
GRANT ALL ON public.ledger_transactions TO service_role;
