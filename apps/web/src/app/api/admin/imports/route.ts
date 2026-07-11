import { NextResponse } from "next/server";
import { listExtractionJobs } from "@/features/admin/adminReviewService";

export async function GET() {
  const result = await listExtractionJobs();
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
