import { NextRequest, NextResponse } from "next/server";
import { deletePlacement } from "@/features/admin/adminCollegeService";

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; placementId: string }> }) {
  const { id, placementId } = await params;

  const result = await deletePlacement(id, placementId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: { code: result.code, message: result.message } }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
