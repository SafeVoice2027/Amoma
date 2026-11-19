"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power } from "lucide-react";
import { Button, Card } from "@/components/ui";

export interface SwitchedOffAccount {
  id: string;
  lrn: string;
  grade: number | null;
  section: string | null;
  reason: string | null;
  at: string | null;
}

// Students whose accounts are switched off (graduated / transferred). They
// don't appear in the list above, so this is where one is switched back on.
// Nothing was deleted: the account and every report they filed are still there.
export function SwitchedOffAccounts({
  students,
  switchOn,
}: {
  students: SwitchedOffAccount[];
  switchOn: (profileId: string) => Promise<{ error: string | null }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (students.length === 0) return null;

  const turnOn = (s: SwitchedOffAccount) => {
    setMessage(null);
    startTransition(async () => {
      const res = await switchOn(s.id);
      if (res.error) return setMessage({ kind: "error", text: res.error });
      setMessage({ kind: "success", text: `${s.lrn} has been switched back on.` });
      router.refresh();
    });
  };

  return (
    <Card className="mt-8">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Power size={18} /> Switched-off students ({students.length})
      </h2>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        These students can&apos;t log in. Nothing is deleted: their account and every report they filed stay, and you
        can switch them back on.
      </p>

      {message && (
        <p className={`mt-3 text-sm ${message.kind === "error" ? "text-[var(--color-danger-600)]" : "text-green-600"}`}>
          {message.text}
        </p>
      )}

      <ul className="mt-3 max-h-72 divide-y divide-[var(--color-border)] overflow-y-auto rounded-xl border border-[var(--color-border)] text-sm">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
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
              onClick={() => turnOn(s)}
            >
              Switch back on
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
