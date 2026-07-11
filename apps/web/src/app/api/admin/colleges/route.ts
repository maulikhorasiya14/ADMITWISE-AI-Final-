import { NextResponse } from "next/server";
import { listAllColleges } from "@/features/admin/adminCollegeService";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await listAllColleges();
  if (!result.success) {
    return NextResponse.json({ success: false, error: { code: result.code, message: result.message } }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
