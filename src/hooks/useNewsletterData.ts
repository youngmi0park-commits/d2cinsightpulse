import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getLge } from "@/constants/lgeSubsidiaries";

/* eslint-disable @typescript-eslint/no-explicit-any */

// 최신 또는 특정 이슈 조회
export const useNewsletterIssue = (issueId?: string | null) =>
  useQuery({
    queryKey: ["newsletter-issue", issueId],
    queryFn: async () => {
      if (issueId) {
        const { data } = await (supabase as any)
          .from("newsletter_issues")
          .select("*")
          .eq("id", issueId)
          .single();
        return data;
      }
      const { data } = await (supabase as any)
        .from("newsletter_issues")
        .select("*")
        .order("issue_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

// 국가 시그널
export const useCountrySignals = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-signals", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_country_signals")
        .select("*")
        .eq("issue_id", issueId!)
        .order("sort_order");
      return (data ?? []).map((row: any) => ({
        ...row,
        meta: getLge(row.subsidiary_code),
      }));
    },
  });

// 매트릭스
export const useMatrixRows = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-matrix", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_matrix_rows")
        .select("*")
        .eq("issue_id", issueId!)
        .order("sort_order");
      return data ?? [];
    },
  });

// 채널 액션
export const useChannelActions = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-actions", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_channel_actions")
        .select("*")
        .eq("issue_id", issueId!)
        .order("sort_order");
      return data ?? [];
    },
  });

// FAQ
export const useFaqItems = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-faq", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_faq_items")
        .select("*")
        .eq("issue_id", issueId!)
        .order("cis_score", { ascending: false });
      return data ?? [];
    },
  });

// 집행 주의
export const useCautionItems = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-cautions", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_caution_items")
        .select("*")
        .eq("issue_id", issueId!)
        .order("sort_order");
      return data ?? [];
    },
  });

// 채널 수집 현황
export const useCollectionStats = (issueId?: string) =>
  useQuery({
    queryKey: ["newsletter-stats", issueId],
    enabled: !!issueId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_collection_stats")
        .select("*")
        .eq("issue_id", issueId!)
        .order("sort_order");
      return data ?? [];
    },
  });

// 아카이브 목록
export const useNewsletterArchive = () =>
  useQuery({
    queryKey: ["newsletter-archive"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("newsletter_issues")
        .select(
          "id,issue_date,week_start,week_end,title," +
          "status,total_reviews,countries_count,avg_sentiment"
        )
        .order("issue_date", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
