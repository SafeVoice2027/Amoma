// Students sign in with a school-issued PIN instead of a chosen password:
// first 3 letters of their first name + first 3 letters of their last name
// (each Title Cased) + their school's DepEd school ID, no separators.
// e.g. "Jessica Soho" at school 303194 -> "JesSoh303194".
function first3TitleCase(name: string): string {
  const letters = name.replace(/[^a-zA-Z]/g, "").slice(0, 3);
  if (!letters) return "";
  return letters[0].toUpperCase() + letters.slice(1).toLowerCase();
}

export function generateStudentPin(fullName: string, depedSchoolId: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : first;
  return `${first3TitleCase(first)}${first3TitleCase(last)}${depedSchoolId}`;
}
