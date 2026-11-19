import { getCurrentProfile } from "@/lib/auth";
import type { Profile } from "@/types/database";

// Who may manage which accounts. The Developer can manage any school; an Admin
// (staff with is_handler) only their OWN school, and only as far as their
// position allows:
//   - any Admin: reset the password of a student or teacher at their school
//   - the Learner Formation Officer (LFO) as well: approve / reject staff
//     requests, make staff Admins and set their position, set Employee
//     Numbers, and reset other Admins' passwords
// Nobody can change the Developer account (role "admin") from here, and an
// Admin can't change their own Admin status or position (so they can't lock
// themselves out). Kept out of the "use server" actions files on purpose.
export interface AccountManager {
  profile: Profile;
  isDeveloper: boolean;
  isLfo: boolean;
}

export async function getAccountManager(): Promise<AccountManager | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  if (profile.role === "admin") return { profile, isDeveloper: true, isLfo: false };
  if (profile.role === "staff" && profile.is_handler && profile.school_id) {
    return { profile, isDeveloper: false, isLfo: profile.admin_position === "learner_formation_officer" };
  }
  return null;
}

// Developer, or the LFO of a school: the people who run a school's accounts.
export function canManageAdmins(m: AccountManager): boolean {
  return m.isDeveloper || m.isLfo;
}

export interface AccountTarget {
  id: string;
  role: string;
  is_handler: boolean | null;
  school_id: string | null;
  status?: string | null;
}

function sameSchool(m: AccountManager, t: AccountTarget): boolean {
  return m.isDeveloper || (!!m.profile.school_id && t.school_id === m.profile.school_id);
}

export function canResetPassword(m: AccountManager, t: AccountTarget): boolean {
  if (t.role === "admin" || !sameSchool(m, t)) return false;
  if (t.role === "student" || !t.is_handler) return true;
  return canManageAdmins(m); // another Admin's password
}

// Make someone an Admin, set their position, set their Employee Number.
export function canManageStaff(m: AccountManager, t: AccountTarget): boolean {
  if (t.role !== "staff" || !sameSchool(m, t) || !canManageAdmins(m)) return false;
  return t.id !== m.profile.id;
}

export function canDecideRequest(m: AccountManager, t: AccountTarget): boolean {
  if (!sameSchool(m, t) || !canManageAdmins(m)) return false;
  if (t.status !== "pending") return false;
  return m.isDeveloper || t.role === "staff";
}
