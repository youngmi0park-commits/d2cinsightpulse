import { useState } from "react";
import { Mail, Send, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLang } from "@/contexts/LanguageContext";

export function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { t } = useLang();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      toast.error(t("Please enter a valid email address", "유효한 이메일 주소를 입력해 주세요"));
      return;
    }

    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    
    setIsSubscribed(true);
    toast.success(t("Newsletter subscription complete! Receive weekly reports every Monday morning.", "뉴스레터 구독이 완료되었습니다! 매주 월요일 아침 리포트를 받아보세요."));
    setIsSubmitting(false);
  };

  if (isSubscribed) {
    return (
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 text-success">
          <div className="p-2 rounded-full bg-success/10">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{t("Subscribed!", "구독 완료!")}</p>
            <p className="text-sm text-muted-foreground">
              {t(
                `Every Monday morning, reports will be sent to `,
                `매주 월요일 아침, `
              )}<span className="text-foreground font-medium">{email}</span>{t(".", "로 리포트를 발송해 드립니다.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-6 w-6 text-primary" />
        <h3 className="text-lg font-semibold font-heading">📬 {t("Weekly Report Newsletter", "위클리 리포트 뉴스레터")}</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-5">
        {t(
          "Receive weekly customer voice reports via email every Monday morning.\nView sentiment analysis results, keyword trends, and regional insights at a glance.",
          "매주 월요일 아침, 주간 고객 보이스 리포트를 이메일로 받아보세요.\n감성 분석 결과, 키워드 트렌드, 지역별 인사이트를 한눈에 확인할 수 있습니다."
        )}
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("Enter email address", "이메일 주소 입력")}
            className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary/30"
          />
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="h-12 px-6 glow-primary"
        >
          {isSubmitting ? (
            t("Subscribing...", "구독 중...")
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t("Subscribe", "구독하기")}
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-3">
        {t("※ You can unsubscribe at any time. We do not send spam.", "※ 구독은 언제든 해지할 수 있으며, 스팸 메일을 발송하지 않습니다.")}
      </p>
    </div>
  );
}
