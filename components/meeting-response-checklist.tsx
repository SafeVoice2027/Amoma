"use client";

import { useState, useTransition } from "react";
import { submitMeetingResponse } from "@/app/student/actions";
import type { MeetingResponse } from "@/types/database";

const OPTIONS: { value: MeetingResponse; label: string }[] = [
  { value: "attending", label: "Would you be willing to come to the meeting and state your concerns?" },
  { value: "not_attending", label: "Would you be comfortable not attending the meeting?" },
];

export function MeetingResponseChecklist({
  reportId,
  initialResponse,
}: {
  reportId: string;
  initialResponse: MeetingResponse | null;
}) {
  const [response, setResponse] = useState(initialResponse);
  const [pending, startTransition] = useTransition();

  function choose(value: MeetingResponse) {
    setResponse(value);
    startTransition(() => submitMeetingResponse(reportId, value));
  }

  return (
    <div className="mt-3 border-t border-[var(--color-border)] pt-3">
      <p className="text-sm font-medium">
        Either answer is okay — this is just so staff know what to expect.
      </p>
      <div className="mt-2 space-y-2">
        {OPTIONS.map((opt) => {
          const selected = response === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={pending}
              onClick={() => choose(opt.value)}
              aria-pressed={selected}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors disabled:opacity-50 ${
                selected
                  ? "border-[var(--color-brand)] text-[var(--color-brand)]"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-[var(--color-brand)]" : "border-[var(--color-border)]"
                }`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
      {response && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">You can change your answer any time.</p>
      )}
    </div>
  );
}
