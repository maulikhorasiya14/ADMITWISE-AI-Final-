import { NextResponse } from "next/server";
import { z } from "zod";
import { studentProfileSchema } from "@/features/profile/profileSchema";
import { getScholarshipMatches } from "@/features/scholarships/scholarshipService";

const scholarshipRequestSchema = z.object({
  profile: studentProfileSchema,
  collegeId: z.string().min(1).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = scholarshipRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Scholarship matching requires a valid saved profile."
        }
      },
      { status: 400 }
    );
  }

  const result = await getScholarshipMatches(parsed.data);
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
