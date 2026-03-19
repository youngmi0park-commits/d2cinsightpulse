import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductWithCount {
  id: string;
  model_number: string;
  display_name: string;
  category: string;
  review_count: number;
}

export function useProductListWithCounts() {
  return useQuery({
    queryKey: ["product-list-with-counts"],
    queryFn: async () => {
      // Fetch all active products
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, model_number, display_name, category")
        .eq("is_active", true);

      if (pErr) throw pErr;
      if (!products?.length) return [];

      // Fetch review counts per product using a single query
      const { data: reviewCounts, error: rErr } = await supabase
        .rpc("get_review_counts_by_product" as never) // fallback below
        .select("*");

      // If RPC doesn't exist, count manually per product in batches
      // We'll use a simpler approach: fetch all review product_ids and count client-side
      const { data: reviewProductIds, error: rcErr } = await supabase
        .from("reviews")
        .select("product_id");

      if (rcErr) throw rcErr;

      const countMap = new Map<string, number>();
      for (const r of reviewProductIds || []) {
        countMap.set(r.product_id, (countMap.get(r.product_id) || 0) + 1);
      }

      const result: ProductWithCount[] = products.map((p) => ({
        id: p.id,
        model_number: p.model_number,
        display_name: p.display_name,
        category: p.category,
        review_count: countMap.get(p.id) || 0,
      }));

      // Sort by category then review_count desc
      result.sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return b.review_count - a.review_count;
      });

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}
