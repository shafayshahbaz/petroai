
-- 1. Person entries: add additional income columns
ALTER TABLE public.person_entries
  ADD COLUMN IF NOT EXISTS incomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS total_income NUMERIC NOT NULL DEFAULT 0;

-- 2. Bank deposits table
CREATE TABLE IF NOT EXISTS public.bank_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  deposit_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  bank_name TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_deposits TO authenticated;
GRANT ALL ON public.bank_deposits TO service_role;

ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own bank deposits"
  ON public.bank_deposits FOR SELECT
  TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

CREATE POLICY "Clients can insert own bank deposits"
  ON public.bank_deposits FOR INSERT
  TO authenticated
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Clients can update own bank deposits"
  ON public.bank_deposits FOR UPDATE
  TO authenticated
  USING (client_id = public.get_current_client_id())
  WITH CHECK (client_id = public.get_current_client_id());

CREATE POLICY "Clients can delete own bank deposits"
  ON public.bank_deposits FOR DELETE
  TO authenticated
  USING (client_id = public.get_current_client_id());

CREATE INDEX IF NOT EXISTS bank_deposits_client_date_idx
  ON public.bank_deposits(client_id, deposit_date DESC);

CREATE TRIGGER update_bank_deposits_updated_at
  BEFORE UPDATE ON public.bank_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
