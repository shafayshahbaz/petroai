
-- nozzle_men
CREATE TABLE public.nozzle_men (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nozzle_men TO authenticated;
GRANT ALL ON public.nozzle_men TO service_role;
ALTER TABLE public.nozzle_men ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nozzle_men_select_own" ON public.nozzle_men FOR SELECT TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "nozzle_men_insert_own" ON public.nozzle_men FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "nozzle_men_update_own" ON public.nozzle_men FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin())
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "nozzle_men_delete_own" ON public.nozzle_men FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

CREATE TRIGGER trg_nozzle_men_updated BEFORE UPDATE ON public.nozzle_men
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- person_entries
CREATE TABLE public.person_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  nozzle_man_id UUID REFERENCES public.nozzle_men(id) ON DELETE SET NULL,
  nozzle_man_name TEXT NOT NULL,
  nozzle_id UUID REFERENCES public.nozzles(id) ON DELETE SET NULL,
  nozzle_label TEXT NOT NULL,
  product TEXT NOT NULL,
  opening_reading NUMERIC NOT NULL DEFAULT 0,
  closing_reading NUMERIC NOT NULL DEFAULT 0,
  liters_sold NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  expenses JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  net_payable NUMERIC NOT NULL DEFAULT 0,
  denominations JSONB NOT NULL DEFAULT '{}'::JSONB,
  total_cash NUMERIC NOT NULL DEFAULT 0,
  upi_received NUMERIC NOT NULL DEFAULT 0,
  total_collected NUMERIC NOT NULL DEFAULT 0,
  difference NUMERIC NOT NULL DEFAULT 0,
  deposited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_person_entries_client_date ON public.person_entries(client_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.person_entries TO authenticated;
GRANT ALL ON public.person_entries TO service_role;
ALTER TABLE public.person_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "person_entries_select_own" ON public.person_entries FOR SELECT TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "person_entries_insert_own" ON public.person_entries FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "person_entries_update_own" ON public.person_entries FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin())
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "person_entries_delete_own" ON public.person_entries FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

CREATE TRIGGER trg_person_entries_updated BEFORE UPDATE ON public.person_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- fuel_rates_daily
CREATE TABLE public.fuel_rates_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  product TEXT NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, rate_date, product)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fuel_rates_daily TO authenticated;
GRANT ALL ON public.fuel_rates_daily TO service_role;
ALTER TABLE public.fuel_rates_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fuel_rates_select_own" ON public.fuel_rates_daily FOR SELECT TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "fuel_rates_insert_own" ON public.fuel_rates_daily FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "fuel_rates_update_own" ON public.fuel_rates_daily FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin())
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());
CREATE POLICY "fuel_rates_delete_own" ON public.fuel_rates_daily FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

CREATE TRIGGER trg_fuel_rates_updated BEFORE UPDATE ON public.fuel_rates_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
