import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listAllColleges } from "@/features/admin/adminCollegeService";
import { CollegeListClient } from "./CollegeListClient";

export const dynamic = "force-dynamic";

export default async function AdminCollegesPage() {
  const result = await listAllColleges();

  return (
    <PageContainer>
      <div className="space-y-6">
        <SectionHeader
          eyebrow="Admin"
          title="Manage colleges"
          description="View and edit all college records. Click a college to open the editor."
        />

        {!result.success ? (
          <ErrorState title="Unable to load colleges" message={result.message} />
        ) : result.data.length === 0 ? (
          <EmptyState title="No colleges" message="Colleges will appear here once added through the staging pipeline or seed data." />
        ) : (
          <CollegeListClient colleges={result.data} />
        )}
      </div>
    </PageContainer>
  );
}
