import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { PageContainer } from "@/components/PageContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { SourceBadge } from "@/components/SourceBadge";

export default function HomePage() {
  return (
    <PageContainer>
      <section className="grid gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Private beta"
            title="Evidence-first engineering admission decisions"
            description="AdmitWise AI combines published cutoffs, deterministic fit scoring, scholarships, costs and grounded explanations without fabricating numbers."
          />
          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-95"
            >
              Start profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/colleges"
              className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Explore published colleges
            </Link>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Trust model</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Every factual record carries source type, academic year, verification status and confidence.
            Student-facing pages show only published data.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <SourceBadge sourceType="government" />
            <ConfidenceBadge level="A" />
          </div>
        </div>
      </section>
    </PageContainer>
  );
}
