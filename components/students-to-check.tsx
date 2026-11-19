"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRoundSearch } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { SwitchOffReason, SwitchResult } from "@/app/admin/(protected)/students/actions";
import type { StudentToCheck } from "@/lib/students/to-check";

type Answer = SwitchOffReason | "enrolled";

const BATCH = 25;

const LABEL: Record<Answer, string> = {
  transferred: "Transferred",
  graduated: "Graduated",
  other: "Other",
  enrolled: "Still enrolled",
};

// After an import: the students who are in Amoma but were NOT in the latest SF1
// files. The page keeps asking until someone answers for each — transferred or
// graduated (switches the account off; nothing is deleted) or still enrolled
// (stops asking until the next import).
export function StudentsToCheck({
  students,
  latestImportAt,
  answer,
}: {
  students: StudentToCheck[];
  latestImportAt: string | null;
  answer: (lrns: string[], answer: Answer) => Promise<SwitchResult>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<Answer | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (students.length === 0) return null;

  const apply = (choice: Answer) => {
    const lrns = [...selected];
    setConfirming(null);
    setMessage(null);
    startTransition(async () => {
      let changed = 0;
      for (let i = 0; i < lrns.length; i += BATCH) {
        const res = await answer(lrns.slice(i, i + BATCH), choice);
        if (res.error) {
          setMessage({ kind: "error", text: res.error });
          break;
        }
        changed += res.changed;
      }
      setSelected(new Set());
      setMessage({
        kind: "success",
        text:
          choice === "enrolled"
            ? `${changed} marked as still enrolled.`
            : `${changed} switched off (${LABEL[choice].toLowerCase()}). You can switch them back on below.`,
      });
      router.refresh();
    });
  };

  const choose = (choice: Answer) => {
    if (selected.size === 0) return;
    if (choice === "enrolled") apply(choice);
    else setConfirming(choice);
  };

  return (
    <Card className="mt-6 print:hidden">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <UserRoundSearch size={18} /> Did they transfer or graduate? ({students.length})
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        These students have an Amoma account but were <strong>not in your latest SF1 import</strong>
        {latestImportAt ? ` (${new Date(latestImportAt).toLocaleDateString()})` : ""}. Tick the ones you know about and
        tell Amoma what happened. Switching off never deletes anything, and you can switch them back on. If you only
        imported some sections, many students will be listed by mistake — mark those as <em>Still enrolled</em>.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Button
          variant="secondary"
          className="!min-h-0 !px-3 !py-1.5 !text-sm"
          onClick={() => setSelected(new Set(students.map((s) => s.lrn)))}
        >
          Tick all
        </Button>
        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" onClick={() => setSelected(new Set())}>
          Clear
        </Button>
        <span className="text-xs text-[var(--color-text-muted)]">{selected.size} ticked</span>
      </div>

      <ul className="mt-3 max-h-72 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)] text-sm">
        {students.map((s) => (
          <li key={s.lrn}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={selected.has(s.lrn)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(s.lrn);
                  else next.delete(s.lrn);
                  setSelected(next);
                  setConfirming(null);
                }}
              />
              <span className="font-mono">{s.lrn}</span>
              <span className="text-[var(--color-text-muted)]">
                Grade {s.grade}
                {s.section ? ` - ${s.section}` : ""}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">For the ticked students:</span>
        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" disabled={pending || !selected.size} onClick={() => choose("transferred")}>
          Transferred
        </Button>
        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" disabled={pending || !selected.size} onClick={() => choose("graduated")}>
          Graduated
        </Button>
        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" disabled={pending || !selected.size} onClick={() => choose("enrolled")}>
          Still enrolled
        </Button>
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] p-3 text-sm text-[var(--color-accent-800)]">
          <p>
            Switch off <strong>{selected.size}</strong> student account{selected.size === 1 ? "" : "s"} as{" "}
            <strong>{LABEL[confirming].toLowerCase()}</strong>? They won&apos;t be able to log in. Their reports stay, and
            you can switch them back on.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" className="!min-h-0 !px-4 !py-2 !text-sm" disabled={pending} onClick={() => apply(confirming)}>
              Yes, switch off
            </Button>
            <Button variant="secondary" className="!min-h-0 !px-4 !py-2 !text-sm" onClick={() => setConfirming(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.kind === "error" ? "text-[var(--color-danger-600)]" : "text-green-600"}`}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
