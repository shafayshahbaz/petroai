-- =====================================================
-- PETRO AI CLOUD DATABASE SCHEMA
-- Migrating from localStorage to Supabase Cloud
-- =====================================================

-- 1. TANKS TABLE
CREATE TABLE public.tanks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('MS', 'HSD', 'POWER')),
  capacity NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tanks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tanks
CREATE POLICY "Users can view own tanks"
  ON public.tanks FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own tanks"
  ON public.tanks FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own tanks"
  ON public.tanks FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can delete own tanks"
  ON public.tanks FOR DELETE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all tanks"
  ON public.tanks FOR SELECT
  USING (is_super_admin());

-- 2. NOZZLES TABLE
CREATE TABLE public.nozzles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('MS', 'HSD', 'POWER')),
  tank_id UUID REFERENCES public.tanks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nozzles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nozzles
CREATE POLICY "Users can view own nozzles"
  ON public.nozzles FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own nozzles"
  ON public.nozzles FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own nozzles"
  ON public.nozzles FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can delete own nozzles"
  ON public.nozzles FOR DELETE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all nozzles"
  ON public.nozzles FOR SELECT
  USING (is_super_admin());

-- 3. DEBTORS TABLE
CREATE TABLE public.debtors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_number TEXT,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  total_outstanding NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for debtors
CREATE POLICY "Users can view own debtors"
  ON public.debtors FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own debtors"
  ON public.debtors FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own debtors"
  ON public.debtors FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can delete own debtors"
  ON public.debtors FOR DELETE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all debtors"
  ON public.debtors FOR SELECT
  USING (is_super_admin());

-- 4. PURCHASES TABLE
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  supplier_name TEXT NOT NULL,
  total_invoice_value NUMERIC NOT NULL DEFAULT 0,
  chambers JSONB NOT NULL DEFAULT '[]'::jsonb,
  density_check JSONB,
  stock_verifications JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for purchases
CREATE POLICY "Users can view own purchases"
  ON public.purchases FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own purchases"
  ON public.purchases FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own purchases"
  ON public.purchases FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can delete own purchases"
  ON public.purchases FOR DELETE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all purchases"
  ON public.purchases FOR SELECT
  USING (is_super_admin());

-- 5. DAILY ENTRIES TABLE
CREATE TABLE public.daily_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift_name TEXT,
  fuel_rates JSONB NOT NULL DEFAULT '{"MS": 0, "HSD": 0, "POWER": 0}'::jsonb,
  nozzles JSONB NOT NULL DEFAULT '[]'::jsonb,
  lube_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
  incomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  credit_sales JSONB NOT NULL DEFAULT '[]'::jsonb,
  upi_collection NUMERIC NOT NULL DEFAULT 0,
  cash_deposit NUMERIC NOT NULL DEFAULT 0,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  testing_deduction JSONB NOT NULL DEFAULT '{"MS": 0, "HSD": 0, "POWER": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_entries
CREATE POLICY "Users can view own entries"
  ON public.daily_entries FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own entries"
  ON public.daily_entries FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own entries"
  ON public.daily_entries FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can delete own entries"
  ON public.daily_entries FOR DELETE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all entries"
  ON public.daily_entries FOR SELECT
  USING (is_super_admin());

-- 6. CLIENT SETTINGS TABLE (for last prices, etc.)
CREATE TABLE public.client_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  last_prices JSONB NOT NULL DEFAULT '{"MS": 0, "HSD": 0, "POWER": 0}'::jsonb,
  last_chamber_capacity NUMERIC NOT NULL DEFAULT 3000,
  last_backup_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_settings
CREATE POLICY "Users can view own settings"
  ON public.client_settings FOR SELECT
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Users can insert own settings"
  ON public.client_settings FOR INSERT
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Users can update own settings"
  ON public.client_settings FOR UPDATE
  USING (client_id = public.get_current_client_id());

CREATE POLICY "Super admins can view all settings"
  ON public.client_settings FOR SELECT
  USING (is_super_admin());

-- Add updated_at triggers
CREATE TRIGGER update_tanks_updated_at
  BEFORE UPDATE ON public.tanks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nozzles_updated_at
  BEFORE UPDATE ON public.nozzles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_debtors_updated_at
  BEFORE UPDATE ON public.debtors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_entries_updated_at
  BEFORE UPDATE ON public.daily_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_settings_updated_at
  BEFORE UPDATE ON public.client_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_tanks_client_id ON public.tanks(client_id);
CREATE INDEX idx_tanks_fuel_type ON public.tanks(fuel_type);
CREATE INDEX idx_nozzles_client_id ON public.nozzles(client_id);
CREATE INDEX idx_nozzles_tank_id ON public.nozzles(tank_id);
CREATE INDEX idx_debtors_client_id ON public.debtors(client_id);
CREATE INDEX idx_purchases_client_id ON public.purchases(client_id);
CREATE INDEX idx_purchases_invoice_date ON public.purchases(invoice_date);
CREATE INDEX idx_daily_entries_client_id ON public.daily_entries(client_id);
CREATE INDEX idx_daily_entries_date ON public.daily_entries(date);
CREATE INDEX idx_client_settings_client_id ON public.client_settings(client_id);