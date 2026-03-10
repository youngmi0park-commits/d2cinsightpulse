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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      collection_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          items_collected: number | null
          source: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_collected?: number | null
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_collected?: number | null
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          model_number: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          model_number: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          model_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string | null
          collected_at: string
          content: string
          external_id: string | null
          id: string
          product_id: string
          published_at: string | null
          rating: number | null
          sentiment: string | null
          sentiment_score: number | null
          source: string
          source_url: string | null
          title: string | null
        }
        Insert: {
          author?: string | null
          collected_at?: string
          content: string
          external_id?: string | null
          id?: string
          product_id: string
          published_at?: string | null
          rating?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          source: string
          source_url?: string | null
          title?: string | null
        }
        Update: {
          author?: string | null
          collected_at?: string
          content?: string
          external_id?: string | null
          id?: string
          product_id?: string
          published_at?: string | null
          rating?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string
          source_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_keywords: {
        Row: {
          change_percent: number | null
          count: number
          created_at: string
          id: string
          keyword: string
          related_countries: string[] | null
          related_products: string[] | null
          sentiment: string
          snapshot_date: string
          source: string
        }
        Insert: {
          change_percent?: number | null
          count?: number
          created_at?: string
          id?: string
          keyword: string
          related_countries?: string[] | null
          related_products?: string[] | null
          sentiment: string
          snapshot_date?: string
          source: string
        }
        Update: {
          change_percent?: number | null
          count?: number
          created_at?: string
          id?: string
          keyword?: string
          related_countries?: string[] | null
          related_products?: string[] | null
          sentiment?: string
          snapshot_date?: string
          source?: string
        }
        Relationships: []
      }
      trending_snapshots: {
        Row: {
          avg_sentiment_score: number | null
          change_percent: number | null
          created_at: string
          id: string
          mention_count: number
          product_id: string
          rank: number | null
          snapshot_date: string
          source: string
          trend: string | null
        }
        Insert: {
          avg_sentiment_score?: number | null
          change_percent?: number | null
          created_at?: string
          id?: string
          mention_count?: number
          product_id: string
          rank?: number | null
          snapshot_date?: string
          source: string
          trend?: string | null
        }
        Update: {
          avg_sentiment_score?: number | null
          change_percent?: number | null
          created_at?: string
          id?: string
          mention_count?: number
          product_id?: string
          rank?: number | null
          snapshot_date?: string
          source?: string
          trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trending_snapshots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
