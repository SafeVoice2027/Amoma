// Types mirroring the LIVE Supabase project's schema (introspected via the
// PostgREST OpenAPI doc — the project was already provisioned with this
// schema before supabase/migrations/0001_init_schema.sql was written to
// match it). Regenerate with `supabase gen types typescript` once the CLI is
// linked to the project.

export type UserRole = "student" | "staff" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type ReportType = "bully" | "conflict";
export type ReportStatus = "unresolved" | "in_process" | "resolved";
export type SeverityLevel = "minor" | "less_serious" | "serious" | "critical";
// Bully reports are self-classified by the student in Step 2 of the report
// wizard; conflict reports are tagged 'conflict' directly at submission —
// see supabase/migrations/0002_add_report_category.sql.
export type ReportCategory = "social" | "cyber" | "physical" | "verbal" | "conflict";
export type NotificationChannel = "push" | "sms" | "email";
export type NotificationUrgency = "normal" | "high";
// See supabase/migrations/0003_add_bug_reports.sql.
export type BugReportCategory = "login" | "report_submission" | "notifications" | "app_bug" | "other";
export type BugReportStatus = "open" | "resolved";
// See supabase/migrations/0006_report_stage_progress.sql.
export type ReportStage = "case_filed" | "investigation" | "meeting" | "case_closed";
// See supabase/migrations/0008_meeting_response.sql.
export type MeetingResponse = "attending" | "not_attending";

export interface Profile {
  id: string;
  role: UserRole;
  school_id: string | null;
  full_name: string | null;
  lrn: string | null;
  deped_email: string | null;
  status: AccountStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  school_id: string | null;
  type: ReportType;
  is_anonymous: boolean;
  immediate_danger: boolean;
  status: ReportStatus;
  severity: SeverityLevel | null;
  category: ReportCategory | null;
  assigned_staff_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// visible_reporter_id is `reporter_id` when the report isn't anonymous and
// NULL when it is — query this view (not the `reports` table) for any
// staff-facing listing so an anonymous reporter's identity never has to be
// filtered out in application code.
export interface StaffReportsView {
  id: string;
  school_id: string | null;
  type: ReportType;
  is_anonymous: boolean;
  immediate_danger: boolean;
  status: ReportStatus;
  severity: SeverityLevel | null;
  category: ReportCategory | null;
  assigned_staff_id: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  visible_reporter_id: string | null;
}

export interface ReportBullyDetails {
  report_id: string;
  offender_description: string | null;
  happened_before: boolean | null;
  prior_incident_details: string | null;
  location: string | null;
  occurred_at: string | null;
  witnesses: string | null;
}

export interface ReportConflictDetails {
  report_id: string;
  conflict_reason: string | null;
  dominant_party_description: string | null;
  wants_solution: boolean | null;
  wants_breathing_exercise: boolean | null;
}

export interface ReportEvidence {
  id: string;
  report_id: string;
  storage_path: string;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ReportFollowup {
  id: string;
  report_id: string;
  author_id: string;
  message: string;
  created_at: string;
}

export interface AiAssessment {
  id: string;
  report_id: string;
  severity: SeverityLevel;
  recommendation: string | null;
  staff_summary: string | null;
  model_version: string | null;
  created_at: string;
}

export interface IdentityDisclosureLog {
  id: string;
  report_id: string;
  disclosed_to: string;
  disclosed_by: string | null;
  reason: string;
  disclosed_at: string;
}

export interface NotificationRow {
  id: string;
  report_id: string | null;
  recipient_id: string;
  channel: NotificationChannel;
  urgency: NotificationUrgency;
  sent_at: string | null;
  // See supabase/migrations/0005_add_notification_read_at.sql.
  read_at: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  deped_school_id: string | null;
  created_at: string;
}

export interface BugReport {
  id: string;
  reporter_id: string;
  category: BugReportCategory;
  other_category: string | null;
  description: string;
  status: BugReportStatus;
  created_at: string;
}

export interface ReportStageProgress {
  report_id: string;
  current_stage: ReportStage;
  case_filed_completed_at: string | null;
  investigation_completed_at: string | null;
  meeting_completed_at: string | null;
  case_closed_at: string | null;
  meeting_tentative_date: string | null;
  updated_by: string | null;
  updated_at: string;
  // See supabase/migrations/0007_stage_progress_seen.sql.
  student_seen_at: string | null;
  // See supabase/migrations/0008_meeting_response.sql.
  student_meeting_response: MeetingResponse | null;
}
