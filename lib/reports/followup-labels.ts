import type { Profile, ReportFollowup, UserRole } from "@/types/database";

// Only the report's own reporter can post a follow-up as a 'student' (RLS
// on report_followups only allows the reporter or staff/admin to insert) —
// so any 'student'-role author here IS the reporter, with no separate
// lookup needed. That lets us mask their name from Staff on an anonymous
// report the same way visible_reporter_id already does, without ever
// touching the true reporter_id. Admin is never masked, matching how
// RevealIdentity/visible_reporter_id already treat Admin vs Staff.
export function buildFollowupAuthorLabels({
  followups,
  authorProfiles,
  currentUserId,
  isAnonymous,
  viewerRole,
}: {
  followups: Pick<ReportFollowup, "author_id">[];
  authorProfiles: Pick<Profile, "id" | "full_name" | "role">[];
  currentUserId: string;
  isAnonymous: boolean;
  viewerRole: UserRole;
}): Record<string, string> {
  const profileById = new Map(authorProfiles.map((p) => [p.id, p]));
  const labels: Record<string, string> = {};

  for (const f of followups) {
    if (labels[f.author_id]) continue;

    if (f.author_id === currentUserId) {
      labels[f.author_id] = "You";
      continue;
    }

    const author = profileById.get(f.author_id);
    if (!author) {
      labels[f.author_id] = "Unknown";
      continue;
    }

    if (author.role === "student") {
      labels[f.author_id] =
        isAnonymous && viewerRole === "staff" ? "Anonymous student" : (author.full_name ?? "Student");
      continue;
    }

    const roleLabel = author.role === "admin" ? "Admin" : "Staff";
    labels[f.author_id] = author.full_name ? `${author.full_name} (${roleLabel})` : roleLabel;
  }

  return labels;
}
