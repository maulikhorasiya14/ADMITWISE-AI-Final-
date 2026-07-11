import { NextRequest, NextResponse } from "next/server";
import { upsertBranch } from "@/features/admin/adminCollegeService";
import { branchInputSchema } from "@/features/admin/adminCollegeSchemas";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid JSON body." } }, { status: 400 });
  }

  const parsed = branchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues.map((i) => i.message).join("; ") } },
      { status: 400 }
    );
  }

  const result = await upsertBranch(id, parsed.data);
  if (!result.success) {
    return NextResponse.json({ success: false, error: { code: result.code, message: result.message } }, { status: result.status });
  }
  return NextResponse.json({ success: true, data: result.data });
}
