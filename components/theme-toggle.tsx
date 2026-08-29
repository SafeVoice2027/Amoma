"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "amoma-theme";
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

// SSR (and the very first client render, before hydration) has no
// localStorage — useSyncExternalStore uses this to keep that first render
// consistent, then swaps in the real value from getSnapshot right after.
function getServerSnapshot(): Theme {
  return "system";
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }
  listeners.forEach((l) => l());
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">Appearance</p>
      <div className="flex gap-1 rounded-xl bg-[var(--color-background)] p-1">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              aria-pressed={active}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
