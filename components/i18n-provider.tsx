"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/languages";
import { createTranslator, type Translate, type TranslateOption } from "@/lib/i18n/translate";

interface I18nValue {
  lang: Language;
  t: Translate;
  tOption: TranslateOption;
}

// Default (no provider — staff, admin and signed-out pages) is English, so a
// shared component can call useT() anywhere without breaking.
const I18nContext = createContext<I18nValue>({ lang: DEFAULT_LANGUAGE, ...createTranslator(DEFAULT_LANGUAGE) });

export function I18nProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const value = useMemo<I18nValue>(() => ({ lang, ...createTranslator(lang) }), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nValue {
  return useContext(I18nContext);
}
