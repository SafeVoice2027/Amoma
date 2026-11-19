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
//
// The same page also switches student accounts off (graduated / transferred)
// and back on. Switching off never deletes anything: the account and all its
// reports stay, the student just can't log in (profile status "suspended" plus
// a login ban). Only students of the person's own school can be touched.

export interface ImportStudent {
  lrn: string;
  grade: number;
  section: string;
}

export interface ImportPlan {
  files: { name: string; grade: number | null; section: string | null; count: number; invalid: number }[];
  students: ImportStudent[];
  newCount: number;
  existingCount: number;
  problems: string[];
  // Active students of this school who had a grade recorded but are NOT in the
  // files. They are marked "Not in latest SF1" on the Accounts page, where an
  // Admin records each one as still enrolled, graduated or transferred. Counted
  // here only.
  missingCount: number;
  // Active students with no grade recorded (never in a register) — counted
  // only, not listed.
  missingNoGrade: number;
}

export type SwitchOffReason = "graduated" | "transferred" | "other";

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


// First passwords are numbered: Amoma0149, Amoma0150 ... Nine characters, so
// the student can also keep it past the 8-character minimum. The numbers keep
// counting across imports (schools.last_first_password_number, handed out
// atomically by next_first_password_number — migration 0037), so a number is
// never given to two students at the same school. The pattern is guessable,
// which is why every student is asked on first sign-in to choose their own.
function firstPassword(n: number): string {
  return "Amoma" + String(n).padStart(4, "0");
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
      else byLrn.set(lrn, { lrn, grade: parsed.grade, section: parsed.section });
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
  // LRN order, lowest first: new accounts are created (and numbered) in this
  // order, whichever file a student came from.
  const students = all.filter((s) => !elsewhere.has(s.lrn)).sort((a, b) => a.lrn.localeCompare(b.lrn));

  // Year-end cleanup list: this school's active students who aren't in the files.
  const inFiles = new Set(students.map((s) => s.lrn));
  let missingCount = 0;
  let missingNoGrade = 0;
  for (let from = 0; ; from += 1000) {
    const { data } = await service
      .from("profiles")
      .select("lrn, grade_level, section")
      .eq("role", "student")
      .eq("school_id", school.id)
      .eq("status", "approved")
      .not("lrn", "is", null)
      .order("lrn", { ascending: true })
      .range(from, from + 999);
    for (const r of (data ?? []) as { lrn: string; grade_level: number | null; section: string | null }[]) {
      if (inFiles.has(r.lrn)) continue;
      if (r.grade_level == null) missingNoGrade++;
      else missingCount++;
    }
    if (!data || data.length < 1000) break;
  }

  // Students in the files who are already switched off stay off.
  let stillOff = 0;
  for (let i = 0; i < students.length; i += 200) {
    const { count } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", school.id)
      .eq("status", "suspended")
      .in("lrn", students.slice(i, i + 200).map((s) => s.lrn));
    stillOff += count ?? 0;
  }
  if (stillOff) {
    problems.push(
      `${stillOff} student(s) in these files are switched off and will stay off. Switch them back on from the list at the bottom of this page if they're back.`,
    );
  }

  return {
    plan: {
      files: planFiles,
      students,
      newCount: students.filter((s) => !existing.has(s.lrn)).length,
      existingCount: students.filter((s) => existing.has(s.lrn)).length,
      problems,
      missingCount,
      missingNoGrade,
    },
  };
}

// One batch (the page sends ~10 at a time so no single request runs long).
// New LRN -> a new approved student account with a numbered first password
// (Amoma0001 ...) that is returned here for the one-time list and never stored or logged. Existing student -> only
// the grade and section are updated; their password and everything else stay
// exactly as they were.
export async function importStudentBatch(
  students: ImportStudent[],
  importedAt: string,
): Promise<{ error?: string; results: BatchResultRow[] }> {
  const admin = await requireImporter();
  if (!admin) return { error: "Not authorized.", results: [] };
  // One time for the whole import (the page makes it when the import starts);
  // it must be recent so it can't be used to rewrite history.
  const stampMs = Date.parse(importedAt);
  if (!Number.isFinite(stampMs) || Math.abs(Date.now() - stampMs) > 6 * 60 * 60 * 1000) {
    return { error: "Invalid import time.", results: [] };
  }
  const stamp = new Date(stampMs).toISOString();
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
        .update({ grade_level: s.grade, section: s.section, last_in_sf1_at: stamp })
        .eq("id", existing.id);
      if (!error) {
        // Reports this student filed before their grade was known pick it up now.
        await service.from("reports").update({ grade_level: s.grade }).eq("reporter_id", existing.id).is("grade_level", null);
      }
      results.push(error ? { lrn: s.lrn, status: "failed", note: "Couldn't update." } : { lrn: s.lrn, status: "updated" });
      continue;
    }

    // Next number for this school (atomic; never handed out twice).
    const { data: number, error: numberError } = await service.rpc("next_first_password_number", {
      p_school_id: school.id,
    });
    if (numberError || typeof number !== "number") {
      console.error("[importStudentBatch] couldn't get the next password number", numberError?.message);
      results.push({ lrn: s.lrn, status: "failed", note: "Couldn't create a first password." });
      continue;
    }
    const password = firstPassword(number);
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
      last_in_sf1_at: stamp,
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

// Block (or allow) the login itself. A banned account can't sign in or refresh
// its session; the profile status change stops any page that is still open.
const BAN_FOREVER = "876000h"; // ~100 years

export interface SwitchResult {
  error?: string;
  changed: number;
  skipped: number;
}

// Switch student accounts off. Only active students of the caller's own school
// are touched — never staff, Admins or the Developer. Nothing is deleted.
export async function switchOffStudents(lrns: string[], reason: SwitchOffReason): Promise<SwitchResult> {
  const importer = await requireImporter();
  if (!importer) return { error: "Not authorized.", changed: 0, skipped: 0 };
  if (!Array.isArray(lrns) || lrns.length === 0 || lrns.length > 50) return { error: "Invalid request.", changed: 0, skipped: 0 };
  if (!["graduated", "transferred", "other"].includes(reason)) return { error: "Invalid reason.", changed: 0, skipped: 0 };

  const service = createServiceClient();
  const school = await schoolForImporter(service, importer);
  if (!school) return { error: "Your account isn't linked to a school yet.", changed: 0, skipped: 0 };

  let changed = 0;
  let skipped = 0;
  for (const lrn of lrns) {
    if (!/^\d{12}$/.test(String(lrn))) {
      skipped++;
      continue;
    }
    const { data: p } = await service
      .from("profiles")
      .select("id")
      .eq("lrn", lrn)
      .eq("role", "student")
      .eq("school_id", school.id)
      .eq("status", "approved")
      .maybeSingle<{ id: string }>();
    if (!p) {
      skipped++;
      continue;
    }
    const { error: banError } = await service.auth.admin.updateUserById(p.id, { ban_duration: BAN_FOREVER });
    if (banError) {
      console.error("[switchOffStudents] ban failed", banError.message);
      skipped++;
      continue;
    }
    const { error } = await service
      .from("profiles")
      .update({ status: "suspended", deactivated_at: new Date().toISOString(), deactivated_reason: reason })
      .eq("id", p.id);
    if (error) {
      // Put the login back so the account isn't left half switched off.
      await service.auth.admin.updateUserById(p.id, { ban_duration: "none" });
      skipped++;
      continue;
    }
    changed++;
  }

  revalidatePath("/admin/students");
  revalidatePath("/developer/students");
  return { changed, skipped };
}

// Switch one student back on (a transfer that came back, or a mistake).
export async function switchOnStudent(lrn: string): Promise<{ error: string | null }> {
  const importer = await requireImporter();
  if (!importer) return { error: "Not authorized." };
  if (!/^\d{12}$/.test(String(lrn))) return { error: "That isn't a valid LRN." };

  const service = createServiceClient();
  const school = await schoolForImporter(service, importer);
  if (!school) return { error: "Your account isn't linked to a school yet." };

  const { data: p } = await service
    .from("profiles")
    .select("id")
    .eq("lrn", lrn)
    .eq("role", "student")
    .eq("school_id", school.id)
    .eq("status", "suspended")
    .maybeSingle<{ id: string }>();
  if (!p) return { error: "No switched-off student with that LRN." };

  const { error: banError } = await service.auth.admin.updateUserById(p.id, { ban_duration: "none" });
  if (banError) return { error: "Couldn't switch the account back on." };
  const { error } = await service
    .from("profiles")
    .update({ status: "approved", deactivated_at: null, deactivated_reason: null })
    .eq("id", p.id);
  if (error) return { error: "Couldn't switch the account back on." };

  revalidatePath("/admin/students");
  revalidatePath("/developer/students");
  return { error: null };
}

// Switch off ONE student by LRN, e.g. someone who transferred mid-year.
export async function switchOffOneStudent(lrn: string, reason: SwitchOffReason): Promise<{ error: string | null }> {
  const res = await switchOffStudents([String(lrn).trim()], reason);
  if (res.error) return { error: res.error };
  if (!res.changed) return { error: "No active student with that LRN at your school." };
  return { error: null };
}
