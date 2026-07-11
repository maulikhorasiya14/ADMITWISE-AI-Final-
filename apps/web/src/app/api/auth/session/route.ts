import { NextResponse } from "next/server";
import { getPostSignInPath } from "@/features/auth/authCore";
import { getCurrentUserWithRoles } from "@/features/auth/authService";

export async function GET() {
  const result = await getCurrentUserWithRoles();

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.code,
          message: result.message
        }
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: result.data,
      roles: result.data.roles,
      postSignInPath: getPostSignInPath(result.data.roles)
    }
  });
}
