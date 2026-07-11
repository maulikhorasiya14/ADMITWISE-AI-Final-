import { NextResponse } from "next/server";
import { getStagedRecordDetail } from "@/features/admin/adminReviewService";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { recordId } = await context.params;
  const result = await getStagedRecordDetail(recordId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
