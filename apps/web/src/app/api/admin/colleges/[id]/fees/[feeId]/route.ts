import { NextRequest, NextResponse } from "next/server";
import { deleteFee } from "@/features/admin/adminCollegeService";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; feeId: string }> }) {
  const { id, feeId } = await params;

  const result = await deleteFee(id, feeId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: { code: result.code, message: result.message } }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
