// Human-readable report number, e.g. "AM-2026-0042". It's a real counter —
// assigned by the database when the report is filed (reports.case_year /
// case_seq, see supabase/migrations/0030_sequential_case_numbers.sql): one
// sequence per school per year, restarting each January, never repeating.
//
// Pass the report row (or anything carrying case_year / case_seq) as the third
// argument. Until that migration has run the columns don't exist, so it falls
// back to the old UUID-derived number rather than breaking a screen.
export interface CaseNumbering {
  case_year?: number | null;
  case_seq?: number | null;
}

export function formatCaseId(id: string, createdAt: string, numbering?: CaseNumbering | null): string {
  if (numbering?.case_seq != null) {
    const year = numbering.case_year ?? new Date(createdAt).getFullYear();
    return `AM-${year}-${String(numbering.case_seq).padStart(4, "0")}`;
  }
  // Legacy fallback (pre-migration): derived from the UUID, not unique.
  const year = new Date(createdAt).getFullYear();
  const digits = id.replace(/-/g, "");
  const num = parseInt(digits.slice(0, 8), 16) % 10000;
  return `AM-${year}-${String(num).padStart(4, "0")}`;
}

// A report is an "Incident Report" when it's filed. Once anyone has acted on
// it, it's a "Case" — same number, different label. Ticking the checklist
// moves `reports.status` off 'unresolved' (see the stage actions), so status
// alone tells every screen which one it is.
export function referenceLabel(status: string | null | undefined): "Case No." | "Incident Report No." {
  return status && status !== "unresolved" ? "Case No." : "Incident Report No.";
}

// `labels` supplies translated text for the student app; staff screens use
// the English default.
export function formatReference(
  id: string,
  createdAt: string,
  status: string | null | undefined,
  labels?: { case: string; incident: string },
  numbering?: CaseNumbering | null,
): string {
  const label = referenceLabel(status) === "Case No." ? (labels?.case ?? "Case No.") : (labels?.incident ?? "Incident Report No.");
  return `${label} ${formatCaseId(id, createdAt, numbering)}`;
}
