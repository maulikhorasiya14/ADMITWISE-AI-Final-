import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { getCollegeEmptyStateMessage, type OwnershipFilter } from "@/features/colleges/collegeFilters";
import { listPublishedColleges } from "@/features/colleges/collegeQueries";

export const dynamic = "force-dynamic";

type CollegesPageProps = {
  searchParams: Promise<{
    q?: string;
    ownership?: OwnershipFilter;
  }>;
};

const ownershipOptions: Array<{ label: string; value: OwnershipFilter }> = [
  { label: "All ownership", value: "ALL" },
  { label: "Government", value: "GOVERNMENT" },
  { label: "Private", value: "PRIVATE" },
  { label: "Deemed", value: "DEEMED" },
  { label: "Other", value: "OTHER" }
];

export default async function CollegesPage({ searchParams }: CollegesPageProps) {
  const params = await searchParams;
  const search = params.q ?? "";
  const ownership = ownershipOptions.some((option) => option.value === params.ownership)
    ? params.ownership ?? "ALL"
    : "ALL";
  const result = await listPublishedColleges({ search, ownership });

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="College explorer"
          title="Explore published colleges"
          description="Only verified published college records are shown here. Draft records stay hidden from student-facing pages."
        />

        <form className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
          <label className="block">
            <span className="text-sm font-medium">Search by name</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Search published colleges"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Ownership</span>
            <select
              name="ownership"
              defaultValue={ownership}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {ownershipOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:self-end">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
        </form>

        {!result.success ? (
          <ErrorState title="Could not load colleges" message={result.message} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No published colleges found" message={getCollegeEmptyStateMessage(search, ownership)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.data.map((college) => (
              <article key={college.id} className="rounded-lg border bg-card p-5 shadow-sm">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-positive">{college.ownership}</p>
                  <h2 className="text-lg font-semibold text-foreground">{college.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[college.city, college.state].filter(Boolean).join(", ")}
                  </p>
                </div>
                <Link href={`/colleges/${college.slug}` as Route} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary">
                  View details
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
