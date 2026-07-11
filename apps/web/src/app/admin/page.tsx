import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, ClipboardList, FileSearch, ShieldCheck, Gauge, Building2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { getAdminOverview } from "@/features/admin/adminReviewService";

export const dynamic = "force-dynamic";

const metricIcons = {
  pendingReview: ClipboardList,
  approvedUnpublished: ShieldCheck,
  rejected: FileSearch,
  unresolvedConflicts: AlertTriangle
} as const;

export default async function AdminPage() {
  const result = await getAdminOverview();

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Admin"
          title="Official data review"
          description="Review staging records, approve verified extracts and publish approved records through controlled server-side actions."
        />

        {!result.success ? (
          <ErrorState title="Admin access unavailable" message={result.message} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["pendingReview", "Pending review", result.data.counts.pendingReview],
                ["approvedUnpublished", "Approved unpublished", result.data.counts.approvedUnpublished],
                ["rejected", "Rejected", result.data.counts.rejected],
                ["unresolvedConflicts", "Unresolved conflicts", result.data.counts.unresolvedConflicts]
              ].map(([key, label, value]) => {
                const Icon = metricIcons[key as keyof typeof metricIcons];
                return (
                  <div key={key} className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-muted-foreground">{label}</p>
                      <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold">{value}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={"/admin/imports" as Route} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                View imports
              </Link>
              <Link href={"/admin/review" as Route} className="rounded-md border px-4 py-2 text-sm font-medium">
                Open review queue
              </Link>
              <Link href={"/admin/data-readiness" as Route} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium">
                <Gauge className="h-4 w-4" aria-hidden="true" />
                Check readiness
              </Link>
              <Link href={"/admin/colleges" as Route} className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Manage colleges
              </Link>
            </div>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Recent extraction jobs</h2>
              {result.data.recentJobs.length === 0 ? (
                <EmptyState title="No extraction jobs yet" message="Processed official sources will appear here after ingestion jobs are created." />
              ) : (
                <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Source</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Academic year</th>
                        <th className="px-4 py-3 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.recentJobs.map((job) => (
                        <tr key={job.id} className="border-b last:border-b-0">
                          <td className="px-4 py-3">{job.source_url ?? job.local_file_path ?? "Source unavailable"}</td>
                          <td className="px-4 py-3">{job.data_category}</td>
                          <td className="px-4 py-3">{job.status}</td>
                          <td className="px-4 py-3">{job.academic_year ?? "Not provided"}</td>
                          <td className="px-4 py-3">{new Date(job.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PageContainer>
  );
}
