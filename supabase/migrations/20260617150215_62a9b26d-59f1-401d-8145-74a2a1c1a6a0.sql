
-- DIP CHARTS: point->liters per tank
CREATE TABLE public.dip_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tank_id uuid NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  point integer NOT NULL CHECK (point >= 0),
  liters numeric NOT NULL CHECK (liters >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tank_id, point)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dip_charts TO authenticated;
GRANT ALL ON public.dip_charts TO service_role;
ALTER TABLE public.dip_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dip charts"
  ON public.dip_charts FOR ALL TO authenticated
  USING (client_id = public.get_current_client_id())
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());

CREATE TRIGGER dip_charts_updated_at BEFORE UPDATE ON public.dip_charts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DAILY DIP READINGS
CREATE TABLE public.daily_dip_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tank_id uuid NOT NULL REFERENCES public.tanks(id) ON DELETE CASCADE,
  date date NOT NULL,
  dip_reading numeric NOT NULL,
  dip_liters numeric,
  system_liters numeric,
  variance numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, date, tank_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_dip_readings TO authenticated;
GRANT ALL ON public.daily_dip_readings TO service_role;
ALTER TABLE public.daily_dip_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dip readings"
  ON public.daily_dip_readings FOR ALL TO authenticated
  USING (client_id = public.get_current_client_id())
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());

CREATE TRIGGER daily_dip_readings_updated_at BEFORE UPDATE ON public.daily_dip_readings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dip_charts_tank ON public.dip_charts(tank_id);
CREATE INDEX idx_daily_dip_readings_client_date ON public.daily_dip_readings(client_id, date DESC);
