import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { SignInForm } from "@/features/auth/SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Account access"
          title="Sign in to AdmitWise"
          description="Use a Supabase email and password account to continue to protected AdmitWise pages."
        />
        <SignInForm />
      </div>
    </PageContainer>
  );
}
