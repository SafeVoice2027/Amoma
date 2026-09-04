"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SeverityLevel } from "@/types/database";

export interface UrgentNotificationItem {
  id: string;
  reportId: string;
  caseId: string;
  createdAt: string;
  severity: SeverityLevel | null;
}

// Built with the Web Audio API so no audio asset/licensing is needed and
// it's available the instant the page loads. Browsers block audio before
// any user gesture on the page; that's fine here since a staff/admin
// session always involves clicks before this would ever matter, and the
// visual badge/list still works regardless.
//
// Critical gets the harsher two-tone siren (alternating high/low, square
// wave, 3x) so it's unmistakably the more urgent of the two. Serious gets a
// single, softer tone (one pitch, sine wave, 2x) — audibly distinct without
// being alarming enough to be mistaken for Critical.
function playAlarm(mostSevere: "critical" | "serious") {
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const now = ctx.currentTime;

  const beep = (start: number, freq: number, duration: number, type: OscillatorType, peakGain: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.02);
  };

  if (mostSevere === "critical") {
    for (let i = 0; i < 3; i++) {
      beep(i * 0.5, 880, 0.22, "square", 0.15);
      beep(i * 0.5 + 0.25, 660, 0.22, "square", 0.15);
    }
  } else {
    for (let i = 0; i < 2; i++) {
      beep(i * 0.6, 523.25, 0.3, "sine", 0.1);
    }
  }
}

// A server-rendered layout only fetches urgent alerts once, at page load —
// a tab left open on the dashboard never learns about a report submitted
// five minutes later until the viewer navigates or reloads. Polling is the
// simplest fix without standing up a realtime channel.
const POLL_INTERVAL_MS = 20_000;

export function UrgentNotificationBell({
  items: initialItems,
  unreadCount: initialUnreadCount,
  reportBasePath,
  markAllRead,
  pollAction,
  panelPlacement = "below",
}: {
  items: UrgentNotificationItem[];
  unreadCount: number;
  reportBasePath: string;
  markAllRead: () => Promise<void>;
  /** Re-fetches this viewer's own urgent alerts; polled every
   *  POLL_INTERVAL_MS so a newly-arrived Critical/Serious report is noticed
   *  (and alarmed for) while the tab stays open. */
  pollAction: () => Promise<{ items: UrgentNotificationItem[]; unreadCount: number }>;
  /** "below" fits a horizontal header (panel drops down, right-aligned to
   *  the button); "right" fits a narrow vertical sidebar (panel opens to
   *  the button's right instead, so it doesn't overflow off-screen). */
  panelPlacement?: "below" | "right";
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [, startTransition] = useTransition();
  const playedRef = useRef(false);
  // Seeded from the server-rendered snapshot so the poll below only alarms
  // for alerts that show up *after* this mount, not ones already on screen.
  const seenIdsRef = useRef(new Set(initialItems.map((i) => i.id)));

  // Alarm once for whatever was already unread at page load.
  useEffect(() => {
    if (unreadCount > 0 && !playedRef.current) {
      playedRef.current = true;
      const mostSevere = items.some((i) => i.severity === "critical") ? "critical" : "serious";
      try {
        playAlarm(mostSevere);
      } catch {
        // Ignore — e.g. AudioContext blocked. The visual alert still shows.
      }
    }
    // Intentionally only the server-rendered snapshot — the poll effect
    // below is what handles everything from here on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Then keep polling for anything new for as long as the tab stays open.
  useEffect(() => {
    const interval = setInterval(async () => {
      let result: { items: UrgentNotificationItem[]; unreadCount: number };
      try {
        result = await pollAction();
      } catch {
        return; // e.g. offline for this tick — just try again next interval
      }

      const newItems = result.items.filter((i) => !seenIdsRef.current.has(i.id));
      result.items.forEach((i) => seenIdsRef.current.add(i.id));

      setItems(result.items);
      setUnreadCount(result.unreadCount);

      if (newItems.length > 0) {
        setDismissed(false);
        const mostSevere = newItems.some((i) => i.severity === "critical") ? "critical" : "serious";
        try {
          playAlarm(mostSevere);
        } catch {
          // Ignore — e.g. AudioContext blocked. The visual alert still shows.
        }
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollAction]);

  const showAlert = unreadCount > 0 && !dismissed;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Urgent alerts"
        title="Urgent alerts"
        onClick={() => {
          setOpen((o) => !o);
          if (showAlert) {
            setDismissed(true);
            startTransition(markAllRead);
          }
        }}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
          showAlert
            ? "text-[var(--color-danger-500)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        }`}
      >
        <AlertTriangle size={18} className={showAlert ? "animate-pulse" : ""} />
        {showAlert && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-danger-600)]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-20 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg ${
              panelPlacement === "right" ? "top-0 left-full ml-2" : "right-0 top-11"
            }`}
          >
            <p className="px-2 py-1 text-sm font-semibold">Urgent alerts</p>
            {items.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--color-text-muted)]">No urgent alerts.</p>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {items.map((item) => (
                  <Link
                    key={item.id}
                    href={`${reportBasePath}/${item.reportId}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-2 py-2 hover:bg-[var(--color-background)]"
                  >
                    <p className="text-sm font-medium text-[var(--color-danger-500)]">
                      {item.caseId} — {item.severity === "critical" ? "Critical / immediate danger" : "Serious"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
