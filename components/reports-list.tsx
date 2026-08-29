"use client";

import { useState, useSyncExternalStore } from "react";
import { Card } from "@/components/ui";
import { ReportThread, type ReportSummary } from "@/components/report-thread";

const FOLLOWUP_HASH_PREFIX = "#report-";

function subscribeToHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot() {
  return window.location.hash;
}

// SSR (and the very first client render, before hydration) has no
// window.location — useSyncExternalStore uses this to keep that first
// render consistent, then swaps in the real hash right after.
function getServerHashSnapshot() {
  return "";
}

export function ReportsList({
  reports,
  caseIds,
  currentUserId,
  sendMessage,
}: {
  reports: ReportSummary[];
  caseIds: Record<string, string>;
  currentUserId: string;
  sendMessage: (reportId: string, message: string) => Promise<void>;
}) {
  const [expandedByUser, setExpandedByUser] = useState(false);

  // A notification link (#report-<id>) may point at a report outside the
  // default 3-item preview — expand the list so its card actually renders,
  // then ReportThread's own autoOpen effect scrolls to and expands it.
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot, getServerHashSnapshot);
  const highlightId = hash.startsWith(FOLLOWUP_HASH_PREFIX) ? hash.slice(FOLLOWUP_HASH_PREFIX.length) : null;
  const highlightOutsidePreview = highlightId !== null && !reports.slice(0, 3).some((r) => r.id === highlightId);
  const expanded = expandedByUser || highlightOutsidePreview;
  const visible = expanded ? reports : reports.slice(0, 3);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Reports</h2>
        {reports.length > 3 && (
          <button
            type="button"
            onClick={() => setExpandedByUser((e) => !e)}
            className="text-sm font-medium text-[var(--color-brand)]"
          >
            {expanded ? "Show less" : "See All"}
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <Card>
          <p className="text-[var(--color-text-muted)]">
            You haven&apos;t submitted any reports yet. Anything you share stays confidential.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => (
            <ReportThread
              key={r.id}
              report={r}
              caseId={caseIds[r.id]}
              currentUserId={currentUserId}
              sendMessage={sendMessage}
              autoOpen={r.id === highlightId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
