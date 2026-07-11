import { z } from "zod";

export const authRoleSchema = z.enum(["student", "researcher", "admin"]);

export type AuthRole = z.infer<typeof authRoleSchema>;

export type SignedInUser = {
  id: string;
  email: string | null;
  roles: AuthRole[];
};

export function canAccessAdminRoutes(roles: AuthRole[]) {
  return roles.includes("researcher") || roles.includes("admin");
}

export function getPostSignInPath(roles: AuthRole[], fallback = "/dashboard") {
  return canAccessAdminRoutes(roles) ? "/admin" : fallback;
}
