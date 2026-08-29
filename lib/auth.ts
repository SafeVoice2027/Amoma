import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";

// Every layout AND page in a route tree calls requireProfile() (layout for
// the guard, page for the data). Without memoization each call creates its
// own Supabase client and independently calls auth.getUser() against the
// same request's cookies — when the access token needs refreshing, those
// concurrent calls race to use the same refresh token, and every loser
// fails with "Invalid Refresh Token: Already Used", corrupting the session.
// React's cache() scopes this to a single request, so the network round
// trip (and any refresh) happens exactly once no matter how many call sites
// there are.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return profile;
});

// Server Component helper: loads the signed-in user's profile, or redirects
// to /login. Route-level access is already enforced by middleware; this is
// the data-fetching companion for layouts/pages that need the profile itself.
export async function requireProfile(role?: UserRole): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile || (role && profile.role !== role)) redirect("/login");

  return profile;
}
