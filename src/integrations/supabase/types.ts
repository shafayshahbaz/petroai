export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_deposits: {
        Row: {
          amount: number
          bank_name: string | null
          client_id: string
          created_at: string
          deposit_date: string
          id: string
          notes: string | null
          reference_number: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          bank_name?: string | null
          client_id: string
          created_at?: string
          deposit_date: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bank_name?: string | null
          client_id?: string
          created_at?: string
          deposit_date?: string
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_deposits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_settings: {
        Row: {
          client_id: string
          created_at: string
          default_rates: Json
          id: string
          last_backup_date: string | null
          last_chamber_capacity: number
          last_prices: Json
          last_retention_run: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          default_rates?: Json
          id?: string
          last_backup_date?: string | null
          last_chamber_capacity?: number
          last_prices?: Json
          last_retention_run?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          default_rates?: Json
          id?: string
          last_backup_date?: string | null
          last_chamber_capacity?: number
          last_prices?: Json
          last_retention_run?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          gst_number: string | null
          id: string
          is_first_login: boolean
          opening_cash_in_hand: number
          opening_cash_set_at: string | null
          owner_name: string
          phone: string | null
          pump_name: string
          subscription_expiry_date: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          is_first_login?: boolean
          opening_cash_in_hand?: number
          opening_cash_set_at?: string | null
          owner_name: string
          phone?: string | null
          pump_name: string
          subscription_expiry_date?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          gst_number?: string | null
          id?: string
          is_first_login?: boolean
          opening_cash_in_hand?: number
          opening_cash_set_at?: string | null
          owner_name?: string
          phone?: string | null
          pump_name?: string
          subscription_expiry_date?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_dip_readings: {
        Row: {
          client_id: string
          created_at: string
          date: string
          dip_liters: number | null
          dip_reading: number
          id: string
          system_liters: number | null
          tank_id: string
          updated_at: string
          variance: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          dip_liters?: number | null
          dip_reading: number
          id?: string
          system_liters?: number | null
          tank_id: string
          updated_at?: string
          variance?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          dip_liters?: number | null
          dip_reading?: number
          id?: string
          system_liters?: number | null
          tank_id?: string
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_dip_readings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_dip_readings_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_entries: {
        Row: {
          cash_deposit: number
          client_id: string
          created_at: string
          credit_sales: Json
          date: string
          expenses: Json
          fuel_rates: Json
          id: string
          incomes: Json
          lube_items: Json
          nozzles: Json
          opening_balance: number
          shift_name: string | null
          testing_deduction: Json
          updated_at: string
          upi_collection: number
        }
        Insert: {
          cash_deposit?: number
          client_id: string
          created_at?: string
          credit_sales?: Json
          date: string
          expenses?: Json
          fuel_rates?: Json
          id?: string
          incomes?: Json
          lube_items?: Json
          nozzles?: Json
          opening_balance?: number
          shift_name?: string | null
          testing_deduction?: Json
          updated_at?: string
          upi_collection?: number
        }
        Update: {
          cash_deposit?: number
          client_id?: string
          created_at?: string
          credit_sales?: Json
          date?: string
          expenses?: Json
          fuel_rates?: Json
          id?: string
          incomes?: Json
          lube_items?: Json
          nozzles?: Json
          opening_balance?: number
          shift_name?: string | null
          testing_deduction?: Json
          updated_at?: string
          upi_collection?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_reports: {
        Row: {
          client_id: string
          confirmed: boolean
          created_at: string
          entry_ids: string[]
          id: string
          notes: string | null
          report_date: string
          totals: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          confirmed?: boolean
          created_at?: string
          entry_ids?: string[]
          id?: string
          notes?: string | null
          report_date: string
          totals?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          confirmed?: boolean
          created_at?: string
          entry_ids?: string[]
          id?: string
          notes?: string | null
          report_date?: string
          totals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      debtors: {
        Row: {
          client_id: string
          contact_number: string | null
          created_at: string
          id: string
          name: string
          opening_balance: number
          total_outstanding: number
          updated_at: string
        }
        Insert: {
          client_id: string
          contact_number?: string | null
          created_at?: string
          id?: string
          name: string
          opening_balance?: number
          total_outstanding?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          contact_number?: string | null
          created_at?: string
          id?: string
          name?: string
          opening_balance?: number
          total_outstanding?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debtors_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      dip_charts: {
        Row: {
          client_id: string
          created_at: string
          id: string
          liters: number
          point: number
          tank_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          liters: number
          point: number
          tank_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          liters?: number
          point?: number
          tank_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dip_charts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dip_charts_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_rates_daily: {
        Row: {
          client_id: string
          created_at: string
          id: string
          product: string
          rate: number
          rate_date: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          product: string
          rate?: number
          rate_date: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          product?: string
          rate?: number
          rate_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fuel_rates_daily_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_transactions: {
        Row: {
          account_id: string
          account_name: string
          account_type: string
          amount: number
          client_id: string
          created_at: string
          description: string
          id: string
          reference_id: string | null
          remarks: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          account_name: string
          account_type: string
          amount?: number
          client_id: string
          created_at?: string
          description: string
          id?: string
          reference_id?: string | null
          remarks?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          account_name?: string
          account_type?: string
          amount?: number
          client_id?: string
          created_at?: string
          description?: string
          id?: string
          reference_id?: string | null
          remarks?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nozzle_men: {
        Row: {
          active: boolean
          client_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nozzle_men_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nozzles: {
        Row: {
          client_id: string
          created_at: string
          fuel_type: string
          id: string
          label: string
          opening_reading: number
          tank_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          fuel_type: string
          id?: string
          label: string
          opening_reading?: number
          tank_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          fuel_type?: string
          id?: string
          label?: string
          opening_reading?: number
          tank_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nozzles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nozzles_tank_id_fkey"
            columns: ["tank_id"]
            isOneToOne: false
            referencedRelation: "tanks"
            referencedColumns: ["id"]
          },
        ]
      }
      person_entries: {
        Row: {
          client_id: string
          closing_reading: number
          created_at: string
          denominations: Json
          deposited: boolean
          difference: number
          entry_date: string
          expenses: Json
          gross_amount: number
          id: string
          incomes: Json
          liters_sold: number
          net_payable: number
          nozzle_id: string | null
          nozzle_label: string
          nozzle_man_id: string | null
          nozzle_man_name: string
          opening_reading: number
          product: string
          rate: number
          report_id: string | null
          report_inclusion_status: string
          total_cash: number
          total_collected: number
          total_expenses: number
          total_income: number
          updated_at: string
          upi_received: number
        }
        Insert: {
          client_id: string
          closing_reading?: number
          created_at?: string
          denominations?: Json
          deposited?: boolean
          difference?: number
          entry_date: string
          expenses?: Json
          gross_amount?: number
          id?: string
          incomes?: Json
          liters_sold?: number
          net_payable?: number
          nozzle_id?: string | null
          nozzle_label: string
          nozzle_man_id?: string | null
          nozzle_man_name: string
          opening_reading?: number
          product: string
          rate?: number
          report_id?: string | null
          report_inclusion_status?: string
          total_cash?: number
          total_collected?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          upi_received?: number
        }
        Update: {
          client_id?: string
          closing_reading?: number
          created_at?: string
          denominations?: Json
          deposited?: boolean
          difference?: number
          entry_date?: string
          expenses?: Json
          gross_amount?: number
          id?: string
          incomes?: Json
          liters_sold?: number
          net_payable?: number
          nozzle_id?: string | null
          nozzle_label?: string
          nozzle_man_id?: string | null
          nozzle_man_name?: string
          opening_reading?: number
          product?: string
          rate?: number
          report_id?: string | null
          report_inclusion_status?: string
          total_cash?: number
          total_collected?: number
          total_expenses?: number
          total_income?: number
          updated_at?: string
          upi_received?: number
        }
        Relationships: [
          {
            foreignKeyName: "person_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_entries_nozzle_id_fkey"
            columns: ["nozzle_id"]
            isOneToOne: false
            referencedRelation: "nozzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_entries_nozzle_man_id_fkey"
            columns: ["nozzle_man_id"]
            isOneToOne: false
            referencedRelation: "nozzle_men"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          chambers: Json
          client_id: string
          created_at: string
          density_check: Json | null
          id: string
          invoice_date: string
          invoice_number: string
          status: string
          stock_verifications: Json | null
          supplier_name: string
          total_invoice_value: number
          updated_at: string
        }
        Insert: {
          chambers?: Json
          client_id: string
          created_at?: string
          density_check?: Json | null
          id?: string
          invoice_date: string
          invoice_number: string
          status?: string
          stock_verifications?: Json | null
          supplier_name: string
          total_invoice_value?: number
          updated_at?: string
        }
        Update: {
          chambers?: Json
          client_id?: string
          created_at?: string
          density_check?: Json | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          status?: string
          stock_verifications?: Json | null
          supplier_name?: string
          total_invoice_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      tanks: {
        Row: {
          capacity: number
          client_id: string
          created_at: string
          current_stock: number
          fuel_type: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          client_id: string
          created_at?: string
          current_stock?: number
          fuel_type: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          client_id?: string
          created_at?: string
          current_stock?: number
          fuel_type?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tanks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_client_id: { Args: never; Returns: string }
      has_active_subscription: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      process_daily_sale: {
        Args: {
          p_client_id: string
          p_entry_data?: Json
          p_entry_id?: string
          p_nozzle_tank_map?: Json
          p_old_nozzles?: Json
          p_operation: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "super_admin" | "pump_owner"
      subscription_status: "active" | "expired" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "pump_owner"],
      subscription_status: ["active", "expired", "suspended"],
    },
  },
} as const
