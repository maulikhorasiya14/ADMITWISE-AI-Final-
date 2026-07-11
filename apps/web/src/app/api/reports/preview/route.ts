import { NextResponse } from "next/server";
import { previewReport } from "@/features/reports/reportService";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await previewReport(body);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
