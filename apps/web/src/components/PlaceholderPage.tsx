import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { AdmissionChanceBadge } from "@/components/AdmissionChanceBadge";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <PageContainer>
      <div className="space-y-6">
        <SectionHeader eyebrow="Milestone 1 route" title={title} description={description} />
        <div className="flex flex-wrap gap-2">
          <AdmissionChanceBadge classification="SAFE" />
          <AdmissionChanceBadge classification="SMART" />
          <AdmissionChanceBadge classification="AMBITIOUS" />
        </div>
        <EmptyState
          title="Ready for implementation"
          message="This scaffold intentionally avoids fake production data and full product logic."
        />
      </div>
    </PageContainer>
  );
}
