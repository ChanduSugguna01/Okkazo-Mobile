import { UserProfile, UserRole } from "@/src/types/auth";

const normalizeKey = (value?: string | null) => {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
};

const isCoordinatorEligible = (profile: UserProfile | null) => {
  if (!profile) {
    return false;
  }

  if (String(profile.role).toUpperCase() !== "MANAGER") {
    return false;
  }

  const assignedRoleKey = normalizeKey(profile.assignedRole);
  const departmentKey = normalizeKey(profile.department);

  return assignedRoleKey.includes("eventcoordinator") || departmentKey.includes("coreoperation");
};

export const resolveHomeRoute = (
  profile: UserProfile | null,
  sessionRole?: UserRole | null
): "/login" | "/coming-soon" | "/coordinator" => {
  const resolvedRole = String(profile?.role ?? sessionRole ?? "").toUpperCase();

  if (!resolvedRole) {
    return "/login";
  }

  if (resolvedRole === "MANAGER") {
    return isCoordinatorEligible(profile) ? "/coordinator" : "/coming-soon";
  }

  if (resolvedRole === "USER" || resolvedRole === "ADMIN" || resolvedRole === "VENDOR") {
    return "/coming-soon";
  }

  return "/coming-soon";
};
