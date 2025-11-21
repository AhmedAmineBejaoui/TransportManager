export type TransportUserRole = "ADMIN" | "SUPER_ADMIN" | "CHAUFFEUR" | "CLIENT";

const ADMIN_EQUIVALENTS: TransportUserRole[] = ["ADMIN", "SUPER_ADMIN"];

function normalize(value?: string | TransportUserRole): TransportUserRole {
  const text = typeof value === "string" ? value : value ?? "CLIENT";
  const normalized = text.trim().toUpperCase();
  if (ADMIN_EQUIVALENTS.includes(normalized as TransportUserRole)) {
    return normalized as TransportUserRole;
  }
  if (normalized === "CHAUFFEUR") {
    return "CHAUFFEUR";
  }
  return "CLIENT";
}

export function isAdminRole(value?: string | TransportUserRole): boolean {
  const normalizedRole = normalize(value);
  return ADMIN_EQUIVALENTS.includes(normalizedRole);
}

export function getClientRole(value?: string | TransportUserRole): "ADMIN" | "CHAUFFEUR" | "CLIENT" {
  const normalizedRole = normalize(value);
  if (ADMIN_EQUIVALENTS.includes(normalizedRole)) {
    return "ADMIN";
  }
  if (normalizedRole === "CHAUFFEUR") {
    return "CHAUFFEUR";
  }
  return "CLIENT";
}

export function isRoleAllowed(role: string | undefined, allowedRoles: string[]): boolean {
  const normalizedRole = normalize(role);
  return allowedRoles.some((allowed) => {
    const normalizedAllowed = normalize(allowed);
    if (normalizedAllowed === "ADMIN" && ADMIN_EQUIVALENTS.includes(normalizedRole)) {
      return true;
    }
    return normalizedRole === normalizedAllowed;
  });
}
