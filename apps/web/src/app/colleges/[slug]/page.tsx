import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { ErrorState } from "@/components/ErrorState";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { getPublishedCollegeBySlug } from "@/features/colleges/collegeQueries";
import { calculateTotalFourYearCost, scorePlacement, scoreRoi, selectPlacementPackage } from "@admitwise/scoring";
import type { FeeRecord, PlacementRecord } from "@/features/comparison/comparisonTypes";
import { listPublishedScholarshipsForCollege } from "@/features/scholarships/scholarshipService";
import type { ScholarshipRecord } from "@/features/scholarships/scholarshipTypes";

export const dynamic = "force-dynamic";

type CollegeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CollegeDetailPage({ params }: CollegeDetailPageProps) {
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

  const { college, branches, fees, placements } = result.data;
  const scholarships = await listPublishedScholarshipsForCollege(college.id);
  const latestFee = fees[0] ?? null;
  const latestPlacement = placements[0] ?? null;
  const totalCost = latestFee ? calculateTotalFourYearCost({
    tuitionFee: latestFee.tuition_fee,
    hostelFee: latestFee.hostel_fee,
    messFee: latestFee.mess_fee,
    admissionFee: latestFee.admission_fee,
    refundableDeposit: latestFee.refundable_deposit,
    otherCompulsoryFees: latestFee.other_compulsory_fees,
    estimatedFourYearCost: latestFee.estimated_four_year_cost
  }) : null;
  const placementScore = latestPlacement ? scorePlacement({
    placementPercentage: latestPlacement.placement_percentage,
    medianPackage: latestPlacement.median_package,
    averagePackage: latestPlacement.average_package
  }) : null;
  const roiScore = latestPlacement && totalCost ? scoreRoi({
    fourYearCost: totalCost.score,
    medianPackage: latestPlacement.median_package,
    averagePackage: latestPlacement.average_package
  }) : null;

  return (
    <PageContainer>
      <div className="space-y-8">
        <Link href="/colleges" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to colleges
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <SectionHeader
            eyebrow={college.ownership}
            title={college.name}
            description={[college.city, college.state].filter(Boolean).join(", ")}
          />
          <Link
            href={`/colleges/${college.slug}/campus-reality` as any}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap"
          >
            Explore Campus Reality
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Short name" value={college.short_name} />
          <DetailItem label="Institute type" value={college.institute_type} />
          <DetailItem label="Established" value={college.established_year?.toString() ?? null} />
          <DetailItem label="Address" value={[college.address, college.pincode].filter(Boolean).join(", ") || null} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <FeesSection fee={latestFee} totalCost={totalCost?.score ?? null} />
          <PlacementsSection placement={latestPlacement} placementScore={placementScore?.score ?? null} />
          <RoiSection roiScore={roiScore?.score ?? null} />
        </section>

        <ScholarshipsSection scholarships={scholarships.success ? scholarships.data : []} />

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Branches</h2>
          {branches.length === 0 ? (
            <Unavailable />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {branches.map((branch) => (
                <article key={branch.id} className="rounded-lg border bg-card p-5">
                  <h3 className="font-semibold">{branch.name}</h3>
                  <dl className="mt-3 grid gap-2 text-sm">
                    <DetailRow label="Degree" value={branch.degree} />
                    <DetailRow label="Duration" value={branch.duration_years ? `${branch.duration_years} years` : null} />
                    <DetailRow label="Intake" value={branch.intake?.toString() ?? null} />
                    <DetailRow label="Academic year" value={branch.academic_year} />
                    <DetailRow label="Confidence" value={branch.confidence_level} />
                  </dl>
                  {branch.sources ? (
                    <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                      <p className="font-medium">{branch.sources.title}</p>
                      <p className="mt-1 text-muted-foreground">
                        {[branch.sources.source_type, branch.sources.academic_year, branch.sources.confidence_level].filter(Boolean).join(" / ")}
                      </p>
                      {branch.sources.source_url ? (
                        <a href={branch.sources.source_url} className="mt-2 inline-flex items-center gap-1 text-primary" target="_blank" rel="noreferrer">
                          Source
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <MissingDataSections />
      </div>
    </PageContainer>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value || "Data not publicly available"}</dd>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "Data not publicly available"}</dd>
    </div>
  );
}

function Unavailable() {
  return <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Data not publicly available</p>;
}

function MissingDataSections() {
  const sections = ["Cutoffs", "Campus reality", "Location"];

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Additional data</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section} className="rounded-lg border bg-card p-4">
            <h3 className="font-medium">{section}</h3>
            <p className="mt-2 text-sm text-muted-foreground">Data not publicly available</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScholarshipsSection({ scholarships }: { scholarships: Array<{ scholarship: ScholarshipRecord; link: { availability_notes: string | null } }> }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Scholarships</h2>
      {scholarships.length === 0 ? (
        <Unavailable />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scholarships.map(({ scholarship, link }) => (
            <article key={scholarship.id} className="rounded-lg border bg-card p-5">
              <h3 className="font-semibold">{scholarship.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{scholarship.provider}</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <DetailRow label="Benefit" value={scholarship.benefit_amount === null ? scholarship.benefit_description : `INR ${scholarship.benefit_amount.toLocaleString("en-IN")}`} />
                <DetailRow label="Deadline" value={scholarship.application_deadline} />
                <DetailRow label="Availability" value={link.availability_notes} />
                <DetailRow label="Source" value={sourceLabel(scholarship.sources)} />
              </dl>
              {scholarship.official_url ? (
                <a href={scholarship.official_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-medium text-primary">
                  Official source
                </a>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FeesSection({ fee, totalCost }: { fee: FeeRecord | null; totalCost: number | null }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-xl font-semibold">Fees</h2>
      {!fee ? (
        <p className="mt-3 text-sm text-muted-foreground">Data not publicly available</p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm">
          <DetailRow label="Academic year" value={fee.academic_year} />
          <DetailRow label="Tuition fee" value={money(fee.tuition_fee)} />
          <DetailRow label="Hostel fee" value={money(fee.hostel_fee)} />
          <DetailRow label="Mess fee" value={money(fee.mess_fee)} />
          <DetailRow label="Four-year cost" value={money(totalCost)} />
          <DetailRow label="Source" value={sourceLabel(fee.sources)} />
        </dl>
      )}
    </section>
  );
}

function PlacementsSection({ placement, placementScore }: { placement: PlacementRecord | null; placementScore: number | null }) {
  const selectedPackage = placement ? selectPlacementPackage({
    medianPackage: placement.median_package,
    averagePackage: placement.average_package
  }) : null;

  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-xl font-semibold">Placements</h2>
      {!placement ? (
        <p className="mt-3 text-sm text-muted-foreground">Data not publicly available</p>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm">
          <DetailRow label="Placement year" value={placement.placement_year} />
          <DetailRow label="Placement percentage" value={placement.placement_percentage === null ? null : `${placement.placement_percentage}%`} />
          <DetailRow label="Median package" value={packageLabel(placement.median_package)} />
          <DetailRow label="Average package" value={packageLabel(placement.average_package)} />
          <DetailRow label="Preferred package basis" value={selectedPackage?.source ?? null} />
          <DetailRow label="Placement score" value={placementScore === null ? null : `${placementScore}/100`} />
          <DetailRow label="Source" value={sourceLabel(placement.sources)} />
        </dl>
      )}
    </section>
  );
}

function RoiSection({ roiScore }: { roiScore: number | null }) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="text-xl font-semibold">ROI summary</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {roiScore === null ? "Data not publicly available" : `ROI score: ${roiScore}/100`}
      </p>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        ROI uses verified cost and median package where available. It does not imply guaranteed placement or salary.
      </p>
    </section>
  );
}

function money(value: number | null) {
  return value === null ? null : `INR ${value.toLocaleString("en-IN")}`;
}

function packageLabel(value: number | null) {
  return value === null ? null : `${value} LPA`;
}

function sourceLabel(source: FeeRecord["sources"] | PlacementRecord["sources"] | ScholarshipRecord["sources"]) {
  return source ? [source.title, source.academic_year, source.confidence_level].filter(Boolean).join(" / ") : null;
}
