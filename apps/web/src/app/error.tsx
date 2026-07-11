"use client";

import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageContainer>
      <ErrorState title="Something went wrong" message="Please try loading this page again." onRetry={reset} />
    </PageContainer>
  );
}
