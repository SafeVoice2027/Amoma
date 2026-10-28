import { cookies } from "next/headers";
import { getCurrentProfile } from "@/lib/auth";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE, isLanguage, type Language } from "./languages";
import { createTranslator } from "./translate";

// The student's choice follows their account across devices (profiles.language,
// see supabase/migrations/0028_profile_language.sql); the cookie is the
// fallback for a device where the profile column isn't set (or doesn't exist
// yet), and for signed-out pages.
export async function getLanguage(): Promise<Language> {
  const profile = await getCurrentProfile();
  if (profile && isLanguage(profile.language)) return profile.language;

  const cookie = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLanguage(cookie) ? cookie : DEFAULT_LANGUAGE;
}

export async function getT() {
  const lang = await getLanguage();
  return { lang, ...createTranslator(lang) };
}
