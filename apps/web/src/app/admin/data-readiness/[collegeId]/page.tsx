import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { getCollegeReadinessDetail } from "@/features/readiness/readinessService";
import { readinessStateLabels, type ChecklistSeverity } from "@/features/readiness/readinessTypes";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ collegeId: string }>;
};

export default async function DataReadinessDetailPage({ params }: PageProps) {
  const { collegeId } = await params;
  const result = await getCollegeReadinessDetail(collegeId);

  if (!result.success && result.status === 404) {
    notFound();
  }

  if (!result.success) {
    return (
      <PageContainer>
        <ErrorState title="Readiness details unavailable" message={result.message} />
      </PageContainer>
    );
  }

  const assessment = result.data;

  return (
    <PageContainer>
      <div className="space-y-8">
        <Link href={"/admin/data-readiness" as Route} className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to readiness
        </Link>

        <SectionHeader
          eyebrow="Admin readiness detail"
          title={assessment.collegeName}
          description={`Current state: ${readinessStateLabels[assessment.state]}. Completeness: ${assessment.completenessPercentage}%.`}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryBox label="Published" value={assessment.isPublished ? "Yes" : "No"} />
          <SummaryBox label="Latest fee year" value={assessment.latestFeeYear ?? "Data not publicly available"} />
          <SummaryBox label="Latest placement year" value={assessment.latestPlacementYear ?? "Data not publicly available"} />
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Category coverage</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {assessment.categories.map((category) => (
              <div key={category.category} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{category.label}</h3>
                  <span className="text-sm text-muted-foreground">
                    {category.points}/{category.maxPoints}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{category.summary}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">Action checklist</h2>
            <Link href={"/admin/review" as Route} className="rounded-md border px-4 py-2 text-sm font-medium">
              Open review queue
            </Link>
          </div>
          <div className="space-y-3">
            {assessment.checklist.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <ChecklistIcon severity={item.severity} />
                    <div>
                      <h3 className="font-semibold">{item.label}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                    </div>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">{item.status.replaceAll("_", " ")}</span>
                </div>
                <p className="mt-3 text-sm">{item.action}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Private counters</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryBox label="Staged records" value={assessment.counts.staging.staged} />
            <SummaryBox label="Needs review" value={assessment.counts.staging.needsReview} />
            <SummaryBox label="Approved unpublished" value={assessment.counts.staging.approvedUnpublished} />
            <SummaryBox label="Open conflicts" value={assessment.counts.staging.conflicts} />
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

function SummaryBox({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ChecklistIcon({ severity }: Readonly<{ severity: ChecklistSeverity }>) {
  if (severity === "blocking") {
    return <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />;
  }
  if (severity === "warning") {
    return <Clock3 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />;
  }
  return <CheckCircle2 className="mt-0.5 h-5 w-5 text-positive" aria-hidden="true" />;
}
