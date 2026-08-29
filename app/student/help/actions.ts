"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { BugReportCategory } from "@/types/database";

const BUG_CATEGORIES: BugReportCategory[] = [
  "login",
  "report_submission",
  "notifications",
  "app_bug",
  "other",
];

export type SubmitBugReportResult = { error: string } | { success: true };

// Role-agnostic (bug_reports has no role check, just reporter_id = auth.uid())
// — also imported directly by app/staff/help/page.tsx rather than duplicated.
export async function submitBugReport(formData: FormData): Promise<SubmitBugReportResult> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Please sign in again to submit this." };

  const categoryRaw = String(formData.get("category") ?? "");
  const category = BUG_CATEGORIES.includes(categoryRaw as BugReportCategory)
    ? (categoryRaw as BugReportCategory)
    : null;
  const otherCategory = String(formData.get("other_category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!category) return { error: "Please choose what this is about." };
  if (category === "other" && !otherCategory) {
    return { error: "Please briefly describe what this is about." };
  }
  if (!description) return { error: "Please describe what happened." };

  const supabase = await createClient();
  const { error } = await supabase.from("bug_reports").insert({
    reporter_id: profile.id,
    category,
    other_category: category === "other" ? otherCategory : null,
    description,
  });

  if (error) {
    // Most likely cause on a fresh deployment: the migration adding
    // `bug_reports` (supabase/migrations/0003_add_bug_reports.sql) hasn't
    // been run yet.
    console.error("[submitBugReport] insert failed", error);
    return { error: "We couldn't submit this right now. Please try again." };
  }

  return { success: true };
}
