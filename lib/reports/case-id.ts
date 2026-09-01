// Human-readable case ID shown to students, e.g. "AM-2026-6803". Derived
// deterministically from the report's UUID + creation year so it never has
// to be stored separately, and is stable across renders.
export function formatCaseId(id: string, createdAt: string): string {
  const year = new Date(createdAt).getFullYear();
  const digits = id.replace(/-/g, "");
  const num = parseInt(digits.slice(0, 8), 16) % 10000;
  return `AM-${year}-${String(num).padStart(4, "0")}`;
}
