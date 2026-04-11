/**
 * LG Electronics 해외법인 공식 코드
 * DB 저장 시 반드시 이 코드 사용 (ISO 2자리 코드 금지)
 */
export const LGE_SUBSIDIARIES = [
  { code:"LGEUS", country:"미국",       countryEn:"United States",  flag:"🇺🇸", region:"Americas"  },
  { code:"LGECI", country:"캐나다",     countryEn:"Canada",         flag:"🇨🇦", region:"Americas"  },
  { code:"LGESP", country:"브라질",     countryEn:"Brazil",         flag:"🇧🇷", region:"Americas"  },
  { code:"LGEMS", country:"멕시코",     countryEn:"Mexico",         flag:"🇲🇽", region:"Americas"  },
  { code:"LGEUK", country:"영국",       countryEn:"United Kingdom", flag:"🇬🇧", region:"Europe"    },
  { code:"LGEDE", country:"독일",       countryEn:"Germany",        flag:"🇩🇪", region:"Europe"    },
  { code:"LGEFS", country:"프랑스",     countryEn:"France",         flag:"🇫🇷", region:"Europe"    },
  { code:"LGEBN", country:"네덜란드",   countryEn:"Netherlands",    flag:"🇳🇱", region:"Europe"    },
  { code:"LGEIL", country:"인도",       countryEn:"India",          flag:"🇮🇳", region:"SouthAsia" },
  { code:"LGEAP", country:"호주",       countryEn:"Australia",      flag:"🇦🇺", region:"Oceania"   },
  { code:"LGEJP", country:"일본",       countryEn:"Japan",          flag:"🇯🇵", region:"NEAsia"    },
  { code:"LGETT", country:"대만",       countryEn:"Taiwan",         flag:"🇹🇼", region:"NEAsia"    },
  { code:"LGEHK", country:"홍콩",       countryEn:"Hong Kong",      flag:"🇭🇰", region:"NEAsia"    },
  { code:"LGESL", country:"싱가포르",   countryEn:"Singapore",      flag:"🇸🇬", region:"SEAsia"    },
  { code:"LGEML", country:"말레이시아", countryEn:"Malaysia",       flag:"🇲🇾", region:"SEAsia"    },
  { code:"LGEIN", country:"인도네시아", countryEn:"Indonesia",      flag:"🇮🇩", region:"SEAsia"    },
  { code:"LGETH", country:"태국",       countryEn:"Thailand",       flag:"🇹🇭", region:"SEAsia"    },
  { code:"LGEPH", country:"필리핀",     countryEn:"Philippines",    flag:"🇵🇭", region:"SEAsia"    },
  { code:"LGEVN", country:"베트남",     countryEn:"Vietnam",        flag:"🇻🇳", region:"SEAsia"    },
] as const;

export type LgeCode   = (typeof LGE_SUBSIDIARIES)[number]["code"];
export type LgeRegion = "Americas"|"Europe"|"SouthAsia"|"Oceania"|"NEAsia"|"SEAsia";

export const getLge        = (code: string) =>
  LGE_SUBSIDIARIES.find(s => s.code === code);
export const getLgeByRegion = (region: LgeRegion) =>
  LGE_SUBSIDIARIES.filter(s => s.region === region);

/** source 필드 → LGE 법인 코드 매핑 */
export const sourceToLgeCode = (source: string): string => {
  const map: Record<string, string> = {
    lge_com_us: "LGEUS", lge_com_uk: "LGEUK", lge_com_de: "LGEDE",
    lge_com_au: "LGEAP", lge_com_in: "LGEIL", lge_com_tw: "LGETT",
    lge_com_jp: "LGEJP", lge_com_th: "LGETH",
    lge_com_sg: "LGESL", lge_com_my: "LGEML", lge_com_id: "LGEIN",
    lge_com_ph: "LGEPH", lge_com_vn: "LGEVN", lge_com_hk: "LGEHK",
    lge_com_ca: "LGECI", lge_com_br: "LGESP", lge_com_mx: "LGEMS",
    lge_com_fr: "LGEFS", lge_com_nl: "LGEBN",
  };
  return map[source] ?? "LGEUS";
};

// ── 시그널 태그 ──
export type SignalTag =
  | "PMAX_UP" | "PMAX_HOLD" | "PMAX_PAUSE"
  | "CRITEO_ON" | "CRITEO_OFF"
  | "AFFILIATE_UP" | "AFFILIATE_BRIEF"
  | "FAQ_URGENT" | "PDP_FAQ"
  | "GEO_READY" | "SEO_READY"
  | "META_ON" | "YOUTUBE_ON"
  | "SEASON_ON" | "MONITOR" | "DEFEND";

export const SIGNAL_TAG_COLOR: Record<SignalTag, "green"|"red"|"amber"> = {
  PMAX_UP:"green", PMAX_HOLD:"amber", PMAX_PAUSE:"red",
  CRITEO_ON:"green", CRITEO_OFF:"red",
  AFFILIATE_UP:"green", AFFILIATE_BRIEF:"green",
  FAQ_URGENT:"red", PDP_FAQ:"red",
  GEO_READY:"green", SEO_READY:"amber",
  META_ON:"green", YOUTUBE_ON:"green",
  SEASON_ON:"green", MONITOR:"amber", DEFEND:"red",
};

// ── 매트릭스 셀 ──
export type MatrixCell =
  | "ON" | "SEASON" | "UGC" | "DEFEND" | "WATCH" | "READY" | "NONE";

export const MATRIX_CELL_STYLE: Record<MatrixCell, {
  label: string; labelEn: string; bg: string; text: string;
}> = {
  ON:     { label:"▲ ON",    labelEn:"▲ ON",     bg:"#F0FDF4", text:"#2A6E2A" },
  SEASON: { label:"▲ 시즌",  labelEn:"▲ Season", bg:"#F0FDF4", text:"#2A6E2A" },
  UGC:    { label:"▲ UGC",   labelEn:"▲ UGC",    bg:"#F0FDF4", text:"#2A6E2A" },
  DEFEND: { label:"방어",    labelEn:"Defend",    bg:"#FFF5F5", text:"#C8102E" },
  WATCH:  { label:"모니터",  labelEn:"Watch",     bg:"#FFFBEB", text:"#D97706" },
  READY:  { label:"준비",    labelEn:"Ready",     bg:"#FFFBEB", text:"#D97706" },
  NONE:   { label:"—",       labelEn:"—",         bg:"transparent", text:"#DDD" },
};
