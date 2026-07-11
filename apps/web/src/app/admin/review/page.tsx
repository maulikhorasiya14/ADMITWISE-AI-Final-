import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listStagedRecords } from "@/features/admin/adminReviewService";
import { confidenceLevelSchema, dataCategorySchema, stagedRecordStatusSchema } from "@/features/admin/adminReviewCore";
import type { ConfidenceLevel, DataCategory, StagedRecordStatus } from "@/features/admin/adminReviewCore";

export const dynamic = "force-dynamic";

type ReviewPageProps = {
  searchParams: Promise<{
    category?: DataCategory | "all";
    status?: StagedRecordStatus | "all";
    confidence?: ConfidenceLevel | "all";
    job?: string;
    q?: string;
    page?: string;
  }>;
};

const categories = ["all", ...dataCategorySchema.options] as const;
const statuses = ["all", ...stagedRecordStatusSchema.options] as const;
const confidences = ["all", ...confidenceLevelSchema.options] as const;

export default async function AdminReviewPage({ searchParams }: ReviewPageProps) {
  const params = await searchParams;
  const category = categories.includes(params.category ?? "all") ? params.category ?? "all" : "all";
  const status = statuses.includes(params.status ?? "all") ? params.status ?? "all" : "all";
  const confidence = confidences.includes(params.confidence ?? "all") ? params.confidence ?? "all" : "all";
  const page = Number.isFinite(Number(params.page)) ? Number(params.page) : 1;
  const result = await listStagedRecords({
    category,
    status,
    confidence,
    extractionJobId: params.job,
    search: params.q,
    page,
    pageSize: 20
  });

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Review queue"
          title="Staged records"
          description="Review normalized official-data extracts. Staging data stays out of public student pages."
        />

        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm lg:grid-cols-[1fr_180px_180px_160px_auto]">
          <label>
            <span className="text-sm font-medium">Search</span>
            <input name="q" defaultValue={params.q ?? ""} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" />
          </label>
          <label>
            <span className="text-sm font-medium">Category</span>
            <select name="category" defaultValue={category} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Status</span>
            <select name="status" defaultValue={status} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium">Confidence</span>
            <select name="confidence" defaultValue={confidence} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
              {confidences.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          {params.job ? <input type="hidden" name="job" value={params.job} /> : null}
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground lg:self-end">
            <Search className="h-4 w-4" aria-hidden="true" />
            Filter
          </button>
        </form>

        {!result.success ? (
          <ErrorState title="Could not load staged records" message={result.message} />
        ) : result.data.records.length === 0 ? (
          <EmptyState title="No staged records found" message="Try clearing filters, or process an official source through the ingestion pipeline." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="border-b bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Academic year</th>
                    <th className="px-4 py-3 font-medium">Validation errors</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.records.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3">{record.data_category}</td>
                      <td className="px-4 py-3">{record.status}</td>
                      <td className="px-4 py-3">{record.confidence_level}</td>
                      <td className="px-4 py-3">{record.academic_year ?? "Not provided"}</td>
                      <td className="px-4 py-3">{record.validation_errors.length}</td>
                      <td className="px-4 py-3">{new Date(record.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/review/${record.id}` as Route} className="font-medium text-primary">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Page {result.data.page} of {result.data.totalPages}, {result.data.total} records
            </p>
          </>
        )}
      </div>
    </PageContainer>
  );
}
