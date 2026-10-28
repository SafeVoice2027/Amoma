// Languages a student can pick in Settings. `label` is each language's own
// name (shown the same way in every language, so a student who can't read the
// current one can still find theirs).
export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "tl", label: "Tagalog" },
  { code: "ceb", label: "Bisaya" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_COOKIE = "amoma-lang";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}
