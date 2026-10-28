"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Activity, Gavel, Cog, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAGE_ORDER, nextUpdatePeriodKey, normalizeStage } from "@/lib/reports/stage-labels";
import { useT } from "@/components/i18n-provider";
import type { Translate } from "@/lib/i18n/translate";
import type { ReportStage, ReportStageProgress, SeverityLevel } from "@/types/database";

// Case Assessment -> Ongoing Action -> Case Closed.
// See supabase/migrations/0029_three_step_case_flow.sql.
// Stage titles are translated at render time (stage.<id> in lib/i18n/messages).
const STAGES: { id: ReportStage; icon: LucideIcon }[] = [
  { id: "case_filed", icon: FileSearch },
  { id: "investigation", icon: Activity },
  { id: "case_closed", icon: Gavel },
];

const LAST = STAGES.length - 1;

// Who handles a case depends on how serious it is (DO 006 s. 2026 levels,
// plus the Precursor tier from DepEd Memorandum 090, s. 2025): Precursor and
// Minor cases are handled by the Learner Formation Officer; Serious ones go
// through formal interventions by the Guidance Counselor and the Learner
// Formation Officer; Complex ones are led by the school head with those
// officers and coordinated with law enforcement. A report with no severity yet
// (still pending AI review) gets the generic wording. The text itself lives in
// lib/i18n/messages (English, Tagalog, Bisaya).
function subheadingFor(stage: ReportStage, severity: SeverityLevel | null, t: Translate): string {
  const level =
    severity === "precursor" || severity === "serious" || severity === "complex" ? severity : severity ? "minor" : "default";

  switch (stage) {
    // Only the Learner Formation Officer assesses and tags a teacher; the
    // school head joins in only when the case is Complex.
    case "case_filed":
      return level === "complex" ? t("tracker.filed.complex") : t("tracker.filed");
    case "meeting": // retired Scheduling step — shown as Ongoing Action
    case "investigation":
      return `${t(`tracker.ongoing.${level}`)} ${t("tracker.tail")}`;
    case "case_closed":
      return t("tracker.closed");
  }
}

// The moving highlight is a soft-edged "comet" (transparent → brand color →
// transparent), not a flat pill — a solid block sweeping across a short
// track can read as a static bar that merely resizes; the gradient makes
// the motion itself unambiguous.
const COMET_GRADIENT = {
  backgroundImage: "linear-gradient(90deg, transparent, var(--color-brand) 45%, var(--color-brand) 55%, transparent)",
};

function Segment({ state, wide }: { state: "completed" | "active" | "upcoming"; wide: boolean }) {
  return (
    <div
      className={`relative mt-5 h-1 flex-shrink-0 overflow-hidden rounded-full bg-[var(--color-border)] ${
        wide ? "min-w-4 flex-1" : "w-4"
      }`}
    >
      {state === "completed" && <div className="absolute inset-0 rounded-full bg-[var(--color-brand)]" />}
      {state === "active" && (
        <>
          <div className="tracker-sweep absolute top-0 h-full w-[45%]" style={COMET_GRADIENT} />
          <div className="tracker-sweep-relay absolute top-0 h-full w-[45%]" style={COMET_GRADIENT} />
        </>
      )}
    </div>
  );
}

export function ReportStageTracker({
  role,
  reportId,
  initialProgress,
  severity = null,
}: {
  role: "student" | "staff" | "admin";
  reportId: string;
  reportCreatedAt: string;
  initialProgress: ReportStageProgress;
  severity?: SeverityLevel | null;
}) {
  const { t } = useT();
  const [progress, setProgress] = useState(initialProgress);

  // A server re-render (e.g. the page revalidating for an unrelated reason)
  // can hand us a fresh `initialProgress` after realtime has already taken
  // over local state — this is React's documented "adjust state during
  // render" pattern for picking that up, not an effect.
  const [syncedProgress, setSyncedProgress] = useState(initialProgress);
  if (initialProgress !== syncedProgress) {
    setSyncedProgress(initialProgress);
    setProgress(initialProgress);
  }

  // Live updates: when Staff checks an item off, Student's and Admin's open
  // tracker views update without a page refresh.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`report-stage-progress-${reportId}`)
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

  const currentIndex = STAGE_ORDER.indexOf(normalizeStage(progress.current_stage));
  const closed = progress.current_stage === "case_closed" && progress.case_closed_at !== null;
  const activeStage = STAGES[currentIndex];
  const periodKey = nextUpdatePeriodKey(progress.current_stage);

  // Segment i connects icon (i-1) to icon i. It's completed once we've
  // moved past icon i, animating while icon i is the active stage we're
  // working toward, and upcoming (plain grey track) otherwise. The very
  // last segment locks solid once the case is actually closed, rather than
  // animating forever while "Case Closed" just sits as the active stage.
  function segmentState(i: number): "completed" | "active" | "upcoming" {
    if (currentIndex > i) return "completed";
    if (currentIndex === i) return i === LAST && closed ? "completed" : "active";
    return "upcoming";
  }

  // Case Filed (i=0) has no preceding inter-icon segment — but the
  // animation belongs on a line, not the icon itself, so it gets its own
  // short leading segment instead (for Admin this doubles as the
  // Cog → Case Filed connector, replacing what used to be a plain static
  // line there).
  const leadingSegmentState: "completed" | "active" = currentIndex > 0 ? "completed" : "active";

  return (
    <div>
      {/* Icon and label live in the same fixed-width column so they can
          never drift apart — a separate label row (matched to the icon row
          via margins) was the previous approach and is what caused them to
          misalign. Segment lines get an explicit top offset to land on the
          icon row's vertical center, since the column below them is taller
          (icon + label) than the segment itself. */}
      <div className="flex items-start">
        {role === "admin" && (
          <div className="flex w-11 flex-shrink-0 flex-col items-center">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--color-text-muted)]"
              title="Admin oversight — not one of the 4 stages"
            >
              <Cog size={18} />
            </div>
          </div>
        )}

        <Segment state={leadingSegmentState} wide={false} />

        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex || (i === LAST && closed);
          const isActive = i === currentIndex && !(i === LAST && closed);
          const Icon = stage.icon;
          const segment = i > 0 ? segmentState(i) : null;

          return (
            <div key={stage.id} className={`flex items-start ${i > 0 ? "flex-1" : ""}`}>
              {segment && <Segment state={segment} wide />}

              <div className="flex w-16 flex-shrink-0 flex-col items-center sm:w-20">
                <div
                  className={`relative flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? "border-[var(--color-brand)] bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                      : isActive
                        ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                        : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                  title={t(`stage.${stage.id}`)}
                >
                  {isActive && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-brand)] opacity-75" />
                  )}
                  <Icon size={18} className="relative" />
                </div>
                <span
                  className={`mt-2 text-center text-xs font-medium leading-tight ${
                    i === currentIndex ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"
                  }`}
                >
                  {t(`stage.${stage.id}`)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
        <p className="font-medium">{t(`stage.${activeStage.id}`)}</p>
        <p className="mt-1 text-[var(--color-text-muted)]">{subheadingFor(activeStage.id, severity, t)}</p>
        {periodKey && (
          <p className="mt-2 text-[var(--color-text-muted)]">
            {t("tracker.nextUpdate")}{" "}
            <span className="font-medium text-[var(--color-text)]">
              {t(periodKey)}
            </span>
          </p>
        )}
      </div>

      {role === "student" && closed && (
        <Link
          href="/student"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-[var(--color-on-brand)] hover:bg-[var(--color-brand-strong)]"
        >
          {t("tracker.report")}
        </Link>
      )}
    </div>
  );
}
