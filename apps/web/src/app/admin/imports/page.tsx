import Link from "next/link";
import type { Route } from "next";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listExtractionJobs } from "@/features/admin/adminReviewService";

export const dynamic = "force-dynamic";

export default async function AdminImportsPage() {
  const result = await listExtractionJobs();

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Admin imports"
          title="Extraction jobs"
          description="Inspect source processing runs and open their staged records for human review."
        />

        {!result.success ? (
          <ErrorState title="Could not load imports" message={result.message} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No imports found" message="Extraction jobs will appear after a source is processed by the ingestion pipeline." />
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Records</th>
                  <th className="px-4 py-3 font-medium">Validation failures</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Review</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((job) => (
                  <tr key={job.id} className="border-b last:border-b-0">
                    <td className="max-w-[280px] px-4 py-3">{job.source_url ?? job.local_file_path ?? "Source unavailable"}</td>
                    <td className="px-4 py-3">{job.data_category}</td>
                    <td className="px-4 py-3">{job.status}</td>
                    <td className="px-4 py-3">{job.staged_record_count ?? 0}</td>
                    <td className="px-4 py-3">{job.validation_failure_count ?? 0}</td>
                    <td className="px-4 py-3">{new Date(job.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/review?job=${job.id}` as Route} className="font-medium text-primary">
                        Open records
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
