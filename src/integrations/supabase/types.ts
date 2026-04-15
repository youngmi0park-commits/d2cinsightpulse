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
      bv_collection_progress: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_complete: boolean | null
          last_offset: number | null
          last_run_at: string | null
          locale: string
          product_id: string
          product_name: string | null
          total_available: number | null
          total_collected: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_complete?: boolean | null
          last_offset?: number | null
          last_run_at?: string | null
          locale: string
          product_id: string
          product_name?: string | null
          total_available?: number | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_complete?: boolean | null
          last_offset?: number | null
          last_run_at?: string | null
          locale?: string
          product_id?: string
          product_name?: string | null
          total_available?: number | null
          total_collected?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bv_collection_runs: {
        Row: {
          completed_at: string | null
          error_count: number | null
          id: string
          locale: string
          products_done: number | null
          products_queued: number | null
          reviews_fetched: number | null
          reviews_inserted: number | null
          reviews_skipped: number | null
          run_type: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          error_count?: number | null
          id?: string
          locale: string
          products_done?: number | null
          products_queued?: number | null
          reviews_fetched?: number | null
          reviews_inserted?: number | null
          reviews_skipped?: number | null
          run_type: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          error_count?: number | null
          id?: string
          locale?: string
          products_done?: number | null
          products_queued?: number | null
          reviews_fetched?: number | null
          reviews_inserted?: number | null
          reviews_skipped?: number | null
          run_type?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      newsletter_caution_items: {
        Row: {
          body_en: string | null
          body_ko: string | null
          created_at: string | null
          id: string
          issue_id: string | null
          severity: string | null
          sort_order: number | null
          target_codes: string[] | null
          title_en: string | null
          title_ko: string | null
        }
        Insert: {
          body_en?: string | null
          body_ko?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          severity?: string | null
          sort_order?: number | null
          target_codes?: string[] | null
          title_en?: string | null
          title_ko?: string | null
        }
        Update: {
          body_en?: string | null
          body_ko?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          severity?: string | null
          sort_order?: number | null
          target_codes?: string[] | null
          title_en?: string | null
          title_ko?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_caution_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_channel_actions: {
        Row: {
          action_title_en: string | null
          action_title_ko: string | null
          basis_en: string | null
          basis_ko: string | null
          channel_type: string
          copy_headline_en: string | null
          copy_headline_ko: string | null
          created_at: string | null
          id: string
          issue_id: string | null
          sort_order: number | null
          tags: string[] | null
          target_codes: string[] | null
        }
        Insert: {
          action_title_en?: string | null
          action_title_ko?: string | null
          basis_en?: string | null
          basis_ko?: string | null
          channel_type: string
          copy_headline_en?: string | null
          copy_headline_ko?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          sort_order?: number | null
          tags?: string[] | null
          target_codes?: string[] | null
        }
        Update: {
          action_title_en?: string | null
          action_title_ko?: string | null
          basis_en?: string | null
          basis_ko?: string | null
          channel_type?: string
          copy_headline_en?: string | null
          copy_headline_ko?: string | null
          created_at?: string | null
          id?: string
          issue_id?: string | null
          sort_order?: number | null
          tags?: string[] | null
          target_codes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_channel_actions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_collection_stats: {
        Row: {
          display_name: string | null
          dot_color: string | null
          id: string
          issue_id: string | null
          review_count: number | null
          show_as_pill: boolean | null
          sort_order: number | null
          source: string
        }
        Insert: {
          display_name?: string | null
          dot_color?: string | null
          id?: string
          issue_id?: string | null
          review_count?: number | null
          show_as_pill?: boolean | null
          sort_order?: number | null
          source: string
        }
        Update: {
          display_name?: string | null
          dot_color?: string | null
          id?: string
          issue_id?: string | null
          review_count?: number | null
          show_as_pill?: boolean | null
          sort_order?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_collection_stats_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_country_signals: {
        Row: {
          created_at: string | null
          id: string
          issue_id: string | null
          negative_count: number | null
          positive_count: number | null
          sentiment_score: number | null
          signal_tags: string[] | null
          sort_order: number | null
          subsidiary_code: string
          top_category: string | null
          top_insight_en: string | null
          top_insight_ko: string | null
          total_reviews: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          issue_id?: string | null
          negative_count?: number | null
          positive_count?: number | null
          sentiment_score?: number | null
          signal_tags?: string[] | null
          sort_order?: number | null
          subsidiary_code: string
          top_category?: string | null
          top_insight_en?: string | null
          top_insight_ko?: string | null
          total_reviews?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          issue_id?: string | null
          negative_count?: number | null
          positive_count?: number | null
          sentiment_score?: number | null
          signal_tags?: string[] | null
          sort_order?: number | null
          subsidiary_code?: string
          top_category?: string | null
          top_insight_en?: string | null
          top_insight_ko?: string | null
          total_reviews?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_country_signals_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_faq_items: {
        Row: {
          answer_en: string | null
          answer_ko: string | null
          cis_score: number | null
          created_at: string | null
          faq_type: string
          id: string
          issue_id: string | null
          priority: string | null
          question_en: string | null
          question_ko: string | null
          sort_order: number | null
        }
        Insert: {
          answer_en?: string | null
          answer_ko?: string | null
          cis_score?: number | null
          created_at?: string | null
          faq_type: string
          id?: string
          issue_id?: string | null
          priority?: string | null
          question_en?: string | null
          question_ko?: string | null
          sort_order?: number | null
        }
        Update: {
          answer_en?: string | null
          answer_ko?: string | null
          cis_score?: number | null
          created_at?: string | null
          faq_type?: string
          id?: string
          issue_id?: string | null
          priority?: string | null
          question_en?: string | null
          question_ko?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_faq_items_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_issues: {
        Row: {
          avg_sentiment: number | null
          channels_count: number | null
          countries_count: number | null
          created_at: string | null
          generated_at: string | null
          html_snapshot: string | null
          id: string
          issue_date: string
          published_at: string | null
          status: string | null
          title: string | null
          total_reviews: number | null
          week_end: string
          week_start: string
        }
        Insert: {
          avg_sentiment?: number | null
          channels_count?: number | null
          countries_count?: number | null
          created_at?: string | null
          generated_at?: string | null
          html_snapshot?: string | null
          id?: string
          issue_date: string
          published_at?: string | null
          status?: string | null
          title?: string | null
          total_reviews?: number | null
          week_end: string
          week_start: string
        }
        Update: {
          avg_sentiment?: number | null
          channels_count?: number | null
          countries_count?: number | null
          created_at?: string | null
          generated_at?: string | null
          html_snapshot?: string | null
          id?: string
          issue_date?: string
          published_at?: string | null
          status?: string | null
          title?: string | null
          total_reviews?: number | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      newsletter_matrix_rows: {
        Row: {
          category_name: string
          category_name_en: string | null
          cells: Json
          created_at: string | null
          id: string
          issue_id: string | null
          sort_order: number | null
        }
        Insert: {
          category_name: string
          category_name_en?: string | null
          cells?: Json
          created_at?: string | null
          id?: string
          issue_id?: string | null
          sort_order?: number | null
        }
        Update: {
          category_name?: string
          category_name_en?: string | null
          cells?: Json
          created_at?: string | null
          id?: string
          issue_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_matrix_rows_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "newsletter_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          model_number: string
          sub_category: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          model_number: string
          sub_category?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          model_number?: string
          sub_category?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string | null
          collected_at: string
          content: string
          content_type: string | null
          emotion_category: string | null
          emotion_intensity: number | null
          external_id: string | null
          id: string
          platform_type: string | null
          product_id: string
          published_at: string | null
          rating: number | null
          review_type: string | null
          sentiment: string | null
          sentiment_score: number | null
          source: string
          source_url: string | null
          title: string | null
          user_type: string | null
        }
        Insert: {
          author?: string | null
          collected_at?: string
          content: string
          content_type?: string | null
          emotion_category?: string | null
          emotion_intensity?: number | null
          external_id?: string | null
          id?: string
          platform_type?: string | null
          product_id: string
          published_at?: string | null
          rating?: number | null
          review_type?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source: string
          source_url?: string | null
          title?: string | null
          user_type?: string | null
        }
        Update: {
          author?: string | null
          collected_at?: string
          content?: string
          content_type?: string | null
          emotion_category?: string | null
          emotion_intensity?: number | null
          external_id?: string | null
          id?: string
          platform_type?: string | null
          product_id?: string
          published_at?: string | null
          rating?: number | null
          review_type?: string | null
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string
          source_url?: string | null
          title?: string | null
          user_type?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
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
      bv_collection_summary: {
        Row: {
          collection_rate_pct: number | null
          last_run_at: string | null
          locale: string | null
          products_complete: number | null
          products_pending: number | null
          products_tracked: number | null
          total_available: number | null
          total_collected: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_bv_priority_products: {
        Args: { p_limit?: number; p_locale: string }
        Returns: {
          category: string | null
          created_at: string | null
          id: string
          is_complete: boolean | null
          last_offset: number | null
          last_run_at: string | null
          locale: string
          product_id: string
          product_name: string | null
          total_available: number | null
          total_collected: number | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bv_collection_progress"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_category_counts: {
        Args: never
        Returns: {
          category: string
          count: number
        }[]
      }
      get_category_counts_by_country: {
        Args: { p_country?: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      get_country_counts: {
        Args: never
        Returns: {
          count: number
          country: string
        }[]
      }
      get_lgcom_country_counts: {
        Args: never
        Returns: {
          count: number
          country: string
        }[]
      }
      get_lgcom_keywords: {
        Args: { p_limit?: number; p_region?: string }
        Returns: {
          count: number
          keyword: string
          region: string
          sentiment: string
        }[]
      }
      get_lgcom_weekly_top_products: {
        Args: { p_limit?: number; p_region?: string; p_sentiment?: string }
        Returns: {
          avg_score: number
          category: string
          display_name: string
          keywords: string[]
          model_number: string
          product_id: string
          region: string
          review_count: number
        }[]
      }
      get_newsletter_aggregates: {
        Args: { p_end: string; p_start: string }
        Returns: {
          cnt: number
          product_id: string
          sentiment: string
          source: string
        }[]
      }
      get_source_counts: {
        Args: never
        Returns: {
          count: number
          source: string
        }[]
      }
      get_weekly_category_counts_by_country: {
        Args: { p_country?: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
