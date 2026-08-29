"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, SeverityBadge } from "@/components/ui";
import { ReportStageTracker } from "@/components/report-stage-tracker";
import type {
  ReportFollowup,
  ReportStageProgress,
  ReportStatus,
  ReportType,
  SeverityLevel,
} from "@/types/database";

export interface ReportSummary {
  id: string;
  type: ReportType;
  status: ReportStatus;
  severity: SeverityLevel | null;
  is_anonymous: boolean;
  created_at: string;
  summary: string;
  followups: ReportFollowup[];
  stageProgress: ReportStageProgress | null;
}

const STUDENT_STATUS_STYLES: Record<ReportStatus, string> = {
  unresolved: "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]",
  in_process: "bg-[var(--color-primary-100)] text-[var(--color-primary-800)]",
  resolved: "bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]",
};

const STUDENT_STATUS_LABELS: Record<ReportStatus, string> = {
  unresolved: "Under Review",
  in_process: "In Progress",
  resolved: "Closed",
};

export function ReportThread({
  report,
  caseId,
  currentUserId,
  sendMessage,
  autoOpen = false,
}: {
  report: ReportSummary;
  caseId: string;
  currentUserId: string;
  sendMessage: (reportId: string, message: string) => Promise<void>;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [statusOpen, setStatusOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorId = `report-${report.id}`;

  // Notification-bell deep link: `useState(autoOpen)` only seeds the
  // *initial* value, but the page is already mounted by the time a
  // notification is clicked — this is React's documented "adjust state
  // during render" pattern (not an effect) for reacting when autoOpen flips
  // true afterwards. `autoOpenHandled` guards it to run only once.
  const [autoOpenHandled, setAutoOpenHandled] = useState(autoOpen);
  if (autoOpen && !autoOpenHandled) {
    setAutoOpenHandled(true);
    setOpen(true);
  }

  // The scroll itself is a real external-system interaction, so it does
  // belong in an effect.
  useEffect(() => {
    if (autoOpen) {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  return (
    <div className="space-y-4">
      <Card id={anchorId}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  report.type === "bully"
                    ? "bg-[var(--color-primary-100)] text-[var(--color-primary-800)]"
                    : "bg-[var(--color-accent-100)] text-[var(--color-accent-800)]"
                }`}
              >
                {report.type === "bully" ? "Bully" : "Conflict"}
              </span>
              <span className="font-semibold">{caseId}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {new Date(report.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "2-digit",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text)]">{report.summary}</p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STUDENT_STATUS_STYLES[report.status]}`}
            >
              {STUDENT_STATUS_LABELS[report.status]}
            </span>
            <SeverityBadge severity={report.severity} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm font-medium text-[var(--color-brand)]"
          >
            {open ? "Hide" : "View"} follow-up ({report.followups.length})
          </button>
          {report.stageProgress && (
            <button
              type="button"
              onClick={() => setStatusOpen((o) => !o)}
              className="text-sm font-medium text-[var(--color-brand)]"
            >
              {statusOpen ? "Hide" : "View"} report status
            </button>
          )}
        </div>

        {statusOpen && report.stageProgress && (
          <div className="mt-4 border-t border-[var(--color-border)] pt-4">
            <ReportStageTracker
              role="student"
              reportId={report.id}
              reportCreatedAt={report.created_at}
              initialProgress={report.stageProgress}
            />
          </div>
        )}
      </Card>

      {open && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Follow-up thread</h2>
          <div className="space-y-3">
            {report.followups.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                No messages yet. A staff member will follow up here once your report is reviewed.
              </p>
            )}
            {report.followups.map((f) => (
              <div
                key={f.id}
                className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                  f.author_id === currentUserId
                    ? "ml-auto bg-[var(--color-primary-100)] text-[var(--color-primary-900)]"
                    : "bg-[var(--color-background)] text-[var(--color-text)]"
                }`}
              >
                {f.message}
              </div>
            ))}
          </div>

          <form
            className="mt-4 flex gap-2"
            action={() => {
              const value = inputRef.current?.value ?? "";
              if (!value.trim()) return;
              startTransition(() => sendMessage(report.id, value));
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <input
              ref={inputRef}
              name="message"
              placeholder="Send a message..."
              className="flex-1 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
            />
            <Button type="submit" disabled={pending} className="min-h-0 px-4 py-2 text-sm">
              Send
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
