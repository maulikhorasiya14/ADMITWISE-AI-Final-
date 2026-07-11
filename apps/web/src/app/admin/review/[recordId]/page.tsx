import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { AdminRecordActions } from "@/features/admin/AdminRecordActions";
import { getStagedRecordDetail } from "@/features/admin/adminReviewService";

export const dynamic = "force-dynamic";

type RecordDetailPageProps = {
  params: Promise<{
    recordId: string;
  }>;
};

export default async function AdminReviewDetailPage({ params }: RecordDetailPageProps) {
  const { recordId } = await params;
  const result = await getStagedRecordDetail(recordId);

  if (!result.success && result.status === 404) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Review record"
          title="Staged record detail"
          description="Inspect the source, extracted values, normalized values and review history before changing state."
        />

        {!result.success ? (
          <ErrorState title="Could not load staged record" message={result.message} />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Link href={"/admin/review" as Route} className="rounded-md border px-4 py-2 text-sm font-medium">
                Back to queue
              </Link>
              <Link href={`/admin/review?job=${result.data.record.extraction_job_id}` as Route} className="rounded-md border px-4 py-2 text-sm font-medium">
                View job records
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-lg border bg-card p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Current status</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <Info label="Status" value={result.data.record.status} />
                  <Info label="Category" value={result.data.record.data_category} />
                  <Info label="Confidence" value={result.data.record.confidence_level} />
                  <Info label="Academic year" value={result.data.record.academic_year ?? "Not provided"} />
                </dl>
              </section>

              <section className="rounded-lg border bg-card p-5 shadow-sm lg:col-span-2">
                <h2 className="text-lg font-semibold">Source information</h2>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <Info label="Source file" value={result.data.sourceFile?.file_name ?? "Not linked"} />
                  <Info label="Source URL" value={result.data.sourceFile?.source_url ?? "Not provided"} />
                  <Info label="Local file" value={result.data.sourceFile?.local_file_path ?? "Not provided"} />
                  <Info label="Checksum" value={result.data.sourceFile?.checksum_sha256 ?? "Not provided"} />
                </dl>
              </section>
            </div>

            <AdminRecordActions
              recordId={result.data.record.id}
              status={result.data.record.status}
              canApprove={result.data.blockers.canApprove}
              canPublish={result.data.blockers.canPublish && result.data.record.status === "approved"}
              isAdmin={result.data.actor.roles.includes("admin")}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <JsonPanel title="Raw extracted data" value={result.data.record.raw_extracted_data} />
              <JsonPanel title="Normalized data" value={result.data.record.normalized_data} />
            </div>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Validation errors</h2>
              {result.data.record.validation_errors.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No validation errors were recorded.</p>
              ) : (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-destructive">
                  {result.data.record.validation_errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Linked conflicts</h2>
              {result.data.conflicts.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No conflicts are linked to this record.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Field</th>
                        <th className="px-3 py-2 font-medium">Severity</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.conflicts.map((conflict) => (
                        <tr key={conflict.id} className="border-b last:border-b-0">
                          <td className="px-3 py-2">{conflict.field_name}</td>
                          <td className="px-3 py-2">{conflict.severity}</td>
                          <td className="px-3 py-2">{conflict.status}</td>
                          <td className="px-3 py-2">{conflict.conflict_key}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Review history</h2>
              {result.data.auditLogs.length === 0 ? (
                <EmptyState title="No review history" message="Actions taken on this staged record will appear here." />
              ) : (
                <ol className="mt-4 space-y-3 text-sm">
                  {result.data.auditLogs.map((log) => (
                    <li key={log.id} className="rounded-md border p-3">
                      <p className="font-medium">
                        {log.action}: {log.previous_status} to {log.new_status}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()} by {log.acting_user ?? "unknown user"}
                      </p>
                      {log.reason_or_notes ? <p className="mt-1">{log.reason_or_notes}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </PageContainer>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}

function JsonPanel({ title, value }: { title: string; value: Record<string, unknown> }) {
  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <pre className="mt-4 max-h-[420px] overflow-auto rounded-md bg-muted p-4 text-xs leading-5">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}
