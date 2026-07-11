import { NextResponse } from "next/server";
import { exportCollegeReadiness, parseReadinessFilters } from "@/features/readiness/readinessService";

const readinessExportHeaders = [
  "college_id",
  "college_name",
  "readiness_state",
  "completeness_percentage",
  "is_published",
  "published_branches",
  "cutoff_years",
  "latest_fee_year",
  "latest_placement_year",
  "pending_review_count",
  "approved_unpublished_count",
  "unresolved_conflict_count",
  "missing_source_reference_count",
  "missing_or_blocked_items"
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const result = await exportCollegeReadiness(parseReadinessFilters(url));

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: { code: result.code, message: result.message } },
      { status: result.status }
    );
  }

  if (format === "json") {
    return NextResponse.json({ success: true, data: result.data });
  }

  const csv = toCsv(result.data);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="admitwise-data-readiness.csv"'
    }
  });
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : readinessExportHeaders;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
