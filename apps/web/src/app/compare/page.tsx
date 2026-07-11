import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { CompareClient } from "@/features/comparison/CompareClient";
import { listPublishedComparisonOptions } from "@/features/comparison/comparisonService";
import { comparisonModeSchema, type ComparisonMode } from "@/features/comparison/comparisonTypes";

export const dynamic = "force-dynamic";

type ComparePageProps = {
  searchParams: Promise<{
    optionA?: string;
    optionB?: string;
    mode?: ComparisonMode;
    differences?: string;
  }>;
};

const modes: Array<{ value: ComparisonMode; label: string }> = [
  { value: "student", label: "Student Mode" },
  { value: "parent", label: "Parent Mode" }
];

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;
  const mode = comparisonModeSchema.safeParse(params.mode).success ? params.mode ?? "student" : "student";
  const showDifferencesOnly = params.differences === "1";
  const selectedOptionIds = [params.optionA, params.optionB].filter((value): value is string => Boolean(value));
  const optionsResult = await listPublishedComparisonOptions();

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Comparison"
          title="Compare exactly two college-branch options"
          description="Uses only published colleges, published branches and verified published fee, placement and cutoff records."
        />

        {!optionsResult.success ? (
          <ErrorState title="Could not load comparison options" message={optionsResult.message} />
        ) : optionsResult.data.length < 2 ? (
          <EmptyState
            title="Not enough published options"
            message="At least two published college-branch options are required before comparison can run."
          />
        ) : (
          <>
            <form className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-2">
              <label>
                <span className="text-sm font-medium">College and branch A</span>
                <select name="optionA" defaultValue={params.optionA ?? ""} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select option A</option>
                  {optionsResult.data.map((option) => (
                    <option key={option.optionId} value={option.optionId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-medium">College and branch B</span>
                <select name="optionB" defaultValue={params.optionB ?? ""} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="">Select option B</option>
                  {optionsResult.data.map((option) => (
                    <option key={option.optionId} value={option.optionId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-sm font-medium">Mode</span>
                <select name="mode" defaultValue={mode} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  {modes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-end gap-2 text-sm">
                <input type="checkbox" name="differences" value="1" defaultChecked={showDifferencesOnly} className="mb-3 h-4 w-4" />
                <span className="mb-2">Show differences only</span>
              </label>
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground md:col-span-2">
                Compare
              </button>
            </form>
            <CompareClient optionIds={selectedOptionIds} mode={mode} showDifferencesOnly={showDifferencesOnly} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
