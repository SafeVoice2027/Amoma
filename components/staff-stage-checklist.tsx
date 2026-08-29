"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import type { ReportStage, ReportStageProgress } from "@/types/database";

const CHECKLIST_ITEMS: { stage: ReportStage; label: string; hint: string }[] = [
  { stage: "case_filed", label: "Case Assessment & Counselor Advising", hint: "within 24 hours" },
  { stage: "investigation", label: "Report Investigation", hint: "within 3 school days" },
  { stage: "meeting", label: "Scheduling a Meeting", hint: "within 48 hours" },
  { stage: "case_closed", label: "Case Resolved", hint: "" },
];

const STAGE_ORDER: ReportStage[] = ["case_filed", "investigation", "meeting", "case_closed"];

export function StaffStageChecklist({
  reportId,
  progress: initialProgress,
  advanceStage,
  revertStage,
}: {
  reportId: string;
  progress: ReportStageProgress;
  advanceStage: (meetingDate?: string) => Promise<{ stage: ReportStage } | { error: string }>;
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

  // The student answering the meeting checklist writes directly to this row
  // from their own session — staff needs to see that without a reload.
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
  const [pickingMeetingDate, setPickingMeetingDate] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");

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

    if (i === 2 && !pickingMeetingDate) {
      // "Scheduling a Meeting" — ask for the tentative date before completing.
      setPickingMeetingDate(true);
      return;
    }

    startTransition(async () => {
      const result = await advanceStage(i === 2 ? meetingDate || undefined : undefined);
      if ("error" in result) setError(result.error);
      else {
        setPickingMeetingDate(false);
        setMeetingDate("");
      }
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
            <div key={item.stage}>
              <button
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
                  {item.stage === "meeting" && progress.meeting_tentative_date && (
                    <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                      Tentative date:{" "}
                      {new Date(progress.meeting_tentative_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {item.stage === "meeting" && progress.current_stage === "meeting" && (
                    <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                      Student&apos;s response:{" "}
                      {progress.student_meeting_response === "attending"
                        ? "Willing to attend"
                        : progress.student_meeting_response === "not_attending"
                          ? "Prefers not to attend"
                          : "Not answered yet"}
                    </span>
                  )}
                </span>
              </button>

              {i === 2 && pickingMeetingDate && !checked && (
                <div className="ml-8 mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-brand)]"
                  />
                  <button
                    type="button"
                    disabled={pending || !meetingDate}
                    onClick={() => handleCheck(2)}
                    className="rounded-lg bg-[var(--color-brand)] px-3 py-1.5 text-sm font-medium text-[var(--color-on-brand)] disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickingMeetingDate(false);
                      setMeetingDate("");
                    }}
                    className="text-sm text-[var(--color-text-muted)]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-[var(--color-danger-600)]">{error}</p>}
    </Card>
  );
}
