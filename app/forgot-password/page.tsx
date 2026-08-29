import Link from "next/link";
import { MailQuestion } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

// No self-service email reset: student accounts sign in with an LRN backed
// by a synthetic auth email with no real inbox, so a "check your email"
// flow wouldn't work for them. Password resets go through an Admin instead.
export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Card>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-100)] text-[var(--color-primary-700)]">
          <MailQuestion size={22} />
        </div>
        <h1 className="text-lg font-semibold">Forgot your password?</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
          Passwords are reset by your school admin, not by email — please contact them directly
          and they can set a new password for your account from the Admin dashboard.
        </p>
        <Link href="/login">
          <Button variant="secondary" className="mt-6 w-full">
            Back to log in
          </Button>
        </Link>
      </Card>
    </AuthShell>
  );
}
