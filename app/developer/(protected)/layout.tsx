// Same layout as Handler's /admin — see app/admin/(protected)/layout.tsx for
// the actual implementation. It computes its own basePath from the viewer's
// role, so re-exporting it here (rather than duplicating it) is safe: a
// Developer viewer always gets "/developer" links, a Handler always gets
// "/admin" ones. See lib/supabase/middleware.ts for why the two never mix.
export { default } from "@/app/admin/(protected)/layout";
