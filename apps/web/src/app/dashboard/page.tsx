import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { DashboardProfile } from "@/features/profile/DashboardProfile";

export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Dashboard"
          title="Your profile summary"
          description="Review the saved guest profile and continue to the published college explorer."
        />
        <DashboardProfile />
      </div>
    </PageContainer>
  );
}
