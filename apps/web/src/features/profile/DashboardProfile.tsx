"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Pencil } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { loadGuestProfile } from "@/features/profile/profileStorage";
import { ProfileSummary } from "@/features/profile/ProfileSummary";
import { recommendationViewModelSchema, type RecommendationViewModel } from "@/features/recommendations/recommendationTypes";
import { DashboardCounsellorChat } from "@/features/counsellor/DashboardCounsellorChat";
import type { SavedStudentProfile } from "./profileSchema";

const recommendationListSchema = recommendationViewModelSchema.array();

export function DashboardProfile() {
  const [profile, setProfile] = useState<SavedStudentProfile | null | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<RecommendationViewModel[] | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    setProfile(loadGuestProfile());
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let active = true;
    setLoadingRecommendations(true);
    setRecommendationError(null);

    fetch("/api/recommendations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ profile })
    })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error("Unable to load recommendations right now.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) {
          return;
        }
        const parsed = recommendationListSchema.safeParse(
          typeof payload === "object" && payload && "data" in payload ? payload.data : null
        );
        if (!parsed.success) {
          throw new Error("Recommendation data did not match the expected format.");
        }
        setRecommendations(parsed.data);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setRecommendationError(error instanceof Error ? error.message : "Unable to load recommendations right now.");
      })
      .finally(() => {
        if (active) {
          setLoadingRecommendations(false);
        }
      });

    return () => {
      active = false;
    };
  }, [profile]);

  if (profile === undefined) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        Loading saved profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <EmptyState
        title="No saved profile yet"
        message="Complete the student profile first so AdmitWise can use your exam and preference details for recommendations, comparison, scholarships and reports."
        action={
          <Link href="/profile" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Start profile
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/profile" className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit Profile
          </Link>
          <Link href="/colleges" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Explore Colleges
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ProfileSummary profile={profile} />
        <RecommendationSection
          recommendations={recommendations}
          loading={loadingRecommendations}
          error={recommendationError}
        />
      </div>
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <DashboardCounsellorChat profile={profile} recommendations={recommendations ?? []} />
        </div>
      </div>
    </div>
  );
}

function RecommendationSection({
  recommendations,
  loading,
  error
}: {
  recommendations: RecommendationViewModel[] | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        Checking published cutoff data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-card p-5 text-sm text-muted-foreground shadow-sm">
        {error}
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        message="No published cutoff records match this profile yet. Add verified and published cutoff data in Supabase to generate deterministic recommendations."
      />
    );
  }

  const groupedArray = Object.values(
    recommendations.reduce((acc, rec) => {
      if (!acc[rec.collegeId]) {
        acc[rec.collegeId] = {
          collegeId: rec.collegeId,
          collegeName: rec.collegeName,
          collegeSlug: rec.collegeSlug,
          overallFit: 0,
          classification: "UNKNOWN" as RecommendationViewModel["classification"],
          recommendations: [] as RecommendationViewModel[]
        };
      }
      acc[rec.collegeId].recommendations.push(rec);
      return acc;
    }, {} as Record<string, {
      collegeId: string;
      collegeName: string;
      collegeSlug: string;
      overallFit: number;
      classification: RecommendationViewModel["classification"];
      recommendations: RecommendationViewModel[];
    }>)
  )
    .map(group => {
      group.recommendations.sort((a, b) => b.overallScore - a.overallScore);
      group.overallFit = group.recommendations[0].overallScore;
      group.classification = group.recommendations[0].classification;
      return group;
    })
    .sort((a, b) => b.overallFit - a.overallFit);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Deterministic recommendations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Based only on published colleges, published branches and published cutoff records.
        </p>
      </div>
      <div className="grid gap-4">
        {groupedArray.map(group => {
          // Group by branch name
          const branchesMap = group.recommendations.reduce((acc, rec) => {
            if (!acc[rec.branchName]) {
              acc[rec.branchName] = [];
            }
            acc[rec.branchName].push(rec);
            return acc;
          }, {} as Record<string, RecommendationViewModel[]>);

          return (
            <details key={group.collegeId} className="group rounded-lg border bg-card p-5 shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 list-none">
                <div className="flex items-center gap-3">
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-90" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-positive">{group.classification}</p>
                    <h3 className="mt-1 text-lg font-semibold">{group.collegeName}</h3>
                    <p className="text-sm text-muted-foreground">{group.recommendations.length} recommended branch/rounds</p>
                  </div>
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-right">
                  <p className="text-xs text-muted-foreground">Best fit</p>
                  <p className="text-lg font-semibold">{group.overallFit}/100</p>
                </div>
              </summary>

              <div className="mt-5 space-y-6 pt-5 border-t">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-md">Branch Cutoffs</h4>
                  <Link href={`/colleges/${group.collegeSlug}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                    View College Details <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(branchesMap).map(([branchName, recs]) => {
                    // Extract unique years and rounds for this branch
                    const years = Array.from(new Set(recs.map(r => r.cutoff.admissionYear))).sort((a, b) => a - b);
                    // Extract rounds by treating them as numbers if possible for correct sorting
                    const rounds = Array.from(new Set(recs.map(r => String(r.cutoff.round)))).sort((a, b) => {
                      const numA = parseInt(a.replace(/\D/g, ''), 10);
                      const numB = parseInt(b.replace(/\D/g, ''), 10);
                      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                      return a.localeCompare(b);
                    });

                    // Build a matrix mapping [round][year] to cutoff closing rank
                    const matrix: Record<string, Record<string, number | string>> = {};
                    rounds.forEach(round => {
                      matrix[round as string] = {};
                      years.forEach(year => {
                        const rec = recs.find(r => r.cutoff.admissionYear === year && String(r.cutoff.round) === round);
                        matrix[round as string][String(year)] = rec ? rec.cutoff.closingRank : '-';

                      });
                    });

                    return (
                      <div key={branchName} className="rounded-md border bg-muted/10 overflow-hidden">
                        <div className="bg-muted/50 px-4 py-3 border-b">
                          <p className="font-medium text-foreground">{branchName}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/20 text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2 font-medium whitespace-nowrap">Round</th>
                                {years.map(year => (
                                  <th key={year} className="px-4 py-2 font-medium text-right">{year}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {rounds.map(round => (
                                <tr key={round} className="hover:bg-muted/30">
                                  <td className="px-4 py-2 font-medium whitespace-nowrap">Round {round}</td>
                                  {years.map(year => {
                                    const val = matrix[round][year];
                                    return (
                                      <td key={year} className="px-4 py-2 text-right tabular-nums whitespace-nowrap">
                                        {typeof val === 'number' ? val.toLocaleString("en-IN") : val}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}


