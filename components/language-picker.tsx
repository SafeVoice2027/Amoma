"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useT } from "@/components/i18n-provider";
import { LANGUAGES, type Language } from "@/lib/i18n/languages";

// Student Settings: pick the language the app is shown in. Each language is
// labelled in its own name, so it's findable even when the current one
// can't be read.
export function LanguagePicker({ setLanguage }: { setLanguage: (lang: Language) => Promise<void> }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)]">
        <Languages size={14} />
        {t("settings.language")}
      </p>
      <div className="flex gap-1 rounded-xl bg-[var(--color-background)] p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            disabled={pending}
            aria-pressed={lang === l.code}
            onClick={() =>
              startTransition(async () => {
                await setLanguage(l.code);
                router.refresh();
              })
            }
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
              lang === l.code
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
