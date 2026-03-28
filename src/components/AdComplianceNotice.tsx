import { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { type ComplianceCheck, getComplianceChecks, getDisclaimers } from "@/lib/adComplianceRules";
import { useLang } from "@/contexts/LanguageContext";

interface AdComplianceNoticeProps {
  purpose: string;
  geo: string;
  productName: string;
  totalReviews: number;
  dataSource?: string;
}

export function AdComplianceNotice({
  purpose,
  geo,
  productName,
  totalReviews,
  dataSource = "Reddit, Amazon, RTINGS, Consumer Reports",
}: AdComplianceNoticeProps) {
  const [expanded, setExpanded] = useState(false);
  const { t, lang } = useLang();
  const checks = getComplianceChecks(purpose);
  const disclaimer = getDisclaimers(purpose, geo, productName, totalReviews, dataSource);

  const statusIcon = (status: ComplianceCheck["status"]) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />;
      case "info": return <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden">
      {/* Disclaimer */}
      <div className="px-4 py-3 text-[11px] text-muted-foreground leading-relaxed border-b border-border/50">
        <span className="font-semibold text-foreground/70">⚖️ Disclaimer: </span>
        {lang === "en" ? disclaimer.en : disclaimer.ko}
      </div>

      {/* Compliance toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span className="font-medium text-foreground/80">
            {t("Ad Compliance Checklist", "광고 컴플라이언스 체크리스트")}
          </span>
          <span className="text-muted-foreground">
            ({checks.length} {t("items verified", "항목 검증 완료")})
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {checks.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-[11px]">
              {statusIcon(c.status)}
              <div>
                <span className="text-muted-foreground font-mono">[{c.category}]</span>{" "}
                <span className="text-foreground/80">{lang === "en" ? c.rule : c.ruleKo}</span>
              </div>
            </div>
          ))}
          <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
            {t(
              "Ref: LGE Overseas Advertising Legal Review Checklist (General / Environmental Claims / Comparative Claims)",
              "참고: LGE 해외광고 법무검토 체크리스트 (General / Environmental Claims / Comparative Claims)"
            )}
          </div>
        </div>
      )}
    </div>
  );
}
