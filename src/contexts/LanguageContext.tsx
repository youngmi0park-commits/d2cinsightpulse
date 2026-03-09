import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Lang = "en" | "ko";

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (en: string, ko: string) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ko");

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === "en" ? "ko" : "en"));
  }, []);

  const t = useCallback(
    (en: string, ko: string) => (lang === "en" ? en : ko),
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
