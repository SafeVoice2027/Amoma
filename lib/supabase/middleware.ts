import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Four distinct areas, each with its own "who's allowed" check — Handler and
// the real superuser used to share /admin, which is exactly the "same
// mistake" this split exists to avoid: a Handler (branded "Admin") only ever
// reaches /admin/*, the real admin role (branded "Developer") only ever
// reaches /developer/*, and neither can wander onto the other's URLs even by
// typing them directly. The two route trees render the same underlying
// pages (see app/developer/(protected)/* — thin re-exports of
// app/admin/(protected)/*) but every internal link is computed from the
// viewer's own role, so once routed correctly a session never crosses back.
type Area = "student" | "staff" | "handler" | "developer";

const AREA_HOME: Record<Area, string> = {
  student: "/student",
  staff: "/staff",
  handler: "/admin",
  developer: "/developer",
};

// The login pages are the unauthenticated entry points to their area — they
// can't require an already-authenticated session of that role, or no one
// could ever reach them.
const LOGIN_PATHS = ["/admin/login", "/developer/login"];

function areaForPath(pathname: string): Area | null {
  if (LOGIN_PATHS.includes(pathname)) return null;
  if (pathname.startsWith("/student")) return "student";
  if (pathname.startsWith("/staff")) return "staff";
  if (pathname.startsWith("/admin")) return "handler";
  if (pathname.startsWith("/developer")) return "developer";
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
  const requiredArea = areaForPath(pathname);

  if (requiredArea) {
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
    const viewerArea: Area | null = !profile
      ? null
      : profile.role === "admin"
        ? "developer"
        : isHandler
          ? "handler"
          : (profile.role as Area);

    if (!profile || viewerArea !== requiredArea) {
      const url = request.nextUrl.clone();
      url.pathname = viewerArea ? AREA_HOME[viewerArea] : "/login";
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
