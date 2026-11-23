import { describe, expect, it } from "vitest";
import { isBazaarvoiceCollectionHeld } from "./bazaarvoicePolicy";
import { bazaarvoiceHoldResponse } from "../../supabase/functions/_shared/bazaarvoice-hold";

describe("Bazaarvoice hold", () => {
  it("blocks all Bazaarvoice collection modes and the legacy direct collector", () => {
    for (const channel of ["bv_sweep", "bv_sync", "bv_auto_full", "bv_auto_sweep", "bv_collect_us", "bv_collect_uk", "bv_collect_in", "bv_collect_tw", "bv_collect_jp", "bv_collect_th", "bv_collect_de", "bv_collect_au", "bv_collect_br", "bv_collect_mx", "bv_collect_ca", "bv_collect_vn", "lge_com_direct"]) {
      expect(isBazaarvoiceCollectionHeld(channel)).toBe(true);
    }
  });
  it("leaves independent collection channels available", () => {
    for (const channel of ["reddit", "youtube_comments", "lge_com", "bestbuy_api", "walmart_api", "target_api", "quora", "stackexchange"]) {
      expect(isBazaarvoiceCollectionHeld(channel)).toBe(false);
    }
  });
  it("returns zero collected reviews without reading credentials or performing IO", async () => {
    const response = bazaarvoiceHoldResponse({ "Access-Control-Allow-Origin": "*" });
    expect(response?.status).toBe(200);
    expect(await response?.json()).toMatchObject({ success: false, paused: true, code: "BAZAARVOICE_ON_HOLD", collected: 0 });
  });
});