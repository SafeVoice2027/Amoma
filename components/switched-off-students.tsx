"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { SwitchOffReason } from "@/app/admin/(protected)/students/actions";
import type { SwitchedOffStudent } from "@/lib/students/switched-off";

// Below the import: switch one student off by LRN (e.g. a mid-year transfer),
// and see / switch back on the accounts that are off. Switching off never
// deletes anything — the student's reports stay.
export function SwitchedOffStudents({
  students,
  switchOn,
  switchOffOne,
}: {
  students: SwitchedOffStudent[];
  switchOn: (lrn: string) => Promise<{ error: string | null }>;
  switchOffOne: (lrn: string, reason: SwitchOffReason) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [lrn, setLrn] = useState("");
  const [reason, setReason] = useState<SwitchOffReason>("transferred");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  // First press asks "are you sure?" right on the page (a browser pop-up can
  // be blocked, which made the button look dead); the second press does it.
  const askToSwitchOff = () => {
    setMessage(null);
    if (!/^\d{12}$/.test(lrn.trim())) return setMessage({ kind: "error", text: "An LRN has 12 digits." });
    setConfirming(true);
  };

  const turnOffOne = () => {
    const value = lrn.trim();
    setConfirming(false);
    startTransition(async () => {
      const res = await switchOffOne(value, reason);
      if (res.error) return setMessage({ kind: "error", text: res.error });
      setLrn("");
      setMessage({ kind: "success", text: `${value} has been switched off.` });
      router.refresh();
    });
  };

  const turnOn = (value: string) => {
    startTransition(async () => {
      const res = await switchOn(value);
      if (res.error) return setMessage({ kind: "error", text: res.error });
      setMessage({ kind: "success", text: `${value} has been switched back on.` });
      router.refresh();
    });
  };

  return (
    <Card className="mt-6 print:hidden">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Power size={18} /> Switch students off
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        A switched-off student can&apos;t log in. Nothing is deleted: their account and every report they filed stay,
        and you can switch them back on. You can also do this from a student&apos;s row on the Accounts page.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="mb-1 block text-xs text-[var(--color-text-muted)]">Student LRN</span>
          <input
            value={lrn}
            onChange={(e) => {
              setLrn(e.target.value.replace(/\D/g, "").slice(0, 12));
              setConfirming(false);
            }}
            inputMode="numeric"
            placeholder="123456789012"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-brand)]"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--color-text-muted)]">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as SwitchOffReason)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
          >
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
            <option value="other">Other</option>
          </select>
        </label>
        <Button variant="secondary" onClick={askToSwitchOff} disabled={pending || lrn.length !== 12 || confirming}>
          Switch off
        </Button>
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] p-3 text-sm text-[var(--color-accent-800)]">
          <p>
            Switch off the student with LRN <strong>{lrn.trim()}</strong>? They won&apos;t be able to log in. Their reports
            stay, and you can switch them back on.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" className="!min-h-0 !px-4 !py-2 !text-sm" onClick={turnOffOne} disabled={pending}>
              Yes, switch off
            </Button>
            <Button variant="secondary" className="!min-h-0 !px-4 !py-2 !text-sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${message.kind === "error" ? "text-[var(--color-danger-600)]" : "text-green-600"}`}
        >
          {message.text}
        </p>
      )}

      <h3 className="mt-6 text-sm font-semibold">Switched-off students ({students.length})</h3>
      {students.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">None.</p>
      ) : (
        <ul className="mt-2 max-h-72 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)] text-sm">
          {students.map((s) => (
            <li key={s.lrn} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
              <span className="font-mono">{s.lrn}</span>
              <span className="text-[var(--color-text-muted)]">
                {s.grade ? `Grade ${s.grade}` : "No grade"}
                {s.section ? ` - ${s.section}` : ""}
                {s.reason ? ` · ${s.reason}` : ""}
                {s.at ? ` · ${new Date(s.at).toLocaleDateString()}` : ""}
              </span>
              <Button
                variant="ghost"
                className="ml-auto !min-h-0 !px-3 !py-1.5 !text-sm"
                disabled={pending}
                onClick={() => turnOn(s.lrn)}
              >
                Switch back on
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
