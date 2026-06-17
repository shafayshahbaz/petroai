
-- 1) Drop password hint column
ALTER TABLE public.clients DROP COLUMN IF EXISTS temp_password_hint;

-- 2) Harden process_daily_sale with ownership check
CREATE OR REPLACE FUNCTION public.process_daily_sale(p_operation text, p_client_id uuid, p_entry_data jsonb DEFAULT NULL::jsonb, p_entry_id uuid DEFAULT NULL::uuid, p_old_nozzles jsonb DEFAULT NULL::jsonb, p_nozzle_tank_map jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
  v_entry_id UUID;
  v_nozzle JSONB;
  v_tank_id UUID;
  v_liters NUMERIC;
  v_old_liters NUMERIC;
  v_testing_deduction JSONB;
  v_fuel_type TEXT;
  v_nozzle_id TEXT;
  v_authorized BOOLEAN;
BEGIN
  -- Verify caller owns this client_id or is super_admin (prevents cross-client tampering)
  SELECT (auth.uid() = c.user_id) OR public.is_super_admin()
    INTO v_authorized
    FROM public.clients c
    WHERE c.id = p_client_id;

  IF NOT COALESCE(v_authorized, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized: caller does not own client %', p_client_id;
  END IF;

  IF p_operation NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;

  IF p_operation = 'create' THEN
    INSERT INTO daily_entries (
      client_id, date, shift_name, fuel_rates, nozzles, lube_items,
      expenses, incomes, credit_sales, upi_collection, cash_deposit,
      opening_balance, testing_deduction
    ) VALUES (
      p_client_id,
      (p_entry_data->>'date')::DATE,
      p_entry_data->>'shift_name',
      COALESCE(p_entry_data->'fuel_rates', '{}'::JSONB),
      COALESCE(p_entry_data->'nozzles', '[]'::JSONB),
      COALESCE(p_entry_data->'lube_items', '[]'::JSONB),
      COALESCE(p_entry_data->'expenses', '[]'::JSONB),
      COALESCE(p_entry_data->'incomes', '[]'::JSONB),
      COALESCE(p_entry_data->'credit_sales', '[]'::JSONB),
      COALESCE((p_entry_data->>'upi_collection')::NUMERIC, 0),
      COALESCE((p_entry_data->>'cash_deposit')::NUMERIC, 0),
      COALESCE((p_entry_data->>'opening_balance')::NUMERIC, 0),
      COALESCE(p_entry_data->'testing_deduction', '{}'::JSONB)
    ) RETURNING id INTO v_entry_id;

    v_testing_deduction := COALESCE(p_entry_data->'testing_deduction', '{}'::JSONB);

    IF p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(COALESCE(p_entry_data->'nozzles', '[]'::JSONB)) LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';
        IF v_tank_id IS NOT NULL THEN
          v_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                   - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                   - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);
          IF v_liters > 0 THEN
            UPDATE tanks SET current_stock = current_stock - v_liters, updated_at = now() WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_result := jsonb_build_object('success', true, 'operation', 'create', 'entry_id', v_entry_id);

  ELSIF p_operation = 'update' THEN
    IF p_old_nozzles IS NOT NULL AND p_nozzle_tank_map IS NOT NULL THEN
      SELECT testing_deduction INTO v_testing_deduction FROM daily_entries WHERE id = p_entry_id;
      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(p_old_nozzles) LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';
        IF v_tank_id IS NOT NULL THEN
          v_old_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                        - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                        - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);
          IF v_old_liters > 0 THEN
            UPDATE tanks SET current_stock = current_stock + v_old_liters, updated_at = now() WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_testing_deduction := COALESCE(p_entry_data->'testing_deduction', '{}'::JSONB);

    IF p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(COALESCE(p_entry_data->'nozzles', '[]'::JSONB)) LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';
        IF v_tank_id IS NOT NULL THEN
          v_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                   - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                   - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);
          IF v_liters > 0 THEN
            UPDATE tanks SET current_stock = current_stock - v_liters, updated_at = now() WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    UPDATE daily_entries SET
      date = COALESCE((p_entry_data->>'date')::DATE, date),
      shift_name = p_entry_data->>'shift_name',
      fuel_rates = COALESCE(p_entry_data->'fuel_rates', fuel_rates),
      nozzles = COALESCE(p_entry_data->'nozzles', nozzles),
      lube_items = COALESCE(p_entry_data->'lube_items', lube_items),
      expenses = COALESCE(p_entry_data->'expenses', expenses),
      incomes = COALESCE(p_entry_data->'incomes', incomes),
      credit_sales = COALESCE(p_entry_data->'credit_sales', credit_sales),
      upi_collection = COALESCE((p_entry_data->>'upi_collection')::NUMERIC, upi_collection),
      cash_deposit = COALESCE((p_entry_data->>'cash_deposit')::NUMERIC, cash_deposit),
      opening_balance = COALESCE((p_entry_data->>'opening_balance')::NUMERIC, opening_balance),
      testing_deduction = COALESCE(p_entry_data->'testing_deduction', testing_deduction),
      updated_at = now()
    WHERE id = p_entry_id;

    v_result := jsonb_build_object('success', true, 'operation', 'update', 'entry_id', p_entry_id);

  ELSIF p_operation = 'delete' THEN
    SELECT nozzles, testing_deduction INTO p_old_nozzles, v_testing_deduction FROM daily_entries WHERE id = p_entry_id;
    IF p_old_nozzles IS NOT NULL AND p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(p_old_nozzles) LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';
        IF v_tank_id IS NOT NULL THEN
          v_old_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                        - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                        - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);
          IF v_old_liters > 0 THEN
            UPDATE tanks SET current_stock = current_stock + v_old_liters, updated_at = now() WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;
    DELETE FROM daily_entries WHERE id = p_entry_id;
    v_result := jsonb_build_object('success', true, 'operation', 'delete', 'entry_id', p_entry_id);
  END IF;

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$function$;

-- 3) Add subscription gating to write policies on transactional tables
-- daily_entries
DROP POLICY IF EXISTS "Users can insert own entries" ON public.daily_entries;
CREATE POLICY "Users can insert own entries" ON public.daily_entries
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own entries" ON public.daily_entries;
CREATE POLICY "Users can update own entries" ON public.daily_entries
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can delete own entries" ON public.daily_entries;
CREATE POLICY "Users can delete own entries" ON public.daily_entries
  FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());

-- tanks
DROP POLICY IF EXISTS "Users can insert own tanks" ON public.tanks;
CREATE POLICY "Users can insert own tanks" ON public.tanks
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own tanks" ON public.tanks;
CREATE POLICY "Users can update own tanks" ON public.tanks
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can delete own tanks" ON public.tanks;
CREATE POLICY "Users can delete own tanks" ON public.tanks
  FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());

-- nozzles
DROP POLICY IF EXISTS "Users can insert own nozzles" ON public.nozzles;
CREATE POLICY "Users can insert own nozzles" ON public.nozzles
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own nozzles" ON public.nozzles;
CREATE POLICY "Users can update own nozzles" ON public.nozzles
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can delete own nozzles" ON public.nozzles;
CREATE POLICY "Users can delete own nozzles" ON public.nozzles
  FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());

-- debtors
DROP POLICY IF EXISTS "Users can insert own debtors" ON public.debtors;
CREATE POLICY "Users can insert own debtors" ON public.debtors
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own debtors" ON public.debtors;
CREATE POLICY "Users can update own debtors" ON public.debtors
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can delete own debtors" ON public.debtors;
CREATE POLICY "Users can delete own debtors" ON public.debtors
  FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());

-- purchases
DROP POLICY IF EXISTS "Users can insert own purchases" ON public.purchases;
CREATE POLICY "Users can insert own purchases" ON public.purchases
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own purchases" ON public.purchases;
CREATE POLICY "Users can update own purchases" ON public.purchases
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can delete own purchases" ON public.purchases;
CREATE POLICY "Users can delete own purchases" ON public.purchases
  FOR DELETE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());

-- client_settings
DROP POLICY IF EXISTS "Users can insert own settings" ON public.client_settings;
CREATE POLICY "Users can insert own settings" ON public.client_settings
  FOR INSERT TO authenticated
  WITH CHECK (client_id = public.get_current_client_id() AND public.has_active_subscription());
DROP POLICY IF EXISTS "Users can update own settings" ON public.client_settings;
CREATE POLICY "Users can update own settings" ON public.client_settings
  FOR UPDATE TO authenticated
  USING (client_id = public.get_current_client_id() AND public.has_active_subscription());
