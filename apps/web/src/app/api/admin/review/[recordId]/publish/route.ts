import { NextResponse } from "next/server";
import { publishApprovedRecord } from "@/features/admin/adminReviewService";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { recordId } = await context.params;
  const result = await publishApprovedRecord(recordId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
