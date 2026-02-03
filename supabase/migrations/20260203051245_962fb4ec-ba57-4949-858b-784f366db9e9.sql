CREATE OR REPLACE FUNCTION public.process_daily_sale(
  p_operation text,
  p_client_id uuid,
  p_entry_data jsonb DEFAULT NULL::jsonb,
  p_entry_id uuid DEFAULT NULL::uuid,
  p_old_nozzles jsonb DEFAULT NULL::jsonb,
  p_nozzle_tank_map jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  -- Validate operation
  IF p_operation NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;

  -- CREATE OPERATION
  IF p_operation = 'create' THEN
    -- Insert the daily entry
    INSERT INTO daily_entries (
      client_id,
      date,
      shift_name,
      fuel_rates,
      nozzles,
      lube_items,
      expenses,
      incomes,
      credit_sales,
      upi_collection,
      cash_deposit,
      opening_balance,
      testing_deduction
    )
    VALUES (
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
    )
    RETURNING id INTO v_entry_id;

    -- Get testing deduction
    v_testing_deduction := COALESCE(p_entry_data->'testing_deduction', '{}'::JSONB);

    -- Deduct stock from tanks for each nozzle
    IF p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN
        SELECT * FROM jsonb_array_elements(COALESCE(p_entry_data->'nozzles', '[]'::JSONB))
      LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';

        IF v_tank_id IS NOT NULL THEN
          -- Calculate liters sold (closing - opening - testing)
          v_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                   - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                   - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);

          -- Only deduct if positive
          IF v_liters > 0 THEN
            UPDATE tanks
            SET current_stock = current_stock - v_liters,
                updated_at = now()
            WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_result := jsonb_build_object(
      'success', true,
      'operation', 'create',
      'entry_id', v_entry_id
    );

  -- UPDATE OPERATION
  ELSIF p_operation = 'update' THEN
    -- First, revert old stock (add back old quantities)
    IF p_old_nozzles IS NOT NULL AND p_nozzle_tank_map IS NOT NULL THEN
      -- Get old testing deduction from existing entry
      SELECT testing_deduction INTO v_testing_deduction
      FROM daily_entries
      WHERE id = p_entry_id;

      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(p_old_nozzles)
      LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';

        IF v_tank_id IS NOT NULL THEN
          v_old_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                        - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                        - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);

          IF v_old_liters > 0 THEN
            -- Add back old stock
            UPDATE tanks
            SET current_stock = current_stock + v_old_liters,
                updated_at = now()
            WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Now apply new stock deductions
    v_testing_deduction := COALESCE(p_entry_data->'testing_deduction', '{}'::JSONB);

    IF p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN
        SELECT * FROM jsonb_array_elements(COALESCE(p_entry_data->'nozzles', '[]'::JSONB))
      LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';

        IF v_tank_id IS NOT NULL THEN
          v_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                   - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                   - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);

          IF v_liters > 0 THEN
            UPDATE tanks
            SET current_stock = current_stock - v_liters,
                updated_at = now()
            WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Update the daily entry
    UPDATE daily_entries
    SET
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

    v_result := jsonb_build_object(
      'success', true,
      'operation', 'update',
      'entry_id', p_entry_id
    );

  -- DELETE OPERATION
  ELSIF p_operation = 'delete' THEN
    -- Get the entry to restore stock
    SELECT nozzles, testing_deduction
    INTO p_old_nozzles, v_testing_deduction
    FROM daily_entries
    WHERE id = p_entry_id;

    -- Restore stock for each nozzle
    IF p_old_nozzles IS NOT NULL AND p_nozzle_tank_map IS NOT NULL THEN
      FOR v_nozzle IN SELECT * FROM jsonb_array_elements(p_old_nozzles)
      LOOP
        v_nozzle_id := v_nozzle->>'id';
        v_tank_id := NULLIF(p_nozzle_tank_map ->> v_nozzle_id, '')::UUID;
        v_fuel_type := v_nozzle->>'fuelType';

        IF v_tank_id IS NOT NULL THEN
          v_old_liters := COALESCE((v_nozzle->>'closingReading')::NUMERIC, 0)
                        - COALESCE((v_nozzle->>'openingReading')::NUMERIC, 0)
                        - COALESCE((v_testing_deduction->>v_fuel_type)::NUMERIC, 0);

          IF v_old_liters > 0 THEN
            -- Add back stock
            UPDATE tanks
            SET current_stock = current_stock + v_old_liters,
                updated_at = now()
            WHERE id = v_tank_id;
          END IF;
        END IF;
      END LOOP;
    END IF;

    -- Delete the entry
    DELETE FROM daily_entries WHERE id = p_entry_id;

    v_result := jsonb_build_object(
      'success', true,
      'operation', 'delete',
      'entry_id', p_entry_id
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;