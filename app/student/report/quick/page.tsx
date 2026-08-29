"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Video, Siren } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ConfirmationScreen } from "@/components/confirmation-screen";
import { submitBullyReport } from "@/app/student/report/actions";
import { formatCaseId } from "@/lib/reports/case-id";

// For a student in a hurry: just evidence + a short description, no
// step-by-step questions. Always submitted as immediate-danger, which
// forces "critical" severity (see lib/ai/severity.ts) and fires the
// high-urgency staff/admin alert (alertOnCritical in
// app/student/report/actions.ts) — the same pipeline the full wizard's
// Safety Check step already uses, just reached in one step instead of six.
export default function QuickReportPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ id: string; createdAt: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    setError(null);
    if (!description.trim()) {
      setError("Please add at least a brief description of what happened.");
      return;
    }

    const formData = new FormData();
    formData.set("in_immediate_danger", "true");
    formData.set("is_anonymous", "false");
    formData.set("description", description);
    formData.set("bully_type", "");
    formData.set("additional_note", "");
    formData.set("offender_description", "");
    formData.set("happened_before", "");
    formData.set("frequency", "");
    formData.set("location", "");
    formData.set("occurred_at", "");
    formData.set("witnesses", "");
    [...photos, ...videos].forEach((file) => formData.append("evidence", file));

    startTransition(async () => {
      const result = await submitBullyReport(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSubmitted({ id: result.id, createdAt: result.createdAt });
    });
  };

  if (submitted) {
    return <ConfirmationScreen urgent caseId={formatCaseId(submitted.id, submitted.createdAt)} />;
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/student")}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-background)]"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-semibold">Quick Report</h1>
        <span className="flex items-center gap-1 rounded-full bg-[var(--color-danger-100)] px-2.5 py-1 text-xs font-semibold text-[var(--color-danger-700)]">
          <Siren size={12} />
          URGENT
        </span>
      </div>

      <Card>
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger-100)] text-[var(--color-danger-700)]">
            <Siren size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">In a hurry?</h2>
            <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
              Skip the details — this goes straight to staff, flagged for immediate attention. You can
              always add more later from the follow-up thread.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-6 text-center hover:bg-[var(--color-background)]">
            <Camera className="text-[var(--color-text-muted)]" size={22} />
            <span className="text-sm font-medium">Add Photo</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
            />
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-6 text-center hover:bg-[var(--color-background)]">
            <Video className="text-[var(--color-text-muted)]" size={22} />
            <span className="text-sm font-medium">Add Video</span>
            <input
              type="file"
              accept="video/*"
              multiple
              className="hidden"
              onChange={(e) => setVideos(Array.from(e.target.files ?? []))}
            />
          </label>
        </div>

        {(photos.length > 0 || videos.length > 0) && (
          <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
            {[...photos, ...videos].map((f, i) => (
              <li key={i} className="truncate rounded-lg bg-[var(--color-background)] px-3 py-1.5">
                {f.name}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <label htmlFor="quick-description" className="mb-1 block text-sm font-medium">
            What happened?
          </label>
          <textarea
            id="quick-description"
            className="min-h-[7rem] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base outline-none focus:border-[var(--color-brand)]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Just the essentials — a staff member will follow up for more details."
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-[var(--color-danger-50)] px-3 py-2 text-sm text-[var(--color-danger-700)]">
            {error}
          </p>
        )}

        <Button variant="danger" className="mt-5 w-full" onClick={handleSubmit} disabled={pending}>
          {pending ? "Sending..." : "Send Urgent Report"}
        </Button>
      </Card>
    </div>
  );
}
