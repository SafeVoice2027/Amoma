import type { ReportStage, ReportStageProgress } from "@/types/database";

export const STAGE_ORDER: ReportStage[] = ["case_filed", "investigation", "meeting", "case_closed"];

export const STAGE_TITLES: Record<ReportStage, string> = {
  case_filed: "Case Filed",
  investigation: "Investigation",
  meeting: "Meeting",
  case_closed: "Case Closed",
};

// A report "has an update" once staff has actually acted on it at least
// once (updated_by set) and that action happened after the student last
// viewed this report's status page — never for a freshly-filed report that
// staff hasn't touched yet, since sitting at the default "Case Filed" isn't
// itself an update.
export function hasStageUpdate(progress: Pick<ReportStageProgress, "updated_by" | "updated_at" | "student_seen_at">): boolean {
  if (!progress.updated_by) return false;
  if (!progress.student_seen_at) return true;
  return new Date(progress.updated_at).getTime() > new Date(progress.student_seen_at).getTime();
}

function addSchoolDays(base: Date, days: number): Date {
  const result = new Date(base);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return result;
}

// Matches the SLAs shown to staff in staff-stage-checklist.tsx (24h / 3
// school days / 48h). Meeting has no fixed SLA once staff sets a tentative
// date, and case_closed is terminal — neither gets an estimate.
export function nextUpdateEstimate(
  reportCreatedAt: string,
  progress: Pick<ReportStageProgress, "current_stage" | "case_filed_completed_at">,
): Date | null {
  let deadline: Date;
  if (progress.current_stage === "case_filed") {
    deadline = new Date(new Date(reportCreatedAt).getTime() + 24 * 60 * 60 * 1000);
  } else if (progress.current_stage === "investigation") {
    deadline = addSchoolDays(new Date(progress.case_filed_completed_at ?? reportCreatedAt), 3);
  } else {
    return null;
  }

  // A stage that's blown past its SLA (staff hasn't advanced it yet) should
  // keep reading as "any moment now" rather than drifting further into the
  // past every day nobody acts on it.
  const now = new Date();
  return deadline < now ? now : deadline;
}
