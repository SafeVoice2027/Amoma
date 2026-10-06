"use client";

import { useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen } from "lucide-react";
import { Card, SeverityBadge, StatusBadge } from "@/components/ui";
import { BULLYING_TYPE_LABELS } from "@/lib/reports/bullying-types";
import { formatCaseId } from "@/lib/reports/case-id";
import type { BullyingType, ReportTypeFile } from "@/types/database";

// Folder order is fixed by the Filing System spec (not the report form's
// chip order, which is Social/Cyber/Physical/Verbal).
const FOLDER_ORDER: BullyingType[] = ["verbal", "cyber", "physical", "social"];

// Reused on every staff-facing home (Teacher, Handler/Admin, Developer) —
// deliberately no role logic here. The rows come from report_type_files,
// which runs with the caller's own permissions (see
// supabase/migrations/0021_fix_report_type_files_rls_bypass.sql), so a
// Handler/Developer gets every folder in full and a Teacher gets only the
// reports they've been tagged into — an untagged Teacher just sees four
// empty folders. A report with several bullying types shows up in each
// matching folder on purpose; don't de-duplicate across them.
export function TypeFileBrowser({ rows, reportHrefBase }: { rows: ReportTypeFile[]; reportHrefBase: string }) {
  const [openType, setOpenType] = useState<BullyingType | null>(null);

  const byType = new Map<BullyingType, ReportTypeFile[]>(FOLDER_ORDER.map((t) => [t, []]));
  for (const row of rows) byType.get(row.bullying_type)?.push(row);
  for (const list of byType.values()) {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const openRows = openType ? (byType.get(openType) ?? []) : [];

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Bullying type files</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Reports filed by type. A report with more than one type appears in each folder.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FOLDER_ORDER.map((type) => {
          const count = byType.get(type)?.length ?? 0;
          const active = openType === type;
          const Icon = active ? FolderOpen : Folder;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setOpenType(active ? null : type)}
              aria-pressed={active}
              className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
                active
                  ? "border-[var(--color-brand)] bg-[var(--color-surface)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-background)]"
              }`}
            >
              <Icon size={22} className={active ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"} />
              <span className="font-medium">{BULLYING_TYPE_LABELS[type]}</span>
              <span className="text-sm text-[var(--color-text-muted)]">
                {count} {count === 1 ? "report" : "reports"}
              </span>
            </button>
          );
        })}
      </div>

      {openType && (
        <div className="mt-4 space-y-3">
          {openRows.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)]">No reports filed under this type.</p>
            </Card>
          ) : (
            openRows.map((row) => (
              <Link key={`${row.report_id}-${row.bullying_type}`} href={`${reportHrefBase}/${row.report_id}`}>
                <Card className="flex items-center justify-between gap-3 transition-shadow hover:shadow-md">
                  <div>
                    <p className="font-medium">{formatCaseId(row.report_id, row.created_at)}</p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={row.status} />
                    <SeverityBadge severity={row.severity} />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
