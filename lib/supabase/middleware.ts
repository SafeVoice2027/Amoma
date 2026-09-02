import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";

const ROLE_HOME: Record<UserRole, string> = {
  student: "/student",
  staff: "/staff",
  admin: "/admin",
};

// /admin/login and /admin/signup are the unauthenticated entry points to the
// admin role itself — they can't require an already-authenticated admin
// session, or no one could ever reach them.
const ADMIN_PUBLIC_PATHS = ["/admin/login", "/admin/signup"];

// Handlers get "practically the same view" as Admin (see
// supabase/migrations/0010_handlers_and_teacher_tags.sql) — everything
// under /admin is shared, except these two, which stay Admin-only.
const ADMIN_ONLY_PATHS = ["/admin/accounts", "/admin/bug-reports"];

function roleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/admin") && !ADMIN_PUBLIC_PATHS.includes(pathname)) return "admin";
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
      .select("role, status, is_handler")
      .eq("id", user.id)
      .single();

    const isHandler = profile?.role === "staff" && !!profile.is_handler;
    // A Handler is allowed onto /admin itself (same role check every other
    // path uses) EXCEPT the two Admin-only sub-paths.
    const roleMatches =
      profile?.role === requiredRole ||
      (requiredRole === "admin" && isHandler && !ADMIN_ONLY_PATHS.includes(pathname));

    if (!profile || !roleMatches) {
      const url = request.nextUrl.clone();
      url.pathname = profile ? (isHandler ? "/admin" : ROLE_HOME[profile.role as UserRole]) : "/login";
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
