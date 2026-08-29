"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";

// identity_disclosure_log.reason is free text in this schema — these are
// just suggested categories for the UI, folded into that text field.
const REASONS = [
  { value: "Imminent danger to the student", label: "Imminent danger to the student" },
  { value: "Suspected abuse (RA 7610 mandatory reporting)", label: "Suspected abuse (RA 7610 mandatory reporting)" },
  { value: "Legal or law-enforcement request", label: "Legal or law-enforcement request" },
  { value: "Administrative case review", label: "Administrative case review" },
  { value: "Other", label: "Other" },
];

export function RevealIdentity({
  reveal,
}: {
  reveal: (reason: string, notes: string) => Promise<{ name: string; lrn: string | null } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<{ name: string; lrn: string | null } | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (result && !("error" in result)) {
    return (
      <Card className="border-[var(--color-accent-300)] bg-[var(--color-accent-50)]">
        <p className="text-sm text-[var(--color-text-muted)]">Identity revealed and logged</p>
        <p className="mt-1 text-lg font-semibold">{result.name}</p>
        {result.lrn && <p className="text-sm text-[var(--color-text-muted)]">LRN: {result.lrn}</p>}
      </Card>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reveal identity
      </Button>
    );
  }

  return (
    <Card>
      <h3 className="font-semibold">Reveal reporter identity</h3>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        This action is logged permanently. Only reveal identity when legally required.
      </p>
      <div className="mt-4 space-y-3">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional, saved to the audit log)"
          className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        {result && "error" in result && (
          <p className="text-sm text-[var(--color-danger-700)]">{result.error}</p>
        )}
        <div className="flex gap-3">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await reveal(reason, notes)))}
          >
            {pending ? "Revealing..." : "Confirm reveal"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
