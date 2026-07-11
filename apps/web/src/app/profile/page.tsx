import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ProfileWizard } from "@/features/profile/ProfileWizard";

export default function ProfilePage() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Student profile"
          title="Build your admission preference profile"
          description="This prototype saves guest profiles in this browser only, then opens the dashboard summary."
        />
        <ProfileWizard />
      </div>
    </PageContainer>
  );
}
