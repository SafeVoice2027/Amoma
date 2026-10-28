import { NextResponse } from "next/server";

// Which build is live right now. The app polls this (components/app-updater.tsx)
// and compares it with the build id baked into the copy running in the browser;
// a mismatch means a newer version has been deployed. Public and tiny on purpose
// — it reveals nothing but an opaque build id — and never cached.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
