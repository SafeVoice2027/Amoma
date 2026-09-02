"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ReportStage, ReportStageProgress } from "@/types/database";

// Case Filed -> Scheduling -> Investigation & Counseling -> Case Closed.
// See supabase/migrations/0012_reorder_stage_flow.sql.
const CHECKLIST_ITEMS: { stage: ReportStage; label: string; hint: string }[] = [
  { stage: "case_filed", label: "Case Assessment & Counselor Advising", hint: "within 24 hours" },
  { stage: "meeting", label: "Scheduling", hint: "within 48 hours" },
  { stage: "investigation", label: "Investigation & Counseling", hint: "within 3 school days" },
  { stage: "case_closed", label: "Case Resolved", hint: "" },
];

const STAGE_ORDER: ReportStage[] = ["case_filed", "meeting", "investigation", "case_closed"];

export function StaffStageChecklist({
  reportId,
  progress: initialProgress,
  advanceStage,
  revertStage,
}: {
  reportId: string;
  progress: ReportStageProgress;
  advanceStage: () => Promise<{ stage: ReportStage } | { error: string }>;
  revertStage: () => Promise<{ stage: ReportStage } | { error: string }>;
}) {
  const [progress, setProgress] = useState(initialProgress);

  // Same "adjust state during render" resync as ReportStageTracker — a
  // server re-render after advanceStage/revertStage can hand us a fresh
  // `initialProgress` after realtime already took over local state.
  const [syncedProgress, setSyncedProgress] = useState(initialProgress);
  if (initialProgress !== syncedProgress) {
    setSyncedProgress(initialProgress);
    setProgress(initialProgress);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`report-stage-progress-staff-${reportId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "report_stage_progress", filter: `report_id=eq.${reportId}` },
        (payload) => setProgress(payload.new as ReportStageProgress),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reportId]);

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentIndex = STAGE_ORDER.indexOf(progress.current_stage);
  const closed = progress.current_stage === "case_closed" && progress.case_closed_at !== null;

  function isChecked(i: number) {
    return i < currentIndex || (i === 3 && closed);
  }

  function handleCheck(i: number) {
    setError(null);

    if (isChecked(i)) {
      const confirmed = window.confirm(
        "Undo this step? This will roll the report back and change what the student sees.",
      );
      if (!confirmed) return;
      startTransition(async () => {
        const result = await revertStage();
        if ("error" in result) setError(result.error);
      });
      return;
    }

    if (i !== currentIndex) return; // can't skip ahead

    startTransition(async () => {
      const result = await advanceStage();
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <Card>
      <h2 className="mb-1 text-lg font-semibold">Case checklist</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Checking an item off updates the student&apos;s status tracker immediately.
      </p>

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item, i) => {
          const checked = isChecked(i);
          const disabled = pending || (!checked && i !== currentIndex);

          return (
            <button
              key={item.stage}
              type="button"
              disabled={disabled}
              onClick={() => handleCheck(i)}
              aria-pressed={checked}
              className={`flex w-full items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-left ${
                disabled && !checked ? "opacity-50" : "hover:bg-[var(--color-background)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 ${
                  checked
                    ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                {checked && <Check size={14} />}
              </span>
              <span className="text-sm">
                <span className="font-medium">{item.label}</span>
                {item.hint && <span className="ml-1.5 text-[var(--color-text-muted)]">({item.hint})</span>}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--color-danger-600)]">{error}</p>}
    </Card>
  );
}
