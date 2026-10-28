import type { ReportStage, ReportStageProgress } from "@/types/database";

// Case Assessment -> Ongoing Action -> Case Closed. See
// supabase/migrations/0029_three_step_case_flow.sql — the enum member names
// are unchanged ('case_filed', 'investigation', 'case_closed'): 'investigation'
// is the Ongoing Action step, and 'meeting' (the retired Scheduling step) is
// no longer reachable.
export const STAGE_ORDER: ReportStage[] = ["case_filed", "investigation", "case_closed"];

export const STAGE_TITLES: Record<ReportStage, string> = {
  case_filed: "Case Assessment",
  investigation: "Ongoing Action",
  meeting: "Ongoing Action", // legacy alias — see normalizeStage
  case_closed: "Case Closed",
};

// A report that was still at the old Scheduling step before 0029 ran counts as
// Ongoing Action, so nothing breaks in the window before the migration.
export function normalizeStage(stage: ReportStage): ReportStage {
  return stage === "meeting" ? "investigation" : stage;
}

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

// How long the current step usually takes, shown to students as a period
// rather than a calendar date (message keys in lib/i18n/messages). Matches the
// SLAs shown to staff in staff-stage-checklist.tsx: 24 hours to assess, then
// around 5 school days of ongoing action. Closed cases have none.
export function nextUpdatePeriodKey(stage: ReportStage): "tracker.period.assessment" | "tracker.period.ongoing" | null {
  const s = normalizeStage(stage);
  if (s === "case_filed") return "tracker.period.assessment";
  if (s === "investigation") return "tracker.period.ongoing";
  return null;
}
