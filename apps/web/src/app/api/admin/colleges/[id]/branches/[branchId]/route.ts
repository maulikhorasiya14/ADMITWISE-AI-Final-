import { NextRequest, NextResponse } from "next/server";
import { deleteBranch } from "@/features/admin/adminCollegeService";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; branchId: string }> }) {
  const { id, branchId } = await params;

  const result = await deleteBranch(id, branchId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: { code: result.code, message: result.message } }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
