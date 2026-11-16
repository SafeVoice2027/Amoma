import * as XLSX from "xlsx";

// Reads one DepEd School Form 1 (SF1) register — the class list a school keeps
// per section. The layout (checked against the school's own files): Grade
// Level and Section sit in labelled cells near the top ("Grade Level" -> the
// next filled cell reads "Grade 7 (Year I)"), and the learners' LRNs run down
// column A from the row after the column headings.
//
// Only three things are ever taken from a file: the LRN, the grade, and the
// section. The register also holds names, sex, birthdates and more — none of
// that is read, kept or sent anywhere.
export interface Sf1Parsed {
  fileName: string;
  grade: number | null;
  section: string | null;
  lrns: string[];
  // Cells in the LRN column that look like an LRN but aren't 12 digits.
  invalidLrns: number;
}

const LRN_PATTERN = /^\d{12}$/;

function valueAfterLabel(rows: string[][], label: string): string | null {
  for (const row of rows.slice(0, 12)) {
    const i = row.findIndex((cell) => cell.trim().toLowerCase() === label);
    if (i === -1) continue;
    const next = row.slice(i + 1).find((cell) => cell.trim() !== "");
    if (next) return next.trim();
  }
  return null;
}

// "DALTON" -> "Dalton"; leaves anything with mixed case as written.
function tidySection(raw: string): string {
  return raw === raw.toUpperCase() ? raw.charAt(0) + raw.slice(1).toLowerCase() : raw;
}

export function parseSf1(buffer: ArrayBuffer, fileName: string): Sf1Parsed {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "", raw: false }).map((r) =>
    r.map((c) => String(c)),
  );

  const gradeText = valueAfterLabel(rows, "grade level");
  const gradeMatch = gradeText?.match(/(\d{1,2})/);
  const sectionText = valueAfterLabel(rows, "section");

  const lrns: string[] = [];
  let invalidLrns = 0;
  for (const row of rows) {
    const cell = (row[0] ?? "").trim();
    if (LRN_PATTERN.test(cell)) lrns.push(cell);
    else if (/^\d{6,}$/.test(cell)) invalidLrns++;
  }

  return {
    fileName,
    grade: gradeMatch ? Number(gradeMatch[1]) : null,
    section: sectionText ? tidySection(sectionText) : null,
    lrns: [...new Set(lrns)],
    invalidLrns,
  };
}
