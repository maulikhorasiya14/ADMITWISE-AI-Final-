import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { ErrorState } from "@/components/ErrorState";
import { SectionHeader } from "@/components/SectionHeader";
import { getPublishedCollegeBySlug } from "@/features/colleges/collegeQueries";
import { 
  getCollegeClubs, 
  getCampusReality, 
  getCollegeFacilities,
  getCollegeLocationDetails,
  getStudentExperienceSources
} from "@/features/colleges/collegeQualitativeQueries";

import { CampusRealitySection } from "@/features/colleges/components/CampusRealitySection";
import { ClubsSection } from "@/features/colleges/components/ClubsSection";
import { FacilitiesSection } from "@/features/colleges/components/FacilitiesSection";
import { LocationDetailsSection } from "@/features/colleges/components/LocationDetailsSection";
import { StudentExperienceSection } from "@/features/colleges/components/StudentExperienceSection";

export const dynamic = "force-dynamic";

type CampusRealityPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CampusRealityPage({ params }: CampusRealityPageProps) {
  const { slug } = await params;

  const result = await getPublishedCollegeBySlug(slug);
  
  if (!result.success) {
    return (
      <PageContainer>
        <ErrorState title="Could not load college" message={result.message} />
      </PageContainer>
    );
  }

  if (!result.data.college) {
    notFound();
  }

  const college = result.data.college;

  const [
    clubs, 
    campusReality, 
    facilities, 
    location, 
    sources
  ] = await Promise.all([
    getCollegeClubs(college.id),
    getCampusReality(college.id),
    getCollegeFacilities(college.id),
    getCollegeLocationDetails(college.id),
    getStudentExperienceSources(college.id)
  ]);

  return (
    <PageContainer>
      <div className="space-y-8">
        <Link href={`/colleges/${college.slug}`} className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to {college.name}
        </Link>
        
        <SectionHeader
          eyebrow="Campus Reality"
          title={`${college.short_name || college.name} Campus Life`}
          description="Qualitative insights, facilities, clubs, and student experiences."
        />

        <CampusRealitySection campusReality={campusReality} />
        
        <FacilitiesSection facilities={facilities} />
        
        <ClubsSection clubs={clubs} />
        
        <LocationDetailsSection location={location} />
        
        <StudentExperienceSection sources={sources} />
      </div>
    </PageContainer>
  );
}
