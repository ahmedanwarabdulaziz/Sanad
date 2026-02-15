import type { SalesUser } from "../types";
import { ADMIN_PAGES } from "../constants/pages";

export function canUserAccessPage(user: SalesUser, pageId: string): "view" | "edit" | false {
  if (user.role === "super_admin" || user.role === "admin") return "edit";
  const access = user.pageAccess?.find((a) => a.pageId === pageId);
  if (!access || access.permission === "none") return false;
  return access.permission;
}

export function getAccessiblePages(user: SalesUser) {
  return ADMIN_PAGES.filter((p) => canUserAccessPage(user, p.id));
}
