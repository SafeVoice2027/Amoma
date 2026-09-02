"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, MessageCircleMore, Calendar, Gavel, Cog, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { STAGE_ORDER, STAGE_TITLES, nextUpdateEstimate } from "@/lib/reports/stage-labels";
import type { ReportStage, ReportStageProgress } from "@/types/database";

// Case Filed -> Scheduling -> Investigation & Counseling -> Case Closed.
// See supabase/migrations/0012_reorder_stage_flow.sql.
const STAGES: { id: ReportStage; icon: LucideIcon; title: string; subheading: string }[] = [
  {
    id: "case_filed",
    icon: FileSearch,
    title: STAGE_TITLES.case_filed,
    subheading:
      "Your case is already filed. Within 24 hours of receiving this report, the staff/teacher will assess the details before forwarding it to the counselor. Note: If the staff/teacher can handle the matter, there would be no need to proceed to advising a counselor.",
  },
  {
    id: "meeting",
    icon: Calendar,
    title: STAGE_TITLES.meeting,
    subheading:
      "The team handling your case is planning next steps and assigning who will follow up with you. This takes place within 48 hours.",
  },
  {
    id: "investigation",
    icon: MessageCircleMore,
    title: STAGE_TITLES.investigation,
    subheading:
      "A formal investigation is underway based on the information you have given, alongside counseling and support for anyone affected. This process will involve collecting evidence and interviewing witnesses (if there are any), and will take a maximum of 3 school days.",
  },
  {
    id: "case_closed",
    icon: Gavel,
    title: STAGE_TITLES.case_closed,
    subheading:
      "Your report has been acted on. Please report to Amoma again if any similar situations happen again.",
  },
];

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
        wide ? "w-6 sm:w-10" : "w-4"
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
  reportCreatedAt,
  initialProgress,
}: {
  role: "student" | "staff" | "admin";
  reportId: string;
  reportCreatedAt: string;
  initialProgress: ReportStageProgress;
}) {
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

  const currentIndex = STAGE_ORDER.indexOf(progress.current_stage);
  const closed = progress.current_stage === "case_closed" && progress.case_closed_at !== null;
  const activeStage = STAGES[currentIndex];
  const estimate = nextUpdateEstimate(reportCreatedAt, progress);

  // Segment i connects icon (i-1) to icon i. It's completed once we've
  // moved past icon i, animating while icon i is the active stage we're
  // working toward, and upcoming (plain grey track) otherwise. The very
  // last segment locks solid once the case is actually closed, rather than
  // animating forever while "Case Closed" just sits as the active stage.
  function segmentState(i: number): "completed" | "active" | "upcoming" {
    if (currentIndex > i) return "completed";
    if (currentIndex === i) return i === 3 && closed ? "completed" : "active";
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
          const isCompleted = i < currentIndex || (i === 3 && closed);
          const isActive = i === currentIndex && !(i === 3 && closed);
          const Icon = stage.icon;
          const segment = i > 0 ? segmentState(i) : null;

          return (
            <div key={stage.id} className="flex items-start">
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
                  title={stage.title}
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
                  {stage.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-sm">
        <p className="font-medium">{activeStage.title}</p>
        <p className="mt-1 text-[var(--color-text-muted)]">{activeStage.subheading}</p>
        {estimate && (
          <p className="mt-2 text-[var(--color-text-muted)]">
            Next update estimate:{" "}
            <span className="font-medium text-[var(--color-text)]">
              {estimate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </p>
        )}
      </div>

      {role === "student" && closed && (
        <Link
          href="/student"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-[var(--color-brand)] px-4 py-3 text-sm font-semibold text-[var(--color-on-brand)] hover:bg-[var(--color-brand-strong)]"
        >
          Report
        </Link>
      )}
    </div>
  );
}
