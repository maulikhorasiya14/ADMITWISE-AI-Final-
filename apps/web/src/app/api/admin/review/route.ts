import { NextResponse } from "next/server";
import { listStagedRecords } from "@/features/admin/adminReviewService";
import { confidenceLevelSchema, dataCategorySchema, stagedRecordStatusSchema } from "@/features/admin/adminReviewCore";
import type { ConfidenceLevel, DataCategory, StagedRecordStatus } from "@/features/admin/adminReviewCore";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categoryParam = url.searchParams.get("category");
  const statusParam = url.searchParams.get("status");
  const confidenceParam = url.searchParams.get("confidence");
  const pageParam = url.searchParams.get("page");

  const category: DataCategory | "all" =
    categoryParam && dataCategorySchema.safeParse(categoryParam).success ? (categoryParam as DataCategory) : "all";
  const status: StagedRecordStatus | "all" =
    statusParam && stagedRecordStatusSchema.safeParse(statusParam).success ? (statusParam as StagedRecordStatus) : "all";
  const confidence: ConfidenceLevel | "all" =
    confidenceParam && confidenceLevelSchema.safeParse(confidenceParam).success ? (confidenceParam as ConfidenceLevel) : "all";

  const result = await listStagedRecords({
    category,
    status,
    confidence,
    extractionJobId: url.searchParams.get("job") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    page: pageParam ? Number(pageParam) : 1,
    pageSize: 20
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
