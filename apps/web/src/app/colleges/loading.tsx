import { LoadingCard } from "@/components/LoadingCard";
import { PageContainer } from "@/components/PageContainer";

export default function CollegesLoading() {
  return (
    <PageContainer>
      <div className="space-y-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    </PageContainer>
  );
}
