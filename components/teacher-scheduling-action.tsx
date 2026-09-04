"use client";

import { useState, useTransition } from "react";
import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui";
import type { StageResult } from "@/lib/reports/stage-progress";

// A tagged Teacher's one and only write access to the Report Status
// checklist — advancing the Scheduling step, one-way only. Every other
// stage (and any revert) stays Handler's/Admin's call — see
// supabase/migrations/0015_teacher_scheduling_permission.sql. Rendered only
// while Scheduling is actually the report's current stage; once it
// advances, the parent stops rendering this and the read-only tracker
// above takes over showing the case moved on.
export function TeacherSchedulingAction({ advance }: { advance: () => Promise<StageResult> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await advance();
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--color-border)] p-3">
      <p className="text-sm">
        Once you&apos;ve scheduled and held the meeting with the student, confirm it here to move the
        case to Investigation &amp; Counseling.
      </p>
      <Button className="mt-3 w-full" onClick={handleConfirm} disabled={pending}>
        <CalendarCheck size={16} />
        {pending ? "Confirming..." : "Confirm meeting scheduled"}
      </Button>
      {error && <p className="mt-2 text-sm text-[var(--color-danger-600)]">{error}</p>}
    </div>
  );
}
