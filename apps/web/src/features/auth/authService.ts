import "server-only";

import { z } from "zod";
import { canAccessAdminRoutes, authRoleSchema, type SignedInUser } from "@/features/auth/authCore";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; code: "UNAUTHORIZED" | "FORBIDDEN" | "DATA_INCOMPLETE"; message: string; status: number };

const roleRowsSchema = z.array(z.object({ role: authRoleSchema }));

export async function getCurrentUserWithRoles(): Promise<AuthResult<SignedInUser>> {
  try {
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        code: "UNAUTHORIZED",
        message: "Sign in is required.",
        status: 401
      };
    }

    const serviceClient = createSupabaseServiceRoleClient();
    const { data, error } = await serviceClient.from("user_roles").select("role").eq("user_id", user.id);

    if (error) {
      return {
        success: false,
        code: "DATA_INCOMPLETE",
        message: "Unable to verify your account role.",
        status: 500
      };
    }

    const roles = roleRowsSchema.parse(data ?? []).map((row) => row.role);
    return {
      success: true,
      data: {
        id: user.id,
        email: user.email ?? null,
        roles
      }
    };
  } catch {
    return {
      success: false,
      code: "DATA_INCOMPLETE",
      message: "Authentication services are not configured.",
      status: 500
    };
  }
}

export async function requireAdminRouteAccess(): Promise<AuthResult<SignedInUser>> {
  const result = await getCurrentUserWithRoles();
  if (!result.success) {
    return result;
  }

  if (!canAccessAdminRoutes(result.data.roles)) {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "Your account does not have admin or researcher access.",
      status: 403
    };
  }

  return result;
}
