"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types/database";
import { schoolForImporter } from "@/lib/students/school";
import { parseSf1 } from "@/lib/students/sf1";

// Admin (and Developer): bulk-create (and update) student accounts from the
// school's SF1 registers. Each Admin can only ever work on their OWN school —
// the school is taken from their profile, never from anything they send. (The
// Developer has no school of their own, so they use the first school.) A
// student whose LRN already belongs to another school is never touched.
// Nothing is created by the preview; accounts are only made by
// importStudentBatch, which the page calls in small batches after the
// preview is confirmed.

export interface ImportStudent {
  lrn: string;
  grade: number;
  section: string;
  // Place in the LRN-sorted list of this import (1, 2, 3 ...). A new account's
  // first password is "Amoma" + this number, e.g. Amoma0001.
  seq: number;
}

export interface ImportPlan {
  files: { name: string; grade: number | null; section: string | null; count: number; invalid: number }[];
  students: ImportStudent[];
  newCount: number;
  existingCount: number;
  problems: string[];
}

export type PreviewResult = { error: string } | { plan: ImportPlan };

export interface BatchResultRow {
  lrn: string;
  status: "created" | "updated" | "skipped" | "failed";
  password?: string;
  note?: string;
}

// Admin positions are staff with is_handler = true; the Developer is role "admin".
async function requireImporter(): Promise<Profile | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const allowed = profile.role === "admin" || (profile.role === "staff" && profile.is_handler);
  return allowed ? profile : null;
}


// First passwords are numbered in LRN order: Amoma0001, Amoma0002 ... Nine
// characters, so the student can also keep it past the 8-character minimum. The
// pattern is guessable, which is why every student is asked on first sign-in to
// choose their own.
function firstPassword(seq: number): string {
  return "Amoma" + String(seq).padStart(4, "0");
}

export async function previewStudentImport(formData: FormData): Promise<PreviewResult> {
  const importer = await requireImporter();
  if (!importer) return { error: "Not authorized." };
  const school = await schoolForImporter(createServiceClient(), importer);
  if (!school) return { error: "Your account isn't linked to a school yet." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one SF1 file." };
  if (files.length > 40) return { error: "That's a lot of files — please import 40 or fewer at a time." };

  const planFiles: ImportPlan["files"] = [];
  const byLrn = new Map<string, ImportStudent>();
  const problems: string[] = [];

  for (const file of files) {
    let parsed;
    try {
      parsed = parseSf1(await file.arrayBuffer(), file.name);
    } catch {
      problems.push(`${file.name}: couldn't be read as a spreadsheet.`);
      continue;
    }
    planFiles.push({
      name: file.name,
      grade: parsed.grade,
      section: parsed.section,
      count: parsed.lrns.length,
      invalid: parsed.invalidLrns,
    });
    if (parsed.grade == null || parsed.grade < 1 || parsed.grade > 12 || !parsed.section) {
      problems.push(`${file.name}: couldn't find the grade level and section — skipped.`);
      continue;
    }
    if (!parsed.lrns.length) {
      problems.push(`${file.name}: no LRNs found — skipped.`);
      continue;
    }
    if (parsed.invalidLrns) problems.push(`${file.name}: ${parsed.invalidLrns} entries that aren't 12-digit LRNs were ignored.`);
    for (const lrn of parsed.lrns) {
      if (byLrn.has(lrn)) problems.push(`LRN ${lrn} appears in more than one file — the first one is used.`);
      else byLrn.set(lrn, { lrn, grade: parsed.grade, section: parsed.section, seq: 0 });
    }
  }

  const all = [...byLrn.values()];
  const service = createServiceClient();
  const existing = new Set<string>();
  const elsewhere = new Set<string>();
  for (let i = 0; i < all.length; i += 200) {
    const { data } = await service
      .from("profiles")
      .select("lrn, school_id")
      .in("lrn", all.slice(i, i + 200).map((s) => s.lrn));
    (data ?? []).forEach((r: { lrn: string | null; school_id: string | null }) => {
      if (!r.lrn) return;
      if (r.school_id === school.id) existing.add(r.lrn);
      else elsewhere.add(r.lrn);
    });
  }
  if (elsewhere.size) {
    problems.push(
      `${elsewhere.size} student(s) already have an account at another school, so they are left out.`,
    );
  }
  // Number everyone in LRN order, lowest first, so a student's number doesn't
  // depend on which file they came from.
  const students = all
    .filter((s) => !elsewhere.has(s.lrn))
    .sort((a, b) => a.lrn.localeCompare(b.lrn))
    .map((s, i) => ({ ...s, seq: i + 1 }));

  return {
    plan: {
      files: planFiles,
      students,
      newCount: students.filter((s) => !existing.has(s.lrn)).length,
      existingCount: students.filter((s) => existing.has(s.lrn)).length,
      problems,
    },
  };
}

// One batch (the page sends ~10 at a time so no single request runs long).
// New LRN -> a new approved student account with a numbered first password
// (Amoma0001 ...) that is returned here for the one-time list and never stored or logged. Existing student -> only
// the grade and section are updated; their password and everything else stay
// exactly as they were.
export async function importStudentBatch(students: ImportStudent[]): Promise<{ error?: string; results: BatchResultRow[] }> {
  const admin = await requireImporter();
  if (!admin) return { error: "Not authorized.", results: [] };
  if (!Array.isArray(students) || students.length === 0 || students.length > 20) {
    return { error: "Invalid batch.", results: [] };
  }

  const service = createServiceClient();
  const school = await schoolForImporter(service, admin);
  if (!school) return { error: "Your account isn't linked to a school yet.", results: [] };

  const results: BatchResultRow[] = [];
  for (const s of students) {
    const valid =
      /^\d{12}$/.test(s.lrn) &&
      Number.isInteger(s.seq) &&
      s.seq >= 1 &&
      s.seq <= 99999 &&
      Number.isInteger(s.grade) &&
      s.grade >= 1 &&
      s.grade <= 12 &&
      typeof s.section === "string" &&
      s.section.length > 0 &&
      s.section.length <= 60;
    if (!valid) {
      results.push({ lrn: String(s.lrn), status: "failed", note: "Invalid entry." });
      continue;
    }

    const { data: existing } = await service
      .from("profiles")
      .select("id, role, school_id")
      .eq("lrn", s.lrn)
      .maybeSingle<{ id: string; role: string; school_id: string | null }>();

    if (existing) {
      if (existing.school_id !== school.id) {
        results.push({ lrn: s.lrn, status: "skipped", note: "That LRN belongs to another school." });
        continue;
      }
      if (existing.role !== "student") {
        results.push({ lrn: s.lrn, status: "skipped", note: "That LRN belongs to a non-student account." });
        continue;
      }
      const { error } = await service
        .from("profiles")
        .update({ grade_level: s.grade, section: s.section })
        .eq("id", existing.id);
      if (!error) {
        // Reports this student filed before their grade was known pick it up now.
        await service.from("reports").update({ grade_level: s.grade }).eq("reporter_id", existing.id).is("grade_level", null);
      }
      results.push(error ? { lrn: s.lrn, status: "failed", note: "Couldn't update." } : { lrn: s.lrn, status: "updated" });
      continue;
    }

    const password = firstPassword(s.seq);
    const { data: created, error: authError } = await service.auth.admin.createUser({
      email: `${s.lrn}@lrn.safevoice.internal`,
      password,
      email_confirm: true,
    });
    if (authError || !created.user) {
      results.push({ lrn: s.lrn, status: "failed", note: "Couldn't create the account." });
      continue;
    }

    const { error: profileError } = await service.from("profiles").insert({
      id: created.user.id,
      role: "student",
      lrn: s.lrn,
      full_name: null,
      school_id: school.id,
      status: "approved",
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
      grade_level: s.grade,
      section: s.section,
      must_choose_password: true,
    });
    if (profileError) {
      // Don't leave a login with no profile behind.
      await service.auth.admin.deleteUser(created.user.id);
      console.error("[importStudentBatch] profile insert failed", profileError.message);
      results.push({ lrn: s.lrn, status: "failed", note: "Couldn't finish setting up the account." });
      continue;
    }
    results.push({ lrn: s.lrn, status: "created", password });
  }

  revalidatePath("/developer/accounts");
  revalidatePath("/admin/accounts");
  return { results };
}
