"use client";

import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";

export default function CollegesError({ reset }: { reset: () => void }) {
  return (
    <PageContainer>
      <ErrorState title="Could not load colleges" message="Refresh the explorer and try again." onRetry={reset} />
    </PageContainer>
  );
}
