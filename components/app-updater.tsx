"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Keeps an open Amoma on the latest version. It asks /api/version which build is
// live and compares it with the build this page was loaded from; when they
// differ, a newer deploy is out. Then:
//   - if the person is away (tab hidden) or just came back, and nothing they've
//     typed would be lost, the page reloads itself quietly;
//   - otherwise (they're looking at the screen, or are mid-way through a report
//     or a message) a small "Update" bar appears instead — a student's
//     half-written report must never be wiped by a surprise reload.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID;
const CHECK_EVERY_MS = 5 * 60 * 1000;

const TEXT: Record<string, { message: string; action: string }> = {
  en: { message: "A new version of Amoma is ready.", action: "Update" },
  tl: { message: "May bagong bersyon ng Amoma.", action: "I-update" },
  ceb: { message: "Aduna nay bag-ong bersyon sa Amoma.", action: "I-update" },
};

function safeToReload(): boolean {
  // Never in the middle of writing a report.
  if (window.location.pathname.startsWith("/student/report")) return false;
  // Nor with anything typed into a field (e.g. a follow-up message).
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "textarea, input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=submit]):not([type=button])",
  );
  return ![...fields].some((el) => el.value.trim().length > 0);
}

export function AppUpdater() {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  const reload = useCallback(() => {
    window.location.reload();
  }, []);

  const check = useCallback(async () => {
    // Skip in dev / when there's no build id to compare.
    if (!BUILD_ID || process.env.NODE_ENV !== "production") return;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { build } = (await res.json()) as { build: string | null };
      if (build && build !== BUILD_ID) {
        readyRef.current = true;
        setReady(true);
        // Also nudge the service worker to look for its own update.
        navigator.serviceWorker
          ?.getRegistration()
          .then((r) => r?.update())
          .catch(() => {});
        if (document.visibilityState === "hidden" && safeToReload()) reload();
      }
    } catch {
      // Offline or a blip — try again at the next check.
    }
  }, [reload]);

  useEffect(() => {
    const first = setTimeout(check, 15_000);
    const interval = setInterval(check, CHECK_EVERY_MS);

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Coming back to the app: if we already know about an update and it's
      // safe, apply it now; otherwise look again.
      if (readyRef.current && safeToReload()) reload();
      else check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, [check, reload]);

  if (!ready) return null;

  const text = TEXT[document.documentElement.lang] ?? TEXT.en;
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 print:hidden">
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-neutral-900)] px-4 py-3 text-sm text-white shadow-lg">
        <span>{text.message}</span>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-brand)] px-3 py-1.5 font-semibold text-[var(--color-on-brand)]"
        >
          <RefreshCw size={14} />
          {text.action}
        </button>
      </div>
    </div>
  );
}
