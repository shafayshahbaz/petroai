
-- 1. Add report_inclusion_status to person_entries
ALTER TABLE public.person_entries
  ADD COLUMN IF NOT EXISTS report_inclusion_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS report_id uuid;

ALTER TABLE public.person_entries
  DROP CONSTRAINT IF EXISTS person_entries_inclusion_status_check;
ALTER TABLE public.person_entries
  ADD CONSTRAINT person_entries_inclusion_status_check
  CHECK (report_inclusion_status IN ('pending','draft','included'));

CREATE INDEX IF NOT EXISTS idx_person_entries_inclusion_status
  ON public.person_entries(client_id, report_inclusion_status);

-- 2. daily_sales_reports table
CREATE TABLE IF NOT EXISTS public.daily_sales_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  report_date date NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  entry_ids uuid[] NOT NULL DEFAULT '{}',
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sales_reports TO authenticated;
GRANT ALL ON public.daily_sales_reports TO service_role;

ALTER TABLE public.daily_sales_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view their own reports" ON public.daily_sales_reports;
CREATE POLICY "Clients can view their own reports"
  ON public.daily_sales_reports FOR SELECT
  TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Clients can insert their own reports" ON public.daily_sales_reports;
CREATE POLICY "Clients can insert their own reports"
  ON public.daily_sales_reports FOR INSERT
  TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Clients can update their own reports" ON public.daily_sales_reports;
CREATE POLICY "Clients can update their own reports"
  ON public.daily_sales_reports FOR UPDATE
  TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin())
  WITH CHECK (client_id = public.get_current_client_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Clients can delete their own reports" ON public.daily_sales_reports;
CREATE POLICY "Clients can delete their own reports"
  ON public.daily_sales_reports FOR DELETE
  TO authenticated
  USING (client_id = public.get_current_client_id() OR public.is_super_admin());

DROP TRIGGER IF EXISTS update_daily_sales_reports_updated_at ON public.daily_sales_reports;
CREATE TRIGGER update_daily_sales_reports_updated_at
  BEFORE UPDATE ON public.daily_sales_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_client_date
  ON public.daily_sales_reports(client_id, report_date);
