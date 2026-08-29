"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportStage } from "@/types/database";

export type StageResult = { stage: ReportStage } | { error: string };

// Shared by Staff and Admin. Both directions go through the
// advance_report_stage() RPC (see supabase/migrations/0006_report_stage_progress.sql)
// so the stage-progress write and, when relevant, the reports.status flip
// to 'resolved'/'in_process' happen in one atomic transaction rather than
// two separate client calls.
export async function advanceReportStage(
  reportId: string,
  revalidateTo: string,
  meetingDate?: string,
): Promise<StageResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("advance_report_stage", {
    p_report_id: reportId,
    p_direction: "advance",
    p_meeting_date: meetingDate ?? null,
  });

  if (error) {
    console.error("[advanceReportStage] rpc failed", error);
    return { error: "Couldn't update this stage. Please try again." };
  }

  revalidatePath(revalidateTo);
  return { stage: data as ReportStage };
}

export async function revertReportStage(reportId: string, revalidateTo: string): Promise<StageResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("advance_report_stage", {
    p_report_id: reportId,
    p_direction: "revert",
  });

  if (error) {
    console.error("[revertReportStage] rpc failed", error);
    return { error: "Couldn't revert this stage. Please try again." };
  }

  revalidatePath(revalidateTo);
  return { stage: data as ReportStage };
}
