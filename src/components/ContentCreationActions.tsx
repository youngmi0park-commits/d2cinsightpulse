import { ExternalLink, Image, LayoutTemplate, Sparkles, Palette } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";

interface ContentCreationActionsProps {
  productName: string;
  displayName?: string;
}

export function ContentCreationActions({ productName, displayName }: ContentCreationActionsProps) {
  useLang();

  return (
    <a
      href="https://anita-twincrew.lovable.app/studio"
      target="_blank"
      rel="noopener noreferrer"
      className="group gradient-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer block"
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shrink-0 shadow-md">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-sm font-bold text-foreground">🎨 LG Twin Crew Anita — AI Creative Studio</h4>
            <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            제품 이미지 생성 & 배너 제작을 AI로 즉시 만들어보세요. 클릭하여 스튜디오로 이동합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[10px] font-semibold">
            <Image className="h-3 w-3" /> 이미지 생성
          </span>
          <span className="flex items-center gap-1 rounded-full bg-accent/30 text-accent-foreground px-2.5 py-1 text-[10px] font-semibold">
            <LayoutTemplate className="h-3 w-3" /> 배너 제작
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[10px] font-semibold">
            <Palette className="h-3 w-3" /> 크리에이티브
          </span>
        </div>
      </div>
    </a>
  );
}
