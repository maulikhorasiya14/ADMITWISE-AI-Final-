import { redirect } from "next/navigation";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listPublishedComparisonOptions } from "@/features/comparison/comparisonService";
import { ReportPreviewClient } from "@/features/reports/ReportPreviewClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/auth/sign-in?next=/reports/new");
  }

  const comparisonOptions = await listPublishedComparisonOptions();

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Reports"
          title="Generate a decision-support report"
          description="Preview the report, review missing-data warnings and save a fixed snapshot for later viewing or printing."
        />
        <ReportPreviewClient comparisonOptions={comparisonOptions.success ? comparisonOptions.data : []} />
      </div>
    </PageContainer>
  );
}
