"use client";

import { useTransition } from "react";
import { Button, Card } from "@/components/ui";
import type { UserRole } from "@/types/database";

const ROLE_LABELS: Record<UserRole, string> = { student: "Student", staff: "Staff", admin: "Admin" };

interface PendingProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  lrn: string | null;
  deped_email: string | null;
  employee_number: string | null;
  created_at: string;
}

export function ApprovalRow({
  profile,
  onApprove,
  onReject,
}: {
  profile: PendingProfile;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="font-medium">
          {profile.full_name ?? (profile.role === "student" ? "Anonymous student" : "(no name on file)")}
        </p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {ROLE_LABELS[profile.role]} · {profile.lrn ?? profile.deped_email ?? profile.employee_number} · requested{" "}
          {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => startTransition(() => onReject(profile.id))}
          className="min-h-0 px-3 py-2 text-sm"
        >
          Reject
        </Button>
        <Button
          disabled={pending}
          onClick={() => startTransition(() => onApprove(profile.id))}
          className="min-h-0 px-3 py-2 text-sm"
        >
          Approve
        </Button>
      </div>
    </Card>
  );
}
