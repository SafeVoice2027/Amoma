import type { ReportEvidence } from "@/types/database";

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  screen_recording: "Screen recording",
  screenshot: "Screenshot",
  photo: "Photo",
};

export type EvidenceItem = ReportEvidence & { url: string | null };

// The files a reporter attached, as links that open in a new tab. The bucket
// is private, so each `url` is a short-lived signed URL made by the page.
// Shown inside a <dl> on the staff / Admin / Developer report pages.
export function EvidenceField({ items }: { items: EvidenceItem[] }) {
  return (
    <div>
      <dt className="text-[var(--color-text-muted)]">Evidence</dt>
      <dd className="mt-0.5">
        {items.length === 0 ? (
          "None attached"
        ) : (
          <ul className="space-y-1">
            {items.map((e) => {
              const label = EVIDENCE_TYPE_LABELS[e.file_type] ?? e.file_type;
              return (
                <li key={e.id}>
                  {e.url ? (
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-brand)] hover:underline"
                    >
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                  <span className="text-[var(--color-text-muted)]"> · {new Date(e.uploaded_at).toLocaleDateString()}</span>
                </li>
              );
            })}
          </ul>
        )}
      </dd>
    </div>
  );
}
