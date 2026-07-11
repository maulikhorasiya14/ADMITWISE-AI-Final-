import { NextResponse } from "next/server";
import { studentProfileSchema } from "@/features/profile/profileSchema";
import { getRecommendationsForProfile } from "@/features/recommendations/recommendationService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = studentProfileSchema.safeParse(body?.profile);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Profile is missing or invalid."
        }
      },
      { status: 400 }
    );
  }

  const result = await getRecommendationsForProfile(parsed.data);
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DATA_INCOMPLETE",
          message: result.message
        }
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
