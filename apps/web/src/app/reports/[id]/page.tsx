import { notFound, redirect } from "next/navigation";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { ReportViewer } from "@/features/reports/ReportViewer";
import { getSavedReport } from "@/features/reports/reportService";

export const dynamic = "force-dynamic";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const result = await getSavedReport(id);

  if (!result.success && result.status === 401) {
    redirect(`/auth/sign-in?next=/reports/${id}`);
  }

  if (!result.success && result.status === 404) {
    notFound();
  }

  return (
    <PageContainer>
      {result.success ? (
        <ReportViewer report={result.data.snapshot} showPrintButton />
      ) : (
        <ErrorState title="Report unavailable" message={result.message} />
      )}
    </PageContainer>
  );
}
