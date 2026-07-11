import { NextResponse } from "next/server";
import { z } from "zod";
import { studentProfileSchema } from "@/features/profile/profileSchema";
import { getComparisonForProfile } from "@/features/comparison/comparisonService";
import { comparisonModeSchema } from "@/features/comparison/comparisonTypes";

const compareRequestSchema = z.object({
  profile: studentProfileSchema,
  optionIds: z.array(z.string().min(1)).length(2),
  mode: comparisonModeSchema,
  scholarshipAmount: z.number().min(0).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = compareRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Comparison requires a valid profile and exactly two college-branch options."
        }
      },
      { status: 400 }
    );
  }

  const result = await getComparisonForProfile(parsed.data);
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
