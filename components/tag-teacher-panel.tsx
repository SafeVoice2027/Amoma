"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, Button } from "@/components/ui";

interface TeacherOption {
  id: string;
  fullName: string;
}

// Admin-only control on a report's detail page: pick a Teacher (search by
// name) and optionally leave a note, which shows up in that Teacher's mail
// inbox (components/teacher-tags-mail.tsx) and fires a notification.
export function TagTeacherPanel({
  teachers,
  tagTeacher,
}: {
  teachers: TeacherOption[];
  tagTeacher: (teacherId: string, note: string) => Promise<{ error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => t.fullName.toLowerCase().includes(q));
  }, [teachers, query]);

  function reset() {
    setOpen(false);
    setQuery("");
    setSelectedId(null);
    setNote("");
    setError(null);
    setSuccess(false);
  }

  function submit() {
    if (!selectedId) {
      setError("Please select a teacher.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await tagTeacher(selectedId, note.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setSelectedId(null);
      setNote("");
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="min-h-0 px-4 py-2 text-sm">
        Tag Teacher
      </Button>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tag a teacher</h2>
        <button type="button" onClick={reset} className="text-sm text-[var(--color-text-muted)]">
          Cancel
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teacher by name..."
        className="mb-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
      />

      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-1 py-2 text-sm text-[var(--color-text-muted)]">No teachers match.</p>
        ) : (
          filtered.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                selectedId === t.id
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "hover:bg-[var(--color-background)]"
              }`}
            >
              {t.fullName}
            </button>
          ))
        )}
      </div>

      <label className="mb-1 block text-sm font-medium">Note (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-brand)]"
      />

      {error && <p className="mb-3 text-sm text-[var(--color-danger-600)]">{error}</p>}
      {success && <p className="mb-3 text-sm text-green-600">Teacher tagged.</p>}

      <Button disabled={pending} onClick={submit} className="min-h-0 px-4 py-2 text-sm">
        {pending ? "Tagging..." : "Tag Teacher"}
      </Button>
    </Card>
  );
}
