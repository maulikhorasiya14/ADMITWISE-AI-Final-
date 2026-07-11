import { ExternalLink, Printer } from "lucide-react";
import { summarizeProfile } from "./reportCore";
import type { ReportSnapshot } from "./reportTypes";

type ReportViewerProps = {
  report: ReportSnapshot;
  showPrintButton?: boolean;
};

export function ReportViewer({ report, showPrintButton = false }: ReportViewerProps) {
  return (
    <article className="print-page space-y-6 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Decision-support report</p>
          <h1 className="text-2xl font-semibold">{report.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {new Date(report.generatedAt).toLocaleString("en-IN")} · Version {report.schemaVersion}
          </p>
        </div>
        {showPrintButton ? (
          <button
            type="button"
            onClick={() => window.print()}
            className="print-hidden inline-flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Print
          </button>
        ) : null}
      </div>

      {report.includedSections.profile ? (
        <ReportSection title="Student profile">
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {summarizeProfile(report.profile).map((item) => (
              <li key={String(item)} className="rounded-md bg-muted px-3 py-2">{item}</li>
            ))}
            <li className="rounded-md bg-muted px-3 py-2">Branches: {report.profile.preferredBranches.join(", ")}</li>
            <li className="rounded-md bg-muted px-3 py-2">Budget: {formatCurrency(report.profile.maximumAnnualBudget)} per year</li>
          </ul>
        </ReportSection>
      ) : null}

      {report.includedSections.recommendations ? (
        <ReportSection title="Recommendations">
          {report.recommendations.length ? (
            <div className="space-y-3">
              {report.recommendations.map((recommendation) => (
                <div key={recommendation.cutoffId} className="print-avoid-break rounded-lg border p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">{recommendation.collegeName}</h3>
                      <p className="text-sm text-muted-foreground">{recommendation.branchName}</p>
                    </div>
                    <span className="rounded-md bg-muted px-3 py-1 text-sm font-medium">{recommendation.classification}</span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <Info label="Overall fit" value={`${Math.round(recommendation.overallScore)} / 100`} />
                    <Info label="Closing rank" value={recommendation.cutoff.closingRank.toLocaleString("en-IN")} />
                    <Info label="Cutoff source" value={recommendation.cutoff.sourceId} />
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <MutedText>No published verified cutoff data is available for this profile yet.</MutedText>
          )}
        </ReportSection>
      ) : null}

      {report.includedSections.comparison ? (
        <ReportSection title="Two-college comparison">
          {report.comparison ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Mode: {report.comparison.mode}. Winner: {winnerLabel(report.comparison.winner)}.</p>
              <div className="grid gap-3 md:grid-cols-2">
                {report.comparison.options.map((option) => (
                  <div key={option.optionId} className="print-avoid-break rounded-lg border p-4">
                    <h3 className="font-semibold">{option.collegeName}</h3>
                    <p className="text-sm text-muted-foreground">{option.branchName}</p>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <Info label="Admission" value={option.admissionClassification ?? "Data not publicly available"} />
                      <Info label="Four-year cost" value={formatCurrency(option.fourYearCost)} />
                      <Info label="Placement percentage" value={option.placementPercentage === null ? "Data not publicly available" : `${option.placementPercentage}%`} />
                      <Info label="Median package" value={formatPackage(option.medianPackage)} />
                      <Info label="ROI score" value={formatScore(option.roiScore)} />
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <MutedText>No two-college comparison was included in this report.</MutedText>
          )}
        </ReportSection>
      ) : null}

      {report.includedSections.costs ? (
        <ReportSection title="Costs and ROI">
          {report.comparison ? (
            <div className="grid gap-3 md:grid-cols-2">
              {report.comparison.options.map((option) => (
                <div key={`${option.optionId}-roi`} className="rounded-lg border p-4 text-sm">
                  <h3 className="font-semibold">{option.collegeName}</h3>
                  <Info label="Estimated effective cost" value={formatCurrency(option.effectiveCost)} />
                  <Info label="Affordability score" value={formatScore(option.affordabilityScore)} />
                  <Info label="Placement score" value={formatScore(option.placementScore)} />
                  <Info label="Data confidence" value={`${Math.round(option.dataConfidenceScore)} / 100`} />
                </div>
              ))}
            </div>
          ) : (
            <MutedText>Cost and ROI summary appears when a two-college comparison is included.</MutedText>
          )}
        </ReportSection>
      ) : null}

      {report.includedSections.scholarships ? (
        <ReportSection title="Scholarships">
          {report.scholarships.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {report.scholarships.map((scholarship) => (
                <div key={scholarship.scholarshipId} className="print-avoid-break rounded-lg border p-4 text-sm">
                  <p className="font-semibold">{scholarship.name}</p>
                  <p className="text-muted-foreground">{scholarship.provider}</p>
                  <Info label="Eligibility status" value={scholarshipStatusLabel(scholarship.status)} />
                  <Info label="Possible benefit" value={scholarship.possibleBenefitAmount === null ? scholarship.possibleBenefitDescription : formatCurrency(scholarship.possibleBenefitAmount)} />
                  <Info label="Estimated effective cost" value={formatCurrency(scholarship.estimatedEffectiveCost)} />
                  <Info label="Deadline" value={scholarship.applicationDeadline ?? "Data not publicly available"} />
                  {scholarship.officialUrl ? (
                    <a href={scholarship.officialUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-primary">
                      Official source <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <MutedText>No published scholarship matches are available for this profile yet.</MutedText>
          )}
        </ReportSection>
      ) : null}

      {report.includedSections.counsellor ? (
        <ReportSection title="Counsellor summary">
          {report.counsellor ? (
            <div className="rounded-lg border p-4">
              <p className="text-sm leading-6">{report.counsellor.answer}</p>
              <p className="mt-3 text-xs text-muted-foreground">Grounded evidence IDs: {report.counsellor.evidenceIds.join(", ")}</p>
            </div>
          ) : (
            <MutedText>No grounded counsellor summary was included.</MutedText>
          )}
        </ReportSection>
      ) : null}

      <ReportSection title="Missing data and cautions">
        {report.missingDataWarnings.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {report.missingDataWarnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        ) : (
          <MutedText>No additional missing-data warnings were recorded.</MutedText>
        )}
      </ReportSection>

      {report.includedSections.evidence ? (
        <ReportSection title="Evidence">
          {report.evidence.length ? (
            <ul className="space-y-2 text-sm">
              {report.evidence.map((item) => (
                <li key={item.id} className="break-words rounded-md bg-muted px-3 py-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground"> · {item.sourceType ?? "source"} · {item.academicYear ?? "year unavailable"} · {item.confidenceLevel ?? "confidence unavailable"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <MutedText>No source references were available.</MutedText>
          )}
        </ReportSection>
      ) : null}

      <section className="border-t pt-4 text-xs leading-5 text-muted-foreground">
        <h2 className="font-semibold text-foreground">Disclaimer</h2>
        <p className="mt-1">{report.disclaimer}</p>
      </section>
    </article>
  );
}

function ReportSection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="print-avoid-break space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function MutedText({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function formatCurrency(value: number | null | undefined) {
  return value === null || value === undefined ? "Data not publicly available" : `INR ${value.toLocaleString("en-IN")}`;
}

function formatPackage(value: number | null) {
  return value === null ? "Data not publicly available" : `${value.toLocaleString("en-IN")} LPA`;
}

function formatScore(value: number | null) {
  return value === null ? "Data not publicly available" : `${Math.round(value)} / 100`;
}

function winnerLabel(value: string) {
  if (value === "left") return "Option A";
  if (value === "right") return "Option B";
  if (value === "tie") return "Tie";
  return "Insufficient data";
}

function scholarshipStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}
