import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { listPublishedColleges } from "@/features/colleges/collegeQueries";
import { ScholarshipsClient } from "@/features/scholarships/ScholarshipsClient";

export const dynamic = "force-dynamic";

export default async function ScholarshipsPage() {
  const colleges = await listPublishedColleges({});

  return (
    <PageContainer>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Scholarships"
          title="Find potential scholarship matches"
          description="Eligibility language is deterministic and cautious. A match never guarantees that a scholarship will be awarded."
        />
        {!colleges.success ? (
          <ErrorState title="Could not load colleges" message={colleges.message} />
        ) : (
          <ScholarshipsClient colleges={colleges.data} />
        )}
      </div>
    </PageContainer>
  );
}
