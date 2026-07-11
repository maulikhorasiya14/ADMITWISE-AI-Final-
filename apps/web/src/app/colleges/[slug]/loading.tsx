import { LoadingCard } from "@/components/LoadingCard";
import { PageContainer } from "@/components/PageContainer";

export default function CollegeDetailLoading() {
  return (
    <PageContainer>
      <div className="space-y-4">
        <LoadingCard />
        <LoadingCard />
      </div>
    </PageContainer>
  );
}
