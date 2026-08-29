import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

// Refreshes the Supabase auth session on every request and enforces
// role-based access to /student, /staff, /admin at the edge, ahead of RLS.
export async function updateSession(request: NextRequest) {
  // Next.js's <Link> prefetches routes in the background as soon as they're
  // in the viewport — every dashboard has several. Each prefetch is a full
  // HTTP request that would otherwise hit this same auth.getUser() call, and
  // several firing in the same instant race to refresh with the same stale
  // refresh token: only the first succeeds, the rest fail with "Invalid
  // Refresh Token: Already Used" and can corrupt the session for the *real*
  // navigation. Prefetch responses are cache-warming only (Next.js discards
  // them if the user never clicks), so skip the refresh for them entirely —
  // the actual navigation request still goes through full middleware.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";
  if (isPrefetch) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server Action POSTs (identified by the Next-Action header) expect a
  // specific action-result response back — if middleware redirects one
  // instead (e.g. because the refresh above lost a race against another
  // near-simultaneous request and the session looked momentarily invalid),
  // the client can't parse the HTML redirect it gets back and throws "An
  // unexpected response was received from the server" instead of failing
  // gracefully. The page that rendered the button already enforced the
  // real auth/role check on load, and RLS still protects the underlying
  // data, so it's safe to let these through and let the action itself
  // (via getCurrentProfile()) decide what to do.
  const isServerAction = request.headers.has("next-action");
  if (isServerAction) return supabaseResponse;

  const { pathname } = request.nextUrl;
  const requiredRole = roleForPath(pathname);

  if (requiredRole) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = profile ? ROLE_HOME[profile.role as UserRole] : "/login";
      return NextResponse.redirect(url);
    }

    if (profile.status !== "approved") {
      const url = request.nextUrl.clone();
      url.pathname = "/pending-approval";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
