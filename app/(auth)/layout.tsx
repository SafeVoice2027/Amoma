import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell footerNote={<p>Your identity is never shared with school staff.</p>}>{children}</AuthShell>;
}
