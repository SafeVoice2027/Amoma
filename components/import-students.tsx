"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileSpreadsheet, Printer, Trash2, Upload } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type {
  BatchResultRow,
  ImportPlan,
  ImportStudent,
  PreviewResult,
} from "@/app/admin/(protected)/students/actions";

const BATCH_SIZE = 10;

// How long a finished import (and its list of first passwords) stays on this
// computer before it is removed automatically.
const KEEP_MS = 24 * 60 * 60 * 1000;

type Phase = "pick" | "preview" | "running" | "done";

interface Actions {
  preview: (formData: FormData) => Promise<PreviewResult>;
  // importedAt is one time for the whole import, so every student in it is
  // stamped as "seen in this register" together.
  runBatch: (students: ImportStudent[], importedAt: string) => Promise<{ error?: string; results: BatchResultRow[] }>;
}

interface ListRow {
  lrn: string;
  gradeSection: string;
  password: string;
}

interface HistoryEntry {
  id: string;
  at: number;
  files: string[];
  created: ListRow[];
  updated: number;
  problems: { lrn: string; note: string }[];
}

// The list of first passwords is kept in THIS browser only (never on the
// server), under the signed-in person's own key, and removed after 24 hours.
function readHistory(key: string): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(key);
    const list: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    const fresh = (list as HistoryEntry[]).filter((e) => e && typeof e.at === "number" && now - e.at < KEEP_MS);
    if (fresh.length !== list.length) writeHistory(key, fresh);
    return fresh;
  } catch {
    return [];
  }
}

function writeHistory(key: string, list: HistoryEntry[]) {
  try {
    if (list.length) window.localStorage.setItem(key, JSON.stringify(list));
    else window.localStorage.removeItem(key);
  } catch {
    // Storage full or blocked — the list is still on screen and downloadable.
  }
}

function timeLeft(at: number): string {
  const ms = Math.max(0, at + KEEP_MS - Date.now());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// "Grade 7 - Dalton" -> [7, "Dalton"], so sections sort by grade then name.
function sectionKey(gradeSection: string): [number, string] {
  const m = gradeSection.match(/^Grade (\d+)\s*-\s*(.*)$/);
  return m ? [Number(m[1]), m[2]] : [999, gradeSection];
}

// Grade, then section, then LRN — so each section's slips sit together and can
// be handed to that section's adviser in one go.
function sortRows(rows: ListRow[]): ListRow[] {
  return [...rows].sort((a, b) => {
    const [ga, sa] = sectionKey(a.gradeSection);
    const [gb, sb] = sectionKey(b.gradeSection);
    return ga - gb || sa.localeCompare(sb) || a.lrn.localeCompare(b.lrn);
  });
}

function groupBySection(rows: ListRow[]): { label: string; rows: ListRow[] }[] {
  const groups: { label: string; rows: ListRow[] }[] = [];
  for (const r of sortRows(rows)) {
    const last = groups[groups.length - 1];
    if (last && last.label === r.gradeSection) last.rows.push(r);
    else groups.push({ label: r.gradeSection || "No section", rows: [r] });
  }
  return groups;
}

function downloadCsv(rows: ListRow[], at: number) {
  // Excel turns a 12-digit number into 1.23457E+11, so the LRN is written as
  // ="123456789012" — Excel and Google Sheets both show it as plain text.
  // Sorted by grade and section so a section's rows are together.
  const lines = [
    "LRN,Grade and section,First password",
    ...sortRows(rows).map((r) => `="${r.lrn}","${r.gradeSection}",${r.password}`),
  ];
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `amoma-first-passwords-${new Date(at).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// One table per grade and section. When printed, each section starts on a new
// page, so a section's slips can be cut and handed to its adviser together.
function PasswordTable({ rows }: { rows: ListRow[] }) {
  return (
    <div className="mt-4 space-y-5">
      {groupBySection(rows).map((group, i) => (
        <div key={group.label} className={i > 0 ? "print:break-before-page" : ""}>
          <h3 className="mb-2 text-sm font-semibold">
            {group.label} <span className="font-normal text-[var(--color-text-muted)]">({group.rows.length})</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                  <th className="px-3 py-2">LRN</th>
                  <th className="px-3 py-2">First password</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((r) => (
                  <tr key={r.lrn} className="break-inside-avoid border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2">{r.lrn}</td>
                    <td className="px-3 py-2 font-mono">{r.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// Upload the school's SF1 registers -> review what will happen -> confirm ->
// accounts are created in small batches -> the list of first passwords is
// shown (download or print). Nothing is created until the confirm button is
// pressed. A copy of each finished import's list stays on this computer for
// 24 hours under "Recent imports".
export function ImportStudents({ actions, storageKey }: { actions: Actions; storageKey: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("pick");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BatchResultRow[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Load what's kept from earlier imports, and drop anything past 24 hours
  // (re-checked every minute while the page stays open).
  useEffect(() => {
    const refresh = () => setHistory(readHistory(storageKey));
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [storageKey]);

  const reset = () => {
    setFiles([]);
    setPlan(null);
    setResults([]);
    setProgress(0);
    setError(null);
    setPhase("pick");
    if (fileInput.current) fileInput.current.value = "";
  };

  const preview = () => {
    setError(null);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    startTransition(async () => {
      const res = await actions.preview(formData);
      if ("error" in res) return setError(res.error);
      setPlan(res.plan);
      setPhase("preview");
    });
  };

  const run = async () => {
    if (!plan) return;
    setPhase("running");
    setError(null);
    setProgress(0);

    const runId = crypto.randomUUID();
    const startedAt = Date.now();
    const importedAt = new Date(startedAt).toISOString();
    const gradeOf = new Map(plan.students.map((s) => [s.lrn, `Grade ${s.grade} - ${s.section}`]));
    const fileNames = plan.files.map((f) => f.name);

    // Saved after every batch, so the list survives even if the page is closed
    // or the connection drops part-way through.
    const save = (rows: BatchResultRow[]) => {
      const entry: HistoryEntry = {
        id: runId,
        at: startedAt,
        files: fileNames,
        created: rows
          .filter((r) => r.status === "created")
          .map((r) => ({ lrn: r.lrn, gradeSection: gradeOf.get(r.lrn) ?? "", password: r.password ?? "" })),
        updated: rows.filter((r) => r.status === "updated").length,
        problems: rows
          .filter((r) => r.status === "failed" || r.status === "skipped")
          .map((r) => ({ lrn: r.lrn, note: r.note ?? r.status })),
      };
      const list = [entry, ...readHistory(storageKey).filter((e) => e.id !== runId)];
      writeHistory(storageKey, list);
      setHistory(list);
    };

    const all: BatchResultRow[] = [];
    for (let i = 0; i < plan.students.length; i += BATCH_SIZE) {
      const res = await actions.runBatch(plan.students.slice(i, i + BATCH_SIZE), importedAt);
      if (res.error) {
        setError(res.error);
        break;
      }
      all.push(...res.results);
      setResults([...all]);
      setProgress(Math.min(plan.students.length, i + BATCH_SIZE));
      save(all);
    }

    setPhase("done");
  };

  const deleteEntry = (id: string) => {
    const list = readHistory(storageKey).filter((e) => e.id !== id);
    writeHistory(storageKey, list);
    setHistory(list);
    if (openId === id) setOpenId(null);
  };

  const created = results.filter((r) => r.status === "created");
  const updated = results.filter((r) => r.status === "updated").length;
  const problems = results.filter((r) => r.status === "failed" || r.status === "skipped");
  const gradeSection = new Map((plan?.students ?? []).map((s) => [s.lrn, `Grade ${s.grade} - ${s.section}`]));
  const createdRows: ListRow[] = created.map((r) => ({
    lrn: r.lrn,
    gradeSection: gradeSection.get(r.lrn) ?? "",
    password: r.password ?? "",
  }));

  return (
    <div className="space-y-6">
      {phase === "pick" && (
        <Card className="print:hidden">
          <h2 className="text-lg font-semibold">1. Choose the SF1 files</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            One file per section (the DepEd School Form 1 spreadsheets). Only each learner&apos;s LRN, the grade and the
            section are read — names and other details in the files are ignored and never stored.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-8 text-center">
            <Upload className="text-[var(--color-text-muted)]" size={24} />
            <span className="text-sm font-medium">Click to choose .xls / .xlsx files</span>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept=".xls,.xlsx"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-[var(--color-text-muted)]">
              {files.map((f) => (
                <li key={f.name} className="flex items-center gap-2">
                  <FileSpreadsheet size={14} /> {f.name}
                </li>
              ))}
            </ul>
          )}
          {error && <p className="mt-3 text-sm text-[var(--color-danger-600)]">{error}</p>}
          <Button className="mt-4" onClick={preview} disabled={!files.length || pending}>
            {pending ? "Reading files..." : "Preview"}
          </Button>
        </Card>
      )}

      {phase === "pick" && history.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold print:hidden">Recent imports</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)] print:hidden">
            The list of first passwords from each import is kept on this computer for 24 hours, then removed
            automatically. It is not stored on the server. Anyone who can open this page on this computer can see it, so
            use <strong>Delete now</strong> once you&apos;ve saved or printed it.
          </p>
          <div className="mt-4 space-y-3">
            {history.map((entry) => {
              const open = openId === entry.id;
              return (
                <div
                  key={entry.id}
                  className={`rounded-xl border border-[var(--color-border)] p-3 ${open ? "" : "print:hidden"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="text-sm">
                      <p className="font-medium">{new Date(entry.at).toLocaleString()}</p>
                      <p className="text-[var(--color-text-muted)]">
                        {entry.created.length} account{entry.created.length === 1 ? "" : "s"} created, {entry.updated}{" "}
                        updated
                        {entry.problems.length ? `, ${entry.problems.length} need attention` : ""} · removed in{" "}
                        {timeLeft(entry.at)}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{entry.files.join(", ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 print:hidden">
                      {entry.created.length > 0 && (
                        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" onClick={() => setOpenId(open ? null : entry.id)}>
                          {open ? "Hide list" : "Show list"}
                        </Button>
                      )}
                      {entry.created.length > 0 && (
                        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" onClick={() => downloadCsv(entry.created, entry.at)}>
                          <Download size={14} /> CSV
                        </Button>
                      )}
                      {open && (
                        <Button variant="secondary" className="!min-h-0 !px-3 !py-1.5 !text-sm" onClick={() => window.print()}>
                          <Printer size={14} /> Print
                        </Button>
                      )}
                      <Button variant="ghost" className="!min-h-0 !px-3 !py-1.5 !text-sm" onClick={() => deleteEntry(entry.id)}>
                        <Trash2 size={14} /> Delete now
                      </Button>
                    </div>
                  </div>
                  {open && <PasswordTable rows={entry.created} />}
                  {open && entry.problems.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-danger-600)]">
                      {entry.problems.map((p) => (
                        <li key={p.lrn}>
                          {p.lrn}: {p.note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {phase === "preview" && plan && (
        <Card>
          <h2 className="text-lg font-semibold">2. Check the preview</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">Nothing has been created yet.</p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-text-muted)]">
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Students</th>
                </tr>
              </thead>
              <tbody>
                {plan.files.map((f) => (
                  <tr key={f.name} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="px-3 py-2">{f.name}</td>
                    <td className="px-3 py-2">{f.grade ?? "?"}</td>
                    <td className="px-3 py-2">{f.section ?? "?"}</td>
                    <td className="px-3 py-2">{f.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[var(--color-background)] p-3">
              <p className="text-[var(--color-text-muted)]">New accounts to create</p>
              <p className="text-2xl font-semibold">{plan.newCount}</p>
            </div>
            <div className="rounded-xl bg-[var(--color-background)] p-3">
              <p className="text-[var(--color-text-muted)]">Existing accounts (grade and section only)</p>
              <p className="text-2xl font-semibold">{plan.existingCount}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Existing students keep their own password. New accounts get a numbered first password (for example Amoma0149, Amoma0150 …
            in LRN order, continuing from the last number your school used), shown to you on the next screen.
          </p>

          {plan.problems.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--color-accent-700)]">
              {plan.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}

          {(plan.missingCount > 0 || plan.missingNoGrade > 0) && (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {plan.missingCount > 0 && (
                <>
                  <strong>{plan.missingCount}</strong> student{plan.missingCount === 1 ? " is" : "s are"} already in
                  Amoma but not in these files. After the import they&apos;re marked &ldquo;Not in latest SF1&rdquo; on
                  the Accounts page, where you can open each one and choose still enrolled, graduated or transferred.
                  Nothing is switched off automatically.{" "}
                </>
              )}
              {plan.missingNoGrade > 0 && (
                <>
                  {plan.missingNoGrade} other account{plan.missingNoGrade === 1 ? " has" : "s have"} no grade recorded
                  (never in a register) and {plan.missingNoGrade === 1 ? "isn't" : "aren't"} tracked.
                </>
              )}
            </p>
          )}

          <div className="mt-5 flex gap-3">
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
            <Button className="flex-1" onClick={run} disabled={plan.students.length === 0}>
              Create {plan.newCount} account{plan.newCount === 1 ? "" : "s"} and update {plan.existingCount}
            </Button>
          </div>
        </Card>
      )}

      {phase === "running" && plan && (
        <Card>
          <h2 className="text-lg font-semibold">Working…</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {progress} of {plan.students.length} done. Please keep this page open.
          </p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--color-background)]">
            <div
              className="h-full rounded-full bg-[var(--color-brand)] transition-all"
              style={{ width: `${plan.students.length ? (progress / plan.students.length) * 100 : 0}%` }}
            />
          </div>
        </Card>
      )}

      {phase === "done" && (
        <Card>
          <h2 className="text-lg font-semibold">Done</h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {created.length} account{created.length === 1 ? "" : "s"} created, {updated} updated
            {problems.length ? `, ${problems.length} need attention` : ""}.
          </p>
          {error && <p className="mt-2 text-sm text-[var(--color-danger-600)]">{error}</p>}

          {created.length > 0 && (
            <>
              <div className="mt-4 rounded-xl border border-[var(--color-accent-300)] bg-[var(--color-accent-50)] p-3 text-sm text-[var(--color-accent-800)]">
                <strong>Save this list now.</strong> A copy is kept on this computer for 24 hours under{" "}
                <strong>Recent imports</strong> (press Import more files to see it), then removed automatically. It is
                not stored on the server. Anyone who has this list can sign in as that student, so hand each student
                only their own and keep the rest secure.
              </div>
              <div className="mt-3 flex flex-wrap gap-3 print:hidden">
                <Button onClick={() => downloadCsv(createdRows, Date.now())}>
                  <Download size={16} className="mr-2" /> Download CSV
                </Button>
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer size={16} className="mr-2" /> Print
                </Button>
              </div>
              <PasswordTable rows={createdRows} />
            </>
          )}

          {problems.length > 0 && (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-[var(--color-danger-600)]">
              {problems.map((r) => (
                <li key={r.lrn}>
                  {r.lrn}: {r.note ?? r.status}
                </li>
              ))}
            </ul>
          )}

          <Button variant="secondary" className="mt-5 print:hidden" onClick={reset}>
            Import more files
          </Button>
        </Card>
      )}
    </div>
  );
}
