import { LoadingCard } from "@/components/LoadingCard";
import { PageContainer } from "@/components/PageContainer";

export default function DataReadinessLoading() {
  return (
    <PageContainer>
      <LoadingCard title="Loading data readiness..." />
    </PageContainer>
  );
}
