import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectStagedRecord } from "@/features/admin/adminReviewService";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

const rejectRequestSchema = z.object({
  reason: z.string().min(1)
});

export async function POST(request: Request, context: RouteContext) {
  const { recordId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = rejectRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "A rejection reason is required." } },
      { status: 400 }
    );
  }

  const result = await rejectStagedRecord(recordId, parsed.data.reason);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
