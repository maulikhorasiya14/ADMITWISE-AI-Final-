import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, CheckCircle2, Clock3, FileDown, Filter, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listCollegeReadiness, parseReadinessFilters } from "@/features/readiness/readinessService";
import { readinessCategoryLabels, readinessStateLabels, type ReadinessAssessment } from "@/features/readiness/readinessTypes";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const stateOptions = [
  "all",
  "not_started",
  "staged",
  "needs_review",
  "blocked",
  "approved_unpublished",
  "partially_published",
  "demo_ready"
];

const categoryOptions = ["all", "college_identity", "branches", "cutoffs", "fees", "placements", "scholarships", "sources"];

export default async function DataReadinessPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const url = new URL("https://admitwise.local/admin/data-readiness");
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  });

  const filters = parseReadinessFilters(url);
  const result = await listCollegeReadiness(filters);
  const exportQuery = buildExportQuery(resolvedSearchParams);

  return (
    <PageContainer>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            eyebrow="Admin"
            title="Data readiness"
            description="Check whether each selected college has enough verified, published evidence for a private-beta demo."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/api/admin/data-readiness/export?format=csv${exportQuery}` as Route}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              CSV
            </Link>
            <Link
              href={`/api/admin/data-readiness/export?format=json${exportQuery}` as Route}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              JSON
            </Link>
          </div>
        </div>

        {!result.success ? (
          <ErrorState title="Readiness unavailable" message={result.message} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Demo ready" value={result.data.summary.demoReady} icon={<CheckCircle2 className="h-5 w-5 text-positive" />} />
              <MetricCard label="Blocked" value={result.data.summary.blocked} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} />
              <MetricCard label="Needs review" value={result.data.summary.needsReview} icon={<Clock3 className="h-5 w-5 text-primary" />} />
              <MetricCard label="Avg completeness" value={`${result.data.summary.averageCompleteness}%`} icon={<Filter className="h-5 w-5 text-primary" />} />
            </div>

            <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2 lg:grid-cols-6">
              <label className="space-y-1 lg:col-span-2">
                <span className="text-sm font-medium">Search</span>
                <span className="flex items-center gap-2 rounded-md border bg-background px-3">
                  <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <input
                    name="q"
                    defaultValue={typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : ""}
                    className="min-h-10 flex-1 bg-transparent text-sm outline-none"
                    placeholder="College name or slug"
                  />
                </span>
              </label>
              <FilterSelect name="state" label="State" value={filters.state ?? "all"} options={stateOptions} />
              <FilterSelect name="category" label="Missing category" value={filters.category ?? "all"} options={categoryOptions} />
              <FilterSelect name="publication" label="Publication" value={filters.publication ?? "all"} options={["all", "published", "draft"]} />
              <FilterSelect name="conflicts" label="Conflicts" value={filters.conflicts ?? "all"} options={["all", "open"]} />
              <div className="flex items-end gap-2 lg:col-span-6">
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input name="missingSources" value="yes" type="checkbox" defaultChecked={filters.missingSources === "yes"} />
                  Missing sources only
                </label>
                <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Apply filters
                </button>
                <Link href={"/admin/data-readiness" as Route} className="rounded-md border px-4 py-2 text-sm font-medium">
                  Reset
                </Link>
              </div>
            </form>

            {result.data.assessments.length === 0 ? (
              <EmptyState
                title="No colleges match these filters"
                message="Try clearing filters, or import official sources into staging and review them before checking readiness again."
              />
            ) : (
              <ReadinessTable assessments={result.data.assessments} />
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}

function MetricCard({ label, value, icon }: Readonly<{ label: string; value: string | number; icon: React.ReactNode }>) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function FilterSelect({ name, label, value, options }: Readonly<{ name: string; label: string; value: string; options: string[] }>) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <select name={name} defaultValue={value} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadinessTable({ assessments }: Readonly<{ assessments: ReadinessAssessment[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[1120px] text-left text-sm">
        <thead className="border-b bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">College</th>
            <th className="px-4 py-3 font-medium">State</th>
            <th className="px-4 py-3 font-medium">Complete</th>
            <th className="px-4 py-3 font-medium">Branches</th>
            <th className="px-4 py-3 font-medium">Cutoff years</th>
            <th className="px-4 py-3 font-medium">Fees</th>
            <th className="px-4 py-3 font-medium">Placements</th>
            <th className="px-4 py-3 font-medium">Staged</th>
            <th className="px-4 py-3 font-medium">Conflicts</th>
            <th className="px-4 py-3 font-medium">Next action</th>
            <th className="px-4 py-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {assessments.map((assessment) => {
            const nextAction = assessment.checklist.find((item) => item.status !== "complete");
            return (
              <tr key={assessment.collegeId} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{assessment.collegeName}</p>
                  <p className="text-xs text-muted-foreground">{assessment.collegeSlug ?? assessment.collegeId}</p>
                </td>
                <td className="px-4 py-3">{readinessStateLabels[assessment.state]}</td>
                <td className="px-4 py-3">{assessment.completenessPercentage}%</td>
                <td className="px-4 py-3">{assessment.counts.branches.published}</td>
                <td className="px-4 py-3">{assessment.coverage.cutoffYears.join(", ") || "None"}</td>
                <td className="px-4 py-3">{assessment.latestFeeYear ?? "Missing"}</td>
                <td className="px-4 py-3">{assessment.latestPlacementYear ?? "Missing"}</td>
                <td className="px-4 py-3">{assessment.counts.staging.staged}</td>
                <td className="px-4 py-3">{assessment.counts.staging.conflicts}</td>
                <td className="px-4 py-3">{nextAction?.action ?? "No action needed."}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/data-readiness/${assessment.collegeId}` as Route} className="text-primary underline-offset-4 hover:underline">
                    Open
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function buildExportQuery(searchParams: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === "string" && key !== "format") {
      query.set(key, value);
    }
  });
  const text = query.toString();
  return text ? `&${text}` : "";
}

function formatOption(option: string) {
  if (option === "all") {
    return "All";
  }
  return readinessStateLabels[option as keyof typeof readinessStateLabels] ?? readinessCategoryLabels[option as keyof typeof readinessCategoryLabels] ?? option;
}
