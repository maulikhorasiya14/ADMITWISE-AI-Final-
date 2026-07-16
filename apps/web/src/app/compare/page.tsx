import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { CompareClient } from "@/features/comparison/CompareClient";
import { CompareFormClient } from "@/features/comparison/CompareFormClient";
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
            <CompareFormClient
              options={optionsResult.data}
              initialOptionA={params.optionA}
              initialOptionB={params.optionB}
              initialMode={mode}
              initialShowDifferencesOnly={showDifferencesOnly}
            />
            <CompareClient optionIds={selectedOptionIds} mode={mode} showDifferencesOnly={showDifferencesOnly} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
